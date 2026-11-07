import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { expectedDeliveryDate } from "@/lib/delivery";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { manualOrderSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 401 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid order details." }, { status: 400 });
  }
  const parsed = manualOrderSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Check the customer, delivery, source, and product details." }, { status: 400 });
  if (new Set(parsed.data.items.map((item) => item.variantId)).size !== parsed.data.items.length) {
    return NextResponse.json({ error: "Remove duplicate product packages from this order." }, { status: 400 });
  }

  const now = new Date();
  const orderNumber = `PDF-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const result = await prisma.$transaction(async (transaction) => {
    const variants = await transaction.productVariant.findMany({
      where: {
        id: { in: parsed.data.items.map((item) => item.variantId) },
        isActive: true,
        product: { isActive: true },
      },
      include: {
        product: true,
        prices: { where: { validUntil: null }, orderBy: { validFrom: "desc" }, take: 1 },
      },
    });
    if (variants.length !== parsed.data.items.length || variants.some((variant) => !variant.prices[0])) {
      return { kind: "unavailable" as const };
    }

    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    const items = parsed.data.items.map((item) => {
      const variant = byId.get(item.variantId);
      const price = variant?.prices[0]?.amount;
      if (!variant || !price) throw new Error("Validated product package unexpectedly missing.");
      const quantity = new Prisma.Decimal(item.quantity);
      return { variant, quantity, subtotal: price.mul(quantity).toDecimalPlaces(2) };
    });
    const subtotal = items.reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0));
    const phone = parsed.data.phone.replace(/[^\d+]/g, "");
    const existing = await transaction.customer.findFirst({
      where: { phone, userId: null },
      orderBy: { createdAt: "desc" },
    });
    const customer = existing
      ? await transaction.customer.update({
          where: { id: existing.id },
          data: { fullName: parsed.data.fullName, email: parsed.data.email?.trim() || null },
        })
      : await transaction.customer.create({
          data: { fullName: parsed.data.fullName, phone, email: parsed.data.email?.trim() || null },
        });

    const order = await transaction.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        orderSource: parsed.data.orderSource,
        paymentMethod: parsed.data.paymentMethod,
        subtotal,
        deliveryFee: 0,
        totalAmount: subtotal,
        orderStatus: "NEW",
        paymentStatus: "PENDING",
        deliveryAddress: parsed.data.deliveryAddress,
        deliveryTown: parsed.data.deliveryTown,
        deliveryInstructions: parsed.data.deliveryInstructions || null,
        expectedDeliveryAt: expectedDeliveryDate(now),
        items: {
          create: items.map(({ variant, quantity, subtotal: lineTotal }) => ({
            productId: variant.productId,
            variantId: variant.id,
            productName: variant.product.name,
            variantName: variant.label,
            quantity,
            unitPrice: variant.prices[0]!.amount,
            subtotal: lineTotal,
          })),
        },
        statusHistory: {
          create: {
            changedById: admin.id,
            toStatus: "NEW",
            note: `Order recorded by staff from ${parsed.data.orderSource.toLowerCase().replaceAll("_", " ")}.`,
          },
        },
        delivery: { create: { status: "SCHEDULED", history: { create: { changedById: admin.id, toStatus: "SCHEDULED" } } } },
      },
      select: { id: true, orderNumber: true },
    });
    await transaction.auditLog.create({
      data: {
        userId: admin.id,
        action: "MANUAL_ORDER_CREATED",
        entityType: "Order",
        entityId: order.id,
        details: { orderNumber, source: parsed.data.orderSource },
      },
    });
    return { kind: "created" as const, order };
  });

  if (result.kind === "unavailable") {
    return NextResponse.json({ error: "A selected product is no longer available. Refresh and try again." }, { status: 409 });
  }
  return NextResponse.json(result.order, { status: 201 });
}

export async function GET(request: Request) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const paymentStatus = url.searchParams.get("paymentStatus");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if ((from && Number.isNaN(Date.parse(from))) || (to && Number.isNaN(Date.parse(to)))) {
    return NextResponse.json({ error: "Enter valid order dates." }, { status: 400 });
  }
  const where: {
    orderStatus?: string;
    paymentStatus?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};
  if (status && ["NEW", "CONFIRMED", "BEING_PACKED", "READY_FOR_DISPATCH", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(status)) {
    where.orderStatus = status;
  }
  if (paymentStatus && ["PENDING", "PARTIAL", "PAID", "FAILED", "REFUNDED"].includes(paymentStatus)) {
    where.paymentStatus = paymentStatus;
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(`${from.slice(0, 10)}T00:00:00.000Z`);
    if (to) where.createdAt.lte = new Date(`${to.slice(0, 10)}T23:59:59.999Z`);
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: { select: { fullName: true, phone: true, email: true } },
      items: {
        select: {
          productName: true,
          variantName: true,
          quantity: true,
          unitPrice: true,
          subtotal: true,
        },
      },
      statusHistory: {
        select: { fromStatus: true, toStatus: true, note: true, createdAt: true, changedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        select: { id: true, amount: true, paymentMethod: true, paymentStatus: true, paymentReference: true, paymentDate: true, chequeDetails: true },
        orderBy: { createdAt: "desc" },
      },
      invoices: {
        select: { invoiceNumber: true, totalAmount: true, status: true, dueAt: true },
        orderBy: { issuedAt: "desc" },
      },
      delivery: {
        select: { id: true, status: true, assignedTo: true, actualDeliveredAt: true, deliveryNotes: true, history: { orderBy: { createdAt: "desc" } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(orders);
}

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { expectedDeliveryDate } from "@/lib/delivery";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { manualOrderSchema } from "@/lib/validation";
import { notifyActiveAdmins } from "@/lib/notifications";
import { parseAdminOrderQuery } from "@/lib/admin-order-query";

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
    await notifyActiveAdmins(transaction, {
      dedupeKey: `ORDER_CREATED:${order.id}`,
      type: "ORDER_CREATED",
      title: "New staff order",
      message: `Order ${order.orderNumber} was recorded by staff.`,
      href: "/admin/orders",
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
  const parsedQuery = parseAdminOrderQuery(url.searchParams);
  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error }, { status: 400 });
  }
  const { status, paymentStatus, from, to, search, page, pageSize } = parsedQuery.data;
  const filters: {
    orderStatus?: string;
    paymentStatus?: string;
    createdAt?: { gte?: Date; lte?: Date };
    OR?: Array<
      | { orderNumber: { contains: string; mode: "insensitive" } }
      | { customer: { fullName: { contains: string; mode: "insensitive" } } }
      | { customer: { email: { contains: string; mode: "insensitive" } } }
      | { customer: { phone: { contains: string } } }
    >;
  } = {};
  if (status) filters.orderStatus = status;
  if (paymentStatus) filters.paymentStatus = paymentStatus;
  if (from || to) {
    filters.createdAt = {};
    if (from) filters.createdAt.gte = from;
    if (to) filters.createdAt.lte = to;
  }

  if (search) {
    filters.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { customer: { fullName: { contains: search, mode: "insensitive" } } },
      { customer: { email: { contains: search, mode: "insensitive" } } },
      { customer: { phone: { contains: search } } },
    ];
  }

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where: filters,
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
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where: filters }),
  ]);
  const now = new Date();
  return NextResponse.json({
    orders: orders.map((order) => ({
      ...order,
      isOverdue: !["DELIVERED", "CANCELLED"].includes(order.orderStatus) && order.expectedDeliveryAt < now,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

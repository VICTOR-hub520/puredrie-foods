import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCustomerUser } from "@/lib/auth";
import { expectedDeliveryDate } from "@/lib/delivery";
import { prisma } from "@/lib/prisma";
import { getAvailableCredit } from "@/lib/credit";
import { checkoutSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit valid order details." }, { status: 400 });
  }
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check your details, delivery town, and payment method." },
      { status: 400 },
    );
  }

  const cartItems = parsed.data.items;
  if (new Set(cartItems.map((item) => item.variantId)).size !== cartItems.length) {
    return NextResponse.json({ error: "Remove duplicate products from your cart." }, { status: 400 });
  }

  const now = new Date();
  const account = await getCustomerUser();
  const orderNumber = `PDF-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const result = await prisma.$transaction(async (transaction) => {
    const variants = await transaction.productVariant.findMany({
      where: {
        id: { in: cartItems.map((item) => item.variantId) },
        isActive: true,
        product: { isActive: true },
      },
      include: {
        product: true,
        prices: {
          where: { validUntil: null },
          orderBy: { validFrom: "desc" },
          take: 1,
        },
      },
    });
    if (
      variants.length !== cartItems.length ||
      variants.some((variant) => !variant.prices[0])
    ) {
      return { kind: "unavailable" as const };
    }

    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    const lines = cartItems.map((item) => {
      const variant = byId.get(item.variantId);
      const price = variant?.prices[0]?.amount;
      if (!variant || !price) throw new Error("Validated product package unexpectedly missing.");
      const quantity = new Prisma.Decimal(item.quantity);
      return {
        variant,
        quantity,
        subtotal: price.mul(quantity).toDecimalPlaces(2),
      };
    });
    const subtotal = lines.reduce(
      (total, line) => total.add(line.subtotal),
      new Prisma.Decimal(0),
    );

    const phone = parsed.data.phone.replace(/[^\d+]/g, "");
    const linkedCustomer = account
      ? await transaction.customer.findUnique({ where: { userId: account.id } })
      : null;
    const existing = account
      ? linkedCustomer
      : await transaction.customer.findFirst({
          where: { phone, userId: null },
          orderBy: { createdAt: "desc" },
        });
    let creditTerms: { paymentTermDays: number } | null = null;
    if (parsed.data.paymentMethod === "CREDIT") {
      if (!account || !existing) return { kind: "credit_unavailable" as const };
      const availableCredit = await getAvailableCredit(transaction, existing.id);
      if (subtotal.gt(availableCredit)) return { kind: "credit_unavailable" as const };
      creditTerms = await transaction.customerCreditTerms.findUnique({
        where: { customerId: existing.id },
        select: { paymentTermDays: true },
      });
    }
    const customer = existing
      ? await transaction.customer.update({
          where: { id: existing.id },
          data: {
            fullName: parsed.data.fullName,
            phone,
            email: parsed.data.email?.trim() || null,
          },
        })
      : await transaction.customer.create({
          data: {
            userId: account?.id,
            fullName: parsed.data.fullName,
            phone,
            email: parsed.data.email?.trim() || null,
          },
        });

    const order = await transaction.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        orderSource: "WEBSITE",
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
          create: lines.map(({ variant, quantity, subtotal: lineTotal }) => ({
            productId: variant.productId,
            variantId: variant.id,
            productName: variant.product.name,
            variantName: variant.label,
            quantity,
            unitPrice: variant.prices[0]!.amount,
            subtotal: lineTotal,
          })),
        },
        invoices: parsed.data.paymentMethod === "CREDIT" ? {
          create: {
            invoiceNumber: `INV-${orderNumber}`,
            customerId: customer.id,
            totalAmount: subtotal,
            status: "ISSUED",
            dueAt: new Date(now.getTime() + (creditTerms?.paymentTermDays ?? 0) * 24 * 60 * 60 * 1000),
            items: {
              create: lines.map(({ variant, quantity, subtotal: lineTotal }) => ({
                description: `${variant.product.name} ${variant.label}`,
                quantity,
                unitPrice: variant.prices[0]!.amount,
                subtotal: lineTotal,
              })),
            },
          },
        } : undefined,
        statusHistory: {
          create: { toStatus: "NEW", note: "Order placed through the website." },
        },
        delivery: {
          create: {
            status: "SCHEDULED",
            history: { create: { toStatus: "SCHEDULED" } },
          },
        },
      },
      select: {
        orderNumber: true,
        totalAmount: true,
        expectedDeliveryAt: true,
      },
    });

    return { kind: "created" as const, order };
  });

  if (result.kind === "unavailable") {
    return NextResponse.json(
      { error: "One or more products are no longer available. Please refresh your cart." },
      { status: 409 },
    );
  }
  if (result.kind === "credit_unavailable") {
    return NextResponse.json(
      { error: "Approved customer credit is unavailable or insufficient for this order. Sign in and contact Puredrie Foods to review your terms." },
      { status: 403 },
    );
  }
  return NextResponse.json(
    {
      orderNumber: result.order.orderNumber,
      totalAmount: result.order.totalAmount.toFixed(2),
      expectedDeliveryAt: result.order.expectedDeliveryAt.toISOString(),
    },
    { status: 201 },
  );
}

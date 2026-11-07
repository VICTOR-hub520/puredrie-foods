import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allocatePaymentToOrderInvoices } from "@/lib/invoice-payments";
import { paymentEntrySchema } from "@/lib/validation";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid payment details." }, { status: 400 });
  }
  const parsed = paymentEntrySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the payment amount and method." }, { status: 400 });
  if (parsed.data.paymentMethod === "CHEQUE" && !parsed.data.chequeNumber) {
    return NextResponse.json({ error: "Enter the cheque number before recording a cheque." }, { status: 400 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      totalAmount: true,
      orderNumber: true,
      payments: { select: { amount: true, paymentMethod: true, paymentStatus: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const paidSoFar = order.payments.reduce(
    (total, payment) =>
      ["RECEIVED", "CLEARED"].includes(payment.paymentStatus)
        ? total.add(payment.amount)
        : total,
    new Prisma.Decimal(0),
  );
  const committedSoFar = order.payments.reduce(
    (total, payment) =>
      ["RECEIVED", "CLEARED"].includes(payment.paymentStatus) ||
      (payment.paymentMethod === "CHEQUE" && payment.paymentStatus === "PENDING")
        ? total.add(payment.amount)
        : total,
    new Prisma.Decimal(0),
  );
  const amount = new Prisma.Decimal(parsed.data.amount).toDecimalPlaces(2);
  const outstanding = order.totalAmount.sub(committedSoFar);
  if (amount.gt(outstanding)) {
    return NextResponse.json(
      { error: `Payment exceeds the outstanding balance of KSh ${outstanding.toFixed(2)}.` },
      { status: 400 },
    );
  }

  const isCheque = parsed.data.paymentMethod === "CHEQUE";
  const payment = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.payment.create({
      data: {
        orderId: id,
        amount,
        paymentMethod: parsed.data.paymentMethod,
        paymentReference: parsed.data.paymentReference || null,
        paymentStatus: isCheque ? "PENDING" : "RECEIVED",
        paymentDate: isCheque ? null : new Date(),
        notes: isCheque ? "Cheque requires clearance before counting as received." : null,
        ...(isCheque
          ? {
              chequeDetails: {
                create: {
                  chequeNumber: parsed.data.chequeNumber!,
                  bankName: parsed.data.bankName || null,
                  chequeDate: parsed.data.chequeDate ? new Date(`${parsed.data.chequeDate}T00:00:00.000Z`) : null,
                  chequeStatus: "COLLECTED",
                },
              },
            }
          : {}),
      },
    });
    if (!isCheque) {
      await allocatePaymentToOrderInvoices(transaction, id, saved.id, amount);
    }
    const received = isCheque ? paidSoFar : paidSoFar.add(amount);
    const nextStatus = received.gte(order.totalAmount) ? "PAID" : received.gt(0) ? "PARTIAL" : "PENDING";
    await transaction.order.update({ where: { id }, data: { paymentStatus: nextStatus } });
    await transaction.auditLog.create({
      data: {
        userId: admin.id,
        action: "PAYMENT_RECORDED",
        entityType: "Order",
        entityId: id,
        details: { amount: amount.toFixed(2), method: parsed.data.paymentMethod },
      },
    });
    return saved;
  });
  return NextResponse.json(
    { id: payment.id, amount: payment.amount.toFixed(2), paymentStatus: payment.paymentStatus },
    { status: 201 },
  );
}

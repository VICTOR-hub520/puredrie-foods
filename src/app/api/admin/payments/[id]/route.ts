import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allocatePaymentToOrderInvoices } from "@/lib/invoice-payments";
import { z } from "zod";

const schema = z.object({ chequeStatus: z.enum(["CLEARED", "BOUNCED"]) });
type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 401 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid cheque update." }, { status: 400 });
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Choose cleared or bounced." }, { status: 400 });

  const { id } = await params;
  const result = await prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: { id },
      select: {
        id: true,
        amount: true,
        orderId: true,
        paymentStatus: true,
        chequeDetails: { select: { id: true, chequeStatus: true } },
      },
    });
    if (!payment || !payment.chequeDetails) return { kind: "not_found" as const };
    if (!["COLLECTED", "DEPOSITED"].includes(payment.chequeDetails.chequeStatus)) {
      return { kind: "already_resolved" as const };
    }

    const cleared = parsed.data.chequeStatus === "CLEARED";
    await transaction.chequeDetails.update({
      where: { id: payment.chequeDetails.id },
      data: { chequeStatus: parsed.data.chequeStatus, ...(cleared ? { clearedAt: new Date() } : {}) },
    });
    await transaction.payment.update({
      where: { id },
      data: { paymentStatus: cleared ? "CLEARED" : "BOUNCED", paymentDate: cleared ? new Date() : null },
    });

    if (payment.orderId) {
      if (cleared) {
        await allocatePaymentToOrderInvoices(transaction, payment.orderId, payment.id, payment.amount);
      }
      const payments = await transaction.payment.findMany({
        where: { orderId: payment.orderId, id: { not: id }, paymentStatus: { in: ["RECEIVED", "CLEARED"] } },
        select: { amount: true },
      });
      const received = payments.reduce((sum, item) => sum.add(item.amount), new Prisma.Decimal(0));
      const order = await transaction.order.findUnique({
        where: { id: payment.orderId },
        select: { totalAmount: true },
      });
      if (order) {
        const totalReceived = cleared ? received.add(payment.amount) : received;
        await transaction.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: totalReceived.gte(order.totalAmount)
              ? "PAID"
              : totalReceived.gt(0)
                ? "PARTIAL"
                : "PENDING",
          },
        });
      }
    }
    await transaction.auditLog.create({
      data: {
        userId: admin.id,
        action: cleared ? "CHEQUE_CLEARED" : "CHEQUE_BOUNCED",
        entityType: "Payment",
        entityId: id,
        details: { amount: payment.amount.toFixed(2) },
      },
    });
    return { kind: "updated" as const };
  });

  if (result.kind === "not_found") return NextResponse.json({ error: "Pending cheque not found." }, { status: 404 });
  if (result.kind === "already_resolved") return NextResponse.json({ error: "This cheque has already been resolved." }, { status: 409 });
  return NextResponse.json({ message: `Cheque marked ${parsed.data.chequeStatus.toLowerCase()}.` });
}

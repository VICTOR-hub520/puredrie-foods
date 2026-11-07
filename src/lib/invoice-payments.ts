import { Prisma } from "@prisma/client";

export async function allocatePaymentToOrderInvoices(
  transaction: Prisma.TransactionClient,
  orderId: string,
  paymentId: string,
  amount: Prisma.Decimal,
) {
  const invoices = await transaction.invoice.findMany({
    where: { orderId, status: { notIn: ["PAID", "VOID"] } },
    include: {
      allocations: { select: { amount: true, payment: { select: { paymentStatus: true } } } },
    },
    orderBy: { issuedAt: "asc" },
  });
  let remaining = amount;
  for (const invoice of invoices) {
    if (!remaining.gt(0)) break;
    const paid = invoice.allocations.reduce(
      (sum, allocation) => ["RECEIVED", "CLEARED"].includes(allocation.payment.paymentStatus)
        ? sum.add(allocation.amount)
        : sum,
      new Prisma.Decimal(0),
    );
    const outstanding = invoice.totalAmount.sub(paid);
    if (!outstanding.gt(0)) continue;
    const allocated = remaining.lt(outstanding) ? remaining : outstanding;
    await transaction.paymentAllocation.create({
      data: { paymentId, invoiceId: invoice.id, amount: allocated },
    });
    const updatedPaid = paid.add(allocated);
    await transaction.invoice.update({
      where: { id: invoice.id },
      data: { status: updatedPaid.gte(invoice.totalAmount) ? "PAID" : "PARTIAL" },
    });
    remaining = remaining.sub(allocated);
  }
}

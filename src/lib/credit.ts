import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Client = typeof prisma | Prisma.TransactionClient;

export async function getAvailableCredit(client: Client, customerId: string): Promise<Prisma.Decimal> {
  const terms = await client.customerCreditTerms.findUnique({
    where: { customerId },
    select: { isApproved: true, creditLimit: true },
  });
  if (!terms?.isApproved) return new Prisma.Decimal(0);

  const [orders, invoices] = await Promise.all([
    client.order.findMany({
      where: { customerId, orderStatus: { not: "CANCELLED" } },
      select: {
        totalAmount: true,
        payments: { select: { amount: true, paymentStatus: true } },
      },
    }),
    client.invoice.findMany({
      where: { customerId, orderId: null, status: { notIn: ["PAID", "VOID"] } },
      select: {
        totalAmount: true,
        allocations: {
          select: { amount: true, payment: { select: { paymentStatus: true } } },
        },
      },
    }),
  ]);
  const orderBalances = orders.reduce((balance, order) => {
    const received = order.payments.reduce(
      (sum, payment) => ["RECEIVED", "CLEARED"].includes(payment.paymentStatus) ? sum.add(payment.amount) : sum,
      new Prisma.Decimal(0),
    );
    const outstanding = order.totalAmount.sub(received);
    return outstanding.gt(0) ? balance.add(outstanding) : balance;
  }, new Prisma.Decimal(0));
  const invoiceBalances = invoices.reduce((balance, invoice) => {
    const allocated = invoice.allocations.reduce(
      (sum, allocation) => ["RECEIVED", "CLEARED"].includes(allocation.payment.paymentStatus) ? sum.add(allocation.amount) : sum,
      new Prisma.Decimal(0),
    );
    const outstanding = invoice.totalAmount.sub(allocated);
    return outstanding.gt(0) ? balance.add(outstanding) : balance;
  }, new Prisma.Decimal(0));
  const available = terms.creditLimit.sub(orderBalances).sub(invoiceBalances);
  return available.gt(0) ? available : new Prisma.Decimal(0);
}

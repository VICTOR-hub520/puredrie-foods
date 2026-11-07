import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (
    (fromParam && !datePattern.test(fromParam)) ||
    (toParam && !datePattern.test(toParam)) ||
    (fromParam && Number.isNaN(Date.parse(`${fromParam}T00:00:00.000Z`))) ||
    (toParam && Number.isNaN(Date.parse(`${toParam}T00:00:00.000Z`)))
  ) {
    return NextResponse.json({ error: "Enter valid report dates." }, { status: 400 });
  }
  const from = fromParam ? new Date(`${fromParam}T00:00:00.000Z`) : undefined;
  const to = toParam ? new Date(`${toParam}T23:59:59.999Z`) : undefined;
  const dateRange = from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};
  const paymentDateRange = from || to
    ? { paymentDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
    : {};
  const paidOrders = await prisma.order.findMany({
    where: { ...dateRange, paymentStatus: "PAID" },
    select: { id: true, totalAmount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const payments = await prisma.payment.findMany({
    where: {
      ...paymentDateRange,
      paymentStatus: { in: ["RECEIVED", "CLEARED"] },
    },
    select: { id: true, orderId: true, amount: true, paymentDate: true },
    orderBy: { paymentDate: "asc" },
  });
  const items = await prisma.orderItem.findMany({
    where: { order: { ...dateRange, paymentStatus: "PAID" } },
    select: { productName: true, quantity: true, subtotal: true },
  });
  const daily = new Map<string, { revenue: number; orderIds: Set<string> }>();
  const weekly = new Map<string, { revenue: number; orderIds: Set<string> }>();
  const monthly = new Map<string, { revenue: number; orderIds: Set<string> }>();
  const nairobiCalendarDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  for (const payment of payments) {
    if (!payment.paymentDate) continue;
    const day = nairobiCalendarDate.format(payment.paymentDate);
    const weekStart = new Date(`${day}T00:00:00.000Z`);
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    const week = weekStart.toISOString().slice(0, 10);
    const month = `${day.slice(0, 7)}-01`;
    for (const [group, key] of [[daily, day], [weekly, week], [monthly, month]] as const) {
      const current = group.get(key) ?? { revenue: 0, orderIds: new Set<string>() };
      current.revenue += payment.amount.toNumber();
      current.orderIds.add(payment.orderId ?? payment.id);
      group.set(key, current);
    }
  }
  const bestSellers = new Map<string, { quantity: number; revenue: number }>();
  for (const item of items) {
    const current = bestSellers.get(item.productName) ?? { quantity: 0, revenue: 0 };
    current.quantity += item.quantity.toNumber();
    current.revenue += item.subtotal.toNumber();
    bestSellers.set(item.productName, current);
  }

  return NextResponse.json({
    totalRevenue: payments.reduce((total, payment) => total + payment.amount.toNumber(), 0),
    orderCount: paidOrders.length,
    daily: [...daily.entries()].map(([date, values]) => ({ date, revenue: values.revenue, orders: values.orderIds.size })),
    weekly: [...weekly.entries()].map(([date, values]) => ({ date, revenue: values.revenue, orders: values.orderIds.size })),
    monthly: [...monthly.entries()].map(([date, values]) => ({ date, revenue: values.revenue, orders: values.orderIds.size })),
    bestSellers: [...bestSellers.entries()]
      .map(([name, values]) => ({ name, ...values }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
  });
}

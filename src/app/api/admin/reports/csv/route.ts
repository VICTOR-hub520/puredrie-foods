import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function csvCell(value: string | number | { toString(): string }) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (
    (from && !datePattern.test(from)) ||
    (to && !datePattern.test(to)) ||
    (from && Number.isNaN(Date.parse(`${from}T00:00:00.000Z`))) ||
    (to && Number.isNaN(Date.parse(`${to}T00:00:00.000Z`)))
  ) {
    return NextResponse.json({ error: "Enter valid export dates." }, { status: 400 });
  }
  const orders = await prisma.order.findMany({
    where: from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {},
    include: {
      customer: { select: { fullName: true, phone: true, email: true } },
      items: { select: { productName: true, variantName: true, quantity: true, unitPrice: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  const rows = [
    ["Order number", "Date", "Customer", "Phone", "Email", "Products", "Subtotal (KES)", "Delivery (KES)", "Total (KES)", "Order status", "Payment status"],
    ...orders.map((order) => [
      order.orderNumber,
      order.createdAt.toISOString(),
      order.customer.fullName,
      order.customer.phone,
      order.customer.email ?? "",
      order.items.map((item) => `${item.productName} ${item.variantName ?? ""} x${item.quantity}`).join("; "),
      order.subtotal.toFixed(2),
      order.deliveryFee.toFixed(2),
      order.totalAmount.toFixed(2),
      order.orderStatus,
      order.paymentStatus,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="puredrie-foods-sales.csv"',
      "Cache-Control": "no-store",
    },
  });
}

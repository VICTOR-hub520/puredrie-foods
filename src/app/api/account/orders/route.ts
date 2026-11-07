import { NextResponse } from "next/server";
import { getCustomerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCustomerUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your orders." }, { status: 401 });

  const customer = await prisma.customer.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!customer) return NextResponse.json({ error: "Customer profile not found." }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    include: {
      items: {
        select: { productName: true, variantName: true, quantity: true, unitPrice: true, subtotal: true },
      },
      statusHistory: {
        select: { fromStatus: true, toStatus: true, note: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        select: { amount: true, paymentMethod: true, paymentStatus: true, paymentDate: true },
        orderBy: { createdAt: "desc" },
      },
      invoices: {
        select: { invoiceNumber: true, totalAmount: true, status: true, issuedAt: true, dueAt: true },
        orderBy: { issuedAt: "desc" },
      },
      delivery: {
        select: { status: true, assignedTo: true, deliveryNotes: true, actualDeliveredAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}

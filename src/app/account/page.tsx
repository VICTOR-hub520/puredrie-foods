import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountDashboard } from "@/app/account/account-dashboard";
import { getCustomerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account" };

export default async function CustomerAccountPage() {
  const user = await getCustomerUser();
  if (!user) redirect("/account/login");
  const customer = await prisma.customer.findUnique({
    where: { userId: user.id },
    select: { id: true, fullName: true, phone: true },
  });
  if (!customer) redirect("/account/login");

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    include: {
      items: { select: { productName: true, variantName: true, quantity: true, subtotal: true } },
      payments: { select: { amount: true, paymentMethod: true, paymentStatus: true }, orderBy: { createdAt: "desc" } },
      invoices: { select: { invoiceNumber: true, totalAmount: true, status: true, issuedAt: true, dueAt: true }, orderBy: { issuedAt: "desc" } },
      delivery: { select: { status: true, assignedTo: true, actualDeliveredAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, readAt: null },
    select: { id: true, title: true, message: true, href: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return <AccountDashboard user={user} customer={customer} orders={orders} notifications={notifications.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))} />;
}

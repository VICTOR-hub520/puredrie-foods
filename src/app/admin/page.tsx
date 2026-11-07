import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  const now = new Date();
  const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const activeDelivery = { notIn: ["DELIVERED", "CANCELLED"] };
  const [orders, pending, completed, revenue, recentOrders, overdue, dueSoon, cancelled] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { orderStatus: { in: ["NEW", "CONFIRMED", "BEING_PACKED"] } } }),
    prisma.order.count({ where: { orderStatus: "DELIVERED" } }),
    prisma.payment.aggregate({
      where: { paymentStatus: { in: ["RECEIVED", "CLEARED"] } },
      _sum: { amount: true },
    }),
    prisma.order.findMany({
      include: { customer: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.order.count({
      where: { orderStatus: activeDelivery, expectedDeliveryAt: { lt: now } },
    }),
    prisma.order.count({
      where: { orderStatus: activeDelivery, expectedDeliveryAt: { gte: now, lte: inTwoDays } },
    }),
    prisma.order.count({ where: { orderStatus: "CANCELLED" } }),
  ]);

  return (
    <div className="admin-shell">
      <AdminNav name={admin.name} />
      <main className="admin-main">
        <div className="admin-page-heading"><div><span className="eyebrow">Your business at a glance</span><h1>Good morning, {admin.name.split(" ")[0]}.</h1></div><Link className="button button-dark" href="/admin/orders">View all orders <span>↗</span></Link></div>
        <section className="metric-grid" aria-label="Sales overview">
          <article className="metric-card"><span>Payments received</span><strong>{formatKes(revenue._sum.amount ?? 0)}</strong><small>Received or cleared</small></article>
          <article className="metric-card"><span>Total orders</span><strong>{orders}</strong><small>All time</small></article>
          <article className="metric-card metric-highlight"><span>Needs processing</span><strong>{pending}</strong><small>New, confirmed or packing</small></article>
          <article className="metric-card metric-highlight"><span>Overdue deliveries</span><strong>{overdue}</strong><small>Past six-calendar-day deadline</small></article>
          <article className="metric-card"><span>Due soon</span><strong>{dueSoon}</strong><small>Expected within two days</small></article>
          <article className="metric-card"><span>Delivered</span><strong>{completed}</strong><small>{cancelled} cancelled</small></article>
        </section>
        <section className="admin-card">
          <div className="admin-card-heading"><div><span className="eyebrow">Latest activity</span><h2>Recent orders</h2></div><Link href="/admin/orders" className="underlined-link">All orders ↗</Link></div>
          {recentOrders.length ? (
            <div className="table-scroll"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>{recentOrders.map((order) => <tr key={order.id}><td><Link href="/admin/orders">{order.orderNumber}</Link></td><td>{order.customer.fullName}</td><td>{order.createdAt.toLocaleDateString("en-KE")}</td><td>{formatKes(order.totalAmount)}</td><td><span className={`status-pill status-${order.orderStatus.toLowerCase()}`}>{order.orderStatus.toLowerCase()}</span></td></tr>)}</tbody>
            </table></div>
          ) : <div className="admin-empty"><span>✳</span><h3>No orders just yet</h3><p>Customer orders will appear here as soon as they arrive.</p></div>}
        </section>
      </main>
    </div>
  );
}

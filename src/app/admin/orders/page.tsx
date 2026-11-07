import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { getAdminUser } from "@/lib/auth";
import { OrdersManager } from "@/app/admin/orders/orders-manager";
import { ManualOrderForm } from "@/app/admin/orders/manual-order-form";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");
  return (
    <div className="admin-shell">
      <AdminNav name={admin.name} />
      <main className="admin-main">
        <div className="admin-page-heading"><div><span className="eyebrow">Sales management</span><h1>Orders</h1><p>Review customer orders and keep each one moving.</p></div></div>
        <ManualOrderForm />
        <OrdersManager />
      </main>
    </div>
  );
}

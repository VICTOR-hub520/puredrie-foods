import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { CustomerManager } from "@/app/admin/customers/customer-manager";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");
  return (
    <div className="admin-shell">
      <AdminNav name={admin.name} />
      <main className="admin-main">
        <div className="admin-page-heading"><div><span className="eyebrow">Customer management</span><h1>Customers</h1><p>Review customer contact details and manage approved credit terms.</p></div></div>
        <CustomerManager />
      </main>
    </div>
  );
}

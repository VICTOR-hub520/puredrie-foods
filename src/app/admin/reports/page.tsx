import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { ReportsView } from "@/app/admin/reports/reports-view";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");
  return (
    <div className="admin-shell">
      <AdminNav name={admin.name} />
      <main className="admin-main">
        <div className="admin-page-heading"><div><span className="eyebrow">Sales performance</span><h1>Reports</h1><p>Sales revenue includes payments recorded as paid.</p></div></div>
        <ReportsView />
      </main>
    </div>
  );
}

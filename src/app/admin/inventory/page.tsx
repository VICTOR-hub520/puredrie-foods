import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { getAdminUser } from "@/lib/auth";
import { InventoryManager } from "@/app/admin/inventory/inventory-manager";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  return (
    <div className="admin-shell">
      <AdminNav name={admin.name} />
      <main className="admin-main">
        <div className="admin-page-heading">
          <div>
            <span className="eyebrow">Stock and production</span>
            <h1>Inventory</h1>
            <p>Receive traceable stock, record adjustments, and package bulk ingredients into sale-ready products.</p>
          </div>
        </div>
        <InventoryManager />
      </main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { getAdminUser } from "@/lib/auth";
import { ThemeSettings } from "@/app/admin/settings/theme-settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  return (
    <div className="admin-shell">
      <AdminNav name={admin.name} />
      <main className="admin-main">
        <div className="admin-page-heading">
          <div>
            <span className="eyebrow">Store appearance</span>
            <h1>Settings</h1>
            <p>Choose the color palette used by the shop and admin dashboard on this browser.</p>
          </div>
        </div>
        <ThemeSettings />
      </main>
    </div>
  );
}

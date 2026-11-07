import { redirect } from "next/navigation";
import { ContentManager } from "@/app/admin/content/content-manager";
import { AdminNav } from "@/components/admin-nav";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  return (
    <div className="admin-shell">
      <AdminNav name={admin.name} />
      <main className="admin-main">
        <div className="admin-page-heading">
          <div><span className="eyebrow">Company identity</span><h1>Brand story</h1><p>Keep the public story personal, accurate and in your own words.</p></div>
        </div>
        <ContentManager />
      </main>
    </div>
  );
}

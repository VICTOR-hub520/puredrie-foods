import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/app/admin/login/admin-login-form";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getAdminUser()) redirect("/admin");
  return (
    <main className="admin-login-page">
      <div className="admin-login-card">
        <span className="admin-brand">puredrie foods <span>admin</span></span>
        <span className="eyebrow">Private access</span>
        <h1>Welcome <em>back.</em></h1>
        <p>Sign in to manage orders and sales.</p>
        <AdminLoginForm />
      </div>
    </main>
  );
}

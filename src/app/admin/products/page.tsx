import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { ProductManager } from "@/app/admin/products/product-manager";
import { getAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");
  return (
    <div className="admin-shell">
      <AdminNav name={admin.name} />
      <main className="admin-main">
        <div className="admin-page-heading"><div><span className="eyebrow">Catalogue management</span><h1>Products</h1><p>Update product information, replace placeholder images, and approve package prices.</p></div></div>
        <ProductManager />
      </main>
    </div>
  );
}

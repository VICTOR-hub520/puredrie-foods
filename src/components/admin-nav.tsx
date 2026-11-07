"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function AdminNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");
      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not sign out.");
      setBusy(false);
    }
  }

  return (
    <header className={`admin-header${collapsed ? " admin-header-collapsed" : ""}`}>
      <Link href="/admin" className="admin-brand"><span className="admin-brand-name">puredrie foods</span><span className="admin-brand-tag">admin</span></Link>
      <button className="admin-sidebar-toggle" type="button" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? "»" : "«"} <span className="admin-nav-label">{collapsed ? "Expand" : "Collapse"}</span></button>
      <nav aria-label="Administration">
        <Link aria-label="Overview" aria-current={pathname === "/admin" ? "page" : undefined} title="Overview" className={pathname === "/admin" ? "selected" : ""} href="/admin"><span aria-hidden="true">⌂</span><span className="admin-nav-label">Overview</span></Link>
        <Link aria-label="Orders" aria-current={pathname.startsWith("/admin/orders") ? "page" : undefined} title="Orders" className={pathname.startsWith("/admin/orders") ? "selected" : ""} href="/admin/orders"><span aria-hidden="true">▣</span><span className="admin-nav-label">Orders</span></Link>
        <Link aria-label="Customers" aria-current={pathname.startsWith("/admin/customers") ? "page" : undefined} title="Customers" className={pathname.startsWith("/admin/customers") ? "selected" : ""} href="/admin/customers"><span aria-hidden="true">♧</span><span className="admin-nav-label">Customers</span></Link>
        <Link aria-label="Products" aria-current={pathname.startsWith("/admin/products") ? "page" : undefined} title="Products" className={pathname.startsWith("/admin/products") ? "selected" : ""} href="/admin/products"><span aria-hidden="true">✳</span><span className="admin-nav-label">Products</span></Link>
        <Link aria-label="Inventory" aria-current={pathname.startsWith("/admin/inventory") ? "page" : undefined} title="Inventory" className={pathname.startsWith("/admin/inventory") ? "selected" : ""} href="/admin/inventory"><span aria-hidden="true">▦</span><span className="admin-nav-label">Inventory</span></Link>
        <Link aria-label="Reports" aria-current={pathname.startsWith("/admin/reports") ? "page" : undefined} title="Reports" className={pathname.startsWith("/admin/reports") ? "selected" : ""} href="/admin/reports"><span aria-hidden="true">▤</span><span className="admin-nav-label">Reports</span></Link>
        <Link aria-label="Brand story" aria-current={pathname.startsWith("/admin/content") ? "page" : undefined} title="Brand story" className={pathname.startsWith("/admin/content") ? "selected" : ""} href="/admin/content"><span aria-hidden="true">✎</span><span className="admin-nav-label">Brand story</span></Link>
        <Link aria-label="Settings" aria-current={pathname.startsWith("/admin/settings") ? "page" : undefined} title="Settings" className={pathname.startsWith("/admin/settings") ? "selected" : ""} href="/admin/settings"><span aria-hidden="true">⚙</span><span className="admin-nav-label">Settings</span></Link>
      </nav>
      <div className="admin-user"><span className="admin-user-name">{name}</span><button type="button" onClick={logout} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button></div>
    </header>
  );
}

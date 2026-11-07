import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountForm } from "@/app/account/account-form";
import { getCustomerUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Customer sign in" };

export default async function AccountLoginPage() {
  if (await getCustomerUser()) redirect("/account");
  return (
    <section className="section account-entry">
      <div className="account-entry-copy"><span className="eyebrow">Your Puredrie account</span><h1>Welcome <em>back.</em></h1><p>Sign in to see your orders, delivery progress, and customer statements.</p><Link className="underlined-link" href="/shop">Continue shopping ↗</Link></div>
      <div className="account-entry-card"><h2>Sign in</h2><AccountForm mode="login" /></div>
    </section>
  );
}

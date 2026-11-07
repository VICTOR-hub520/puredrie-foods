import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountForm } from "@/app/account/account-form";
import { getCustomerUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create a customer account" };

export default async function AccountRegisterPage() {
  if (await getCustomerUser()) redirect("/account");
  return (
    <section className="section account-entry">
      <div className="account-entry-copy"><span className="eyebrow">Join Puredrie Foods</span><h1>Your orders,<br /><em>all in one place.</em></h1><p>Create an account to track deliveries and review your order and payment history.</p></div>
      <div className="account-entry-card"><h2>Create account</h2><AccountForm mode="register" /></div>
    </section>
  );
}

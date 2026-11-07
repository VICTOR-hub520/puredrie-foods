"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BRAND } from "@/lib/brand";
import { formatNairobiDate } from "@/lib/delivery";
import { formatKes } from "@/lib/money";

type Props = {
  user: { name: string; email: string };
  customer: { fullName: string; phone: string };
  orders: {
    id: string;
    orderNumber: string;
    createdAt: Date;
    expectedDeliveryAt: Date;
    totalAmount: { toString(): string };
    orderStatus: string;
    paymentStatus: string;
    items: { productName: string; variantName: string | null; quantity: { toString(): string }; subtotal: { toString(): string } }[];
    payments: { amount: { toString(): string }; paymentMethod: string; paymentStatus: string }[];
    invoices: { invoiceNumber: string; totalAmount: { toString(): string }; status: string; issuedAt: Date; dueAt: Date | null }[];
    delivery: { status: string; assignedTo: string | null; actualDeliveredAt: Date | null } | null;
  }[];
};

export function AccountDashboard({ user, customer, orders }: Props) {
  const router = useRouter();
  const [name, setName] = useState(customer.fullName);
  const [phone, setPhone] = useState(customer.phone);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name, phone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update your details.");
      setMessage(result.message);
      router.refresh();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not update your details.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/customer/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } catch {
      setError("Could not sign out. Please try again.");
      setBusy(false);
    }
  }

  return (
    <section className="section account-dashboard">
      <div className="account-welcome"><div><span className="eyebrow">Customer account</span><h1>Hello, <em>{customer.fullName.split(" ")[0]}.</em></h1><p>Your orders and account details are private to you.</p></div><button className="button button-outline" onClick={logout} disabled={busy}>Sign out</button></div>
      <div className="account-columns">
        <div className="account-entry-card">
          <h2>Your contact details</h2>
          <form onSubmit={updateProfile}>
            {message && <p className="success-alert" role="status">{message}</p>}
            {error && <p className="form-alert" role="alert">{error}</p>}
            <label className="field-label" htmlFor="profile-name">Full name</label><input id="profile-name" className="form-control" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required />
            <label className="field-label" htmlFor="profile-email">Email address</label><input id="profile-email" className="form-control" value={user.email} disabled />
            <label className="field-label" htmlFor="profile-phone">Phone number</label><input id="profile-phone" className="form-control" value={phone} onChange={(event) => setPhone(event.target.value)} minLength={7} maxLength={20} required />
            <button type="submit" className="button button-dark full-button" disabled={busy}>{busy ? "Saving…" : "Update details"}</button>
          </form>
        </div>
        <div className="account-orders">
          <div className="section-heading"><div><span className="eyebrow">Your purchases</span><h2>Order history</h2></div></div>
          {orders.length ? orders.map((order) => (
            <article className="account-order" key={order.id}>
              <div className="account-order-heading"><div><strong>{order.orderNumber}</strong><span>{new Date(order.createdAt).toLocaleDateString("en-KE")}</span></div><strong>{formatKes(order.totalAmount.toString())}</strong></div>
              <p>{order.items.map((item) => `${item.productName} ${item.variantName ?? ""} × ${item.quantity.toString()}`).join(" · ")}</p>
              <div className="account-order-meta"><span>Order: {order.orderStatus.replaceAll("_", " ").toLowerCase()}</span><span>Delivery: {order.delivery?.status.replaceAll("_", " ").toLowerCase() ?? "scheduled"}</span><span>Payment: {order.paymentStatus.toLowerCase()}</span><span>Deliver by: {formatNairobiDate(order.expectedDeliveryAt)}</span></div>
              {order.payments.map((payment, index) => <p className="account-payment" key={`${order.id}-payment-${index}`}>{payment.paymentMethod} · {formatKes(payment.amount.toString())} · {payment.paymentStatus.toLowerCase()}</p>)}
              {order.invoices.map((invoice) => <p className="account-payment" key={invoice.invoiceNumber}>Statement {invoice.invoiceNumber} · {invoice.status.toLowerCase()} · {formatKes(invoice.totalAmount.toString())}</p>)}
            </article>
          )) : <div className="empty-state"><h3>No orders yet</h3><p>Your orders will appear here after checkout.</p><Link className="button button-dark" href="/shop">Browse products</Link></div>}
        </div>
      </div>
      <p className="account-help">Need help with an order? <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a></p>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { formatKes } from "@/lib/money";
import type { FormEvent } from "react";

type Order = {
  id: string;
  orderNumber: string;
  createdAt: string;
  subtotal: string;
  deliveryFee: string;
  totalAmount: string;
  orderStatus: string;
  paymentStatus: string;
  deliveryAddress: string;
  deliveryTown: string;
  expectedDeliveryAt: string;
  orderSource: string;
  paymentMethod: string | null;
  actualDeliveryAt: string | null;
  customer: { fullName: string; phone: string; email: string | null };
  items: { productName: string; variantName: string | null; quantity: string; unitPrice: string; subtotal: string }[];
  statusHistory: { fromStatus: string | null; toStatus: string; note: string | null; createdAt: string; changedBy: { name: string } | null }[];
  payments: { id: string; amount: string; paymentMethod: string; paymentStatus: string; paymentReference: string | null; paymentDate: string | null; chequeDetails: { chequeStatus: string; chequeNumber: string } | null }[];
  invoices: { invoiceNumber: string; totalAmount: string; status: string; dueAt: string | null }[];
  delivery: { status: string; assignedTo: string | null; actualDeliveredAt: string | null; deliveryNotes: string | null } | null;
};
const orderStatuses = ["NEW", "CONFIRMED", "BEING_PACKED", "READY_FOR_DISPATCH", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
const paymentStatuses = ["PENDING", "PARTIAL", "PAID", "FAILED", "REFUNDED"];

async function requestOrders(params: URLSearchParams): Promise<Order[]> {
  const response = await fetch(`/api/admin/orders?${params}`, { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not load orders.");
  return result as Order[];
}

export function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [savingPaymentId, setSavingPaymentId] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    requestOrders(params)
      .then((result) => {
        if (active) setOrders(result);
      })
      .catch((issue: unknown) => {
        if (active) setError(issue instanceof Error ? issue.message : "Could not load orders.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [status, paymentStatus, from, to]);

  useEffect(() => {
    async function refreshOrders() {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      try {
        setOrders(await requestOrders(params));
      } catch (issue) {
        setError(issue instanceof Error ? issue.message : "Could not refresh orders.");
      }
    }
    window.addEventListener("puredrie:orders-updated", refreshOrders);
    return () => window.removeEventListener("puredrie:orders-updated", refreshOrders);
  }, [status, paymentStatus, from, to]);

  async function updateOrder(id: string, orderStatus: string) {
    if (orderStatus === "CANCELLED" && !window.confirm("Cancel this order?")) return;
    setSavingId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update order.");
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      setOrders(await requestOrders(params));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not update order.");
    } finally {
      setSavingId("");
      setLoading(false);
    }
  }

  async function resolveCheque(paymentId: string, chequeStatus: "CLEARED" | "BOUNCED") {
    if (chequeStatus === "BOUNCED" && !window.confirm("Mark this cheque as bounced? It will not count as received payment.")) return;
    setSavingPaymentId(paymentId);
    setError("");
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chequeStatus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update cheque status.");
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      setOrders(await requestOrders(params));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not update cheque status.");
    } finally {
      setSavingPaymentId("");
    }
  }

  async function recordPayment(event: FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSavingId(orderId);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(form.get("amount")),
          paymentMethod: form.get("paymentMethod"),
          paymentReference: form.get("paymentReference"),
          chequeNumber: form.get("chequeNumber"),
          bankName: form.get("bankName"),
          chequeDate: form.get("chequeDate") || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not record payment.");
      formElement.reset();
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      setOrders(await requestOrders(params));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not record payment.");
    } finally {
      setSavingId("");
    }
  }

  const visible = orders.filter((order) =>
    `${order.orderNumber} ${order.customer.fullName} ${order.customer.phone}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="admin-filters">
        <label><span className="visually-hidden">Search orders</span><input className="form-control" placeholder="Search name, phone or order…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label><span className="visually-hidden">Filter by order status</span><select className="form-control" value={status} onChange={(event) => { setLoading(true); setError(""); setStatus(event.target.value); }}><option value="">All order statuses</option>{orderStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span className="visually-hidden">Filter by payment status</span><select className="form-control" value={paymentStatus} onChange={(event) => { setLoading(true); setError(""); setPaymentStatus(event.target.value); }}><option value="">All payment statuses</option>{paymentStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span className="visually-hidden">Orders from date</span><input aria-label="Orders from date" className="form-control" type="date" value={from} max={to || undefined} onChange={(event) => { setLoading(true); setError(""); setFrom(event.target.value); }} /></label>
        <label><span className="visually-hidden">Orders through date</span><input aria-label="Orders through date" className="form-control" type="date" value={to} min={from || undefined} onChange={(event) => { setLoading(true); setError(""); setTo(event.target.value); }} /></label>
      </div>
      {error && <p className="form-alert" role="alert">{error}</p>}
      {loading ? <p className="admin-loading" role="status">Loading orders…</p> : visible.length ? (
        <div className="admin-order-list">
          {visible.map((order) => (
            <article className="admin-order-card" key={order.id}>
              <div className="order-card-top">
                <div><span className="eyebrow">{order.orderNumber}</span><h2>{order.customer.fullName}</h2><p>{new Date(order.createdAt).toLocaleString("en-KE")}</p></div>
                <strong>{formatKes(order.totalAmount)}</strong>
              </div>
              <div className="order-card-meta"><span>{order.customer.phone}</span><span>{order.customer.email || "No email provided"}</span><span>Source: {order.orderSource.replaceAll("_", " ").toLowerCase()}</span><span>Chosen payment: {order.paymentMethod?.replaceAll("_", " ").toLowerCase() ?? "not selected"}</span><span>{order.items.length} product line(s)</span><span>Free delivery · by {new Date(order.expectedDeliveryAt).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" })}</span></div>
              <details className="order-details">
                <summary>View items and delivery details</summary>
                <ul>{order.items.map((item, index) => <li key={`${order.id}-${index}`}>{item.productName} {item.variantName} × {item.quantity} <span>{formatKes(item.subtotal)}</span></li>)}</ul>
                <p><strong>Deliver to:</strong> {order.deliveryAddress}, {order.deliveryTown}</p>
                {order.delivery?.deliveryNotes && <p><strong>Delivery notes:</strong> {order.delivery.deliveryNotes}</p>}
                <h3>Order history</h3>
                <ul>{order.statusHistory.map((event, index) => <li key={`${order.id}-event-${index}`}>{event.fromStatus ? `${event.fromStatus} → ` : ""}{event.toStatus} · {event.changedBy?.name ?? "Customer"} · {new Date(event.createdAt).toLocaleString("en-KE")}{event.note ? ` · ${event.note}` : ""}</li>)}</ul>
                <h3>Payments recorded</h3>
                <ul>{order.payments.map((payment) => <li key={payment.id}>{payment.paymentMethod} · {formatKes(payment.amount)} · {payment.paymentStatus}{payment.chequeDetails ? <> · cheque {payment.chequeDetails.chequeNumber} ({payment.chequeDetails.chequeStatus}){["COLLECTED", "DEPOSITED"].includes(payment.chequeDetails.chequeStatus) && <span> <button className="text-button" type="button" disabled={savingPaymentId === payment.id} onClick={() => resolveCheque(payment.id, "CLEARED")}>Mark cleared</button> <button className="text-button" type="button" disabled={savingPaymentId === payment.id} onClick={() => resolveCheque(payment.id, "BOUNCED")}>Mark bounced</button></span>}</> : null}</li>)}</ul>
                {order.invoices.length > 0 && <><h3>Invoices / statements</h3><ul>{order.invoices.map((invoice) => <li key={invoice.invoiceNumber}>{invoice.invoiceNumber} · {formatKes(invoice.totalAmount)} · {invoice.status}{invoice.dueAt ? ` · due ${new Date(invoice.dueAt).toLocaleDateString("en-KE")}` : ""}</li>)}</ul></>}
              </details>
              <div className="order-controls">
                <label>Order status <select className="form-control" value={order.orderStatus} disabled={savingId === order.id} onChange={(event) => updateOrder(order.id, event.target.value)}>{orderStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
                <span>Payment: {order.paymentStatus}</span>
                {savingId === order.id && <span role="status">Saving…</span>}
              </div>
              <form className="order-payment-form" onSubmit={(event) => recordPayment(event, order.id)}>
                <label>Amount<input className="form-control" name="amount" type="number" min="0.01" step="0.01" max="100000000" placeholder="KSh" required /></label>
                <label>Method<select className="form-control" name="paymentMethod" defaultValue="MPESA"><option value="MPESA">M-Pesa</option><option value="CASH">Cash</option><option value="CHEQUE">Cheque</option></select></label>
                <label>Reference<input className="form-control" name="paymentReference" maxLength={120} placeholder="Optional" /></label>
                <label>Cheque number<input className="form-control" name="chequeNumber" maxLength={100} placeholder="Required for cheque" /></label>
                <label>Bank<input className="form-control" name="bankName" maxLength={100} placeholder="Optional" /></label>
                <label>Cheque date<input className="form-control" name="chequeDate" type="date" /></label>
                <button className="button button-dark" type="submit" disabled={savingId === order.id}>{savingId === order.id ? "Saving…" : "Record payment"}</button>
              </form>
            </article>
          ))}
        </div>
      ) : <div className="admin-empty"><span>✳</span><h3>No orders found</h3><p>Try changing your search or filters.</p></div>}
    </>
  );
}

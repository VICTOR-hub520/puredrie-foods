"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useCart } from "@/components/cart-provider";
import { expectedDeliveryDateLabel, formatNairobiDate } from "@/lib/delivery";
import { formatKes } from "@/lib/money";
import { BRAND } from "@/lib/brand";

type OrderConfirmation = { orderNumber: string; totalAmount: string; expectedDeliveryAt: string };

export default function CheckoutPage() {
  const { items, subtotal, clearCart, hydrated } = useCart();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);
  const [availableCredit, setAvailableCredit] = useState(0);
  const [creditError, setCreditError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/customer/credit", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not check approved credit.");
        if (result.eligible) setAvailableCredit(Number(result.availableCredit));
      })
      .catch((issue: unknown) => {
        if (issue instanceof Error && issue.name !== "AbortError") {
          setCreditError("Approved credit could not be checked. You can still use the other payment methods.");
        }
      });
    return () => controller.abort();
  }, []);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const body = {
      fullName: form.get("fullName"),
      phone: form.get("phone"),
      email: form.get("email"),
      deliveryAddress: form.get("deliveryAddress"),
      deliveryTown: form.get("deliveryTown"),
      deliveryInstructions: form.get("deliveryInstructions"),
      paymentMethod: form.get("paymentMethod"),
      items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "We couldn’t place your order. Please try again.");
      clearCart();
      setConfirmation(result as OrderConfirmation);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) return <section className="section checkout-page"><p role="status">Loading checkout…</p></section>;
  if (confirmation) {
    return (
      <section className="section checkout-success">
        <span className="success-mark">✓</span><span className="eyebrow">Order received</span>
        <h1>Thank you for<br /><em>your order.</em></h1>
        <p>Your order <strong>{confirmation.orderNumber}</strong> is in. We’ll confirm your delivery details shortly.</p>
        <div className="success-total">Order total <strong>{formatKes(confirmation.totalAmount)}</strong></div>
        <p>Free delivery by <strong>{formatNairobiDate(new Date(confirmation.expectedDeliveryAt))}</strong> at the latest.</p>
        <p>Payment remains pending until received and recorded by Puredrie Foods.</p>
        <Link href="/shop" className="button button-dark">Back to the shop <span>↗</span></Link>
      </section>
    );
  }
  if (!items.length) {
    return (
      <section className="section checkout-page empty-state">
        <h1>Your bag is empty.</h1><p>Add something delicious before checkout.</p>
        <Link className="button button-dark" href="/shop">Explore the shop <span>↗</span></Link>
      </section>
    );
  }

  return (
    <section className="section checkout-page">
      <div className="shop-intro"><span className="eyebrow">Just a few details</span><h1>Make it <em>yours.</em></h1></div>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submitOrder}>
          <h2>Delivery details</h2>
          {error && <p className="form-alert" role="alert">{error}</p>}
          <label className="field-label" htmlFor="fullName">Full name</label>
          <input className="form-control" id="fullName" name="fullName" autoComplete="name" minLength={2} maxLength={100} required />
          <div className="form-row">
            <div><label className="field-label" htmlFor="phone">Phone number</label><input className="form-control" id="phone" name="phone" type="tel" autoComplete="tel" minLength={7} maxLength={20} required /></div>
            <div><label className="field-label" htmlFor="email">Email <span>(optional)</span></label><input className="form-control" id="email" name="email" type="email" autoComplete="email" maxLength={254} /></div>
          </div>
          <label className="field-label" htmlFor="deliveryAddress">Delivery address</label>
          <textarea className="form-control" id="deliveryAddress" name="deliveryAddress" autoComplete="street-address" rows={3} minLength={5} maxLength={500} required />
          <label className="field-label" htmlFor="deliveryTown">Town or area</label>
          <input className="form-control" id="deliveryTown" name="deliveryTown" autoComplete="address-level2" minLength={2} maxLength={100} required />
          <label className="field-label" htmlFor="deliveryInstructions">Delivery instructions <span>(optional)</span></label>
          <textarea className="form-control" id="deliveryInstructions" name="deliveryInstructions" rows={2} maxLength={500} />
          <label className="field-label" htmlFor="paymentMethod">Payment method</label>
          <select className="form-control" id="paymentMethod" name="paymentMethod" defaultValue="MPESA">
            <option value="MPESA">M-Pesa (we’ll confirm payment manually)</option>
            <option value="CASH">Cash</option>
            <option value="CHEQUE">Cheque (subject to clearance)</option>
            {availableCredit > 0 && <option value="CREDIT">Approved customer credit (available: {formatKes(availableCredit)})</option>}
          </select>
          {creditError && <p className="form-hint" role="status">{creditError}</p>}
          <div className="delivery-promise"><strong>Free delivery</strong><span>Expected by {expectedDeliveryDateLabel()} (six calendar days, weekends included).</span></div>
          <button className="button button-dark full-button" type="submit" disabled={submitting}>
            {submitting ? "Placing your order…" : "Place order"} {!submitting && <span>↗</span>}
          </button>
          <Link href="/cart" className="underlined-link">← Back to your bag</Link>
        </form>
        <aside className="order-summary checkout-summary">
          <h2>Your order</h2>
          {items.map((item) => (
            <div className="summary-item" key={item.variantId}>
              <span>{item.name} <small>{item.variantName} · {item.quantity}</small></span>
              <strong>{formatKes(item.price * item.quantity)}</strong>
            </div>
          ))}
          <div><span>Subtotal</span><strong>{formatKes(subtotal)}</strong></div>
          <div><span>Delivery</span><strong>Free</strong></div>
          <div className="summary-total"><strong>Total</strong><strong>{formatKes(subtotal)}</strong></div>
          <p>Free delivery within six calendar days. Enquiries: {BRAND.phones.map((item) => item.display).join(" / ")}.</p>
        </aside>
      </div>
    </section>
  );
}

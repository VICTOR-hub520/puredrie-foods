"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatKes } from "@/lib/money";

export default function CartPage() {
  const { items, subtotal, setQuantity, removeItem, hydrated } = useCart();
  const [removing, setRemoving] = useState<string | null>(null);

  if (!hydrated) return <section className="section cart-page"><p role="status">Loading your bag…</p></section>;

  return (
    <section className="section cart-page">
      <div className="shop-intro">
        <span className="eyebrow">Your good stuff</span>
        <h1>Your <em>shopping bag.</em></h1>
      </div>
      {!items.length ? (
        <div className="empty-state cart-empty">
          <span className="empty-icon">✳</span><h2>Your bag is taking a little breather.</h2>
          <p>Find something delicious to bring along.</p>
          <Link className="button button-dark" href="/shop">Explore the shop <span>↗</span></Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-lines">
            {items.map((item) => (
              <article className="cart-line" key={item.variantId}>
                <Link href={`/shop/${item.slug}`} className="cart-line-image" style={{ backgroundImage: `url("${item.image}")` }} aria-label={item.name} />
                <div className="cart-line-info">
                  <Link href={`/shop/${item.slug}`}><h2>{item.name}</h2></Link>
                  <p>{item.variantName}</p>
                  <span>{formatKes(item.price)}</span>
                </div>
                <label className="quantity-control">
                  <span className="visually-hidden">Quantity of {item.name}</span>
                  <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => setQuantity(item.variantId, item.quantity - 1)}>−</button>
                  <span>{item.quantity}</span>
                  <button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => setQuantity(item.variantId, item.quantity + 1)}>+</button>
                </label>
                <strong className="line-total">{formatKes(item.price * item.quantity)}</strong>
                <button
                  type="button"
                  className="remove-button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => {
                    if (window.confirm(`Remove ${item.name} from your bag?`)) {
                      setRemoving(item.variantId);
                      removeItem(item.variantId);
                    }
                  }}
                >
                  {removing === item.variantId ? "Removed" : "Remove"}
                </button>
              </article>
            ))}
            <Link href="/shop" className="underlined-link cart-continue">← Keep browsing</Link>
          </div>
          <aside className="order-summary">
            <h2>Order summary</h2>
            <div><span>Subtotal</span><strong>{formatKes(subtotal)}</strong></div>
            <div><span>Delivery</span><strong>Free</strong></div>
            <div><span>Total</span><strong>{formatKes(subtotal)}</strong></div>
            <p>Free delivery on every order. We deliver within six calendar days.</p>
            <Link className="button button-dark full-button" href="/checkout">Continue to checkout <span>↗</span></Link>
            <span className="secure-note">✳ Safe, simple checkout</span>
          </aside>
        </div>
      )}
    </section>
  );
}

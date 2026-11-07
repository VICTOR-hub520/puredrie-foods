"use client";

import { useEffect, useState, type FormEvent } from "react";

type Product = {
  id: string;
  name: string;
  variants: { id: string; label: string; price: number }[];
};
type OrderLine = { variantId: string; quantity: number };

export function ManualOrderForm() {
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<OrderLine[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/products", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load products.");
        if (active) {
          setProducts(result as Product[]);
          const firstVariant = (result as Product[]).find((product) => product.variants.length)?.variants[0];
          if (firstVariant) setItems([{ variantId: firstVariant.id, quantity: 1 }]);
        }
      })
      .catch((issue: unknown) => {
        if (active) setError(issue instanceof Error ? issue.message : "Could not load products.");
      });
    return () => { active = false; };
  }, []);

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setError("");
    setMessage("");
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          phone: form.get("phone"),
          email: form.get("email"),
          deliveryAddress: form.get("deliveryAddress"),
          deliveryTown: form.get("deliveryTown"),
          deliveryInstructions: form.get("deliveryInstructions"),
          orderSource: form.get("orderSource"),
          paymentMethod: form.get("paymentMethod"),
          items,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create the order.");
      setMessage(`Order ${result.orderNumber} created. It is now in the order list.`);
      window.dispatchEvent(new Event("puredrie:orders-updated"));
      formElement.reset();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not create the order.");
    } finally {
      setSaving(false);
    }
  }

  const variants = products.flatMap((product) =>
    product.variants.map((variant) => ({ ...variant, productName: product.name })),
  );
  return (
    <details className="admin-card manual-order-card">
      <summary className="admin-card-heading"><div><span className="eyebrow">WhatsApp, phone, social or in person</span><h2>Record an order</h2></div></summary>
      <form className="manual-order-form" onSubmit={createOrder}>
        {error && <p className="form-alert" role="alert">{error}</p>}
        {message && <p className="success-alert" role="status">{message}</p>}
        <div className="form-row">
          <label>Customer name<input className="form-control" name="fullName" minLength={2} maxLength={100} required /></label>
          <label>Phone<input className="form-control" name="phone" type="tel" minLength={7} maxLength={20} required /></label>
          <label>Email (optional)<input className="form-control" name="email" type="email" maxLength={254} /></label>
        </div>
        <div className="form-row">
          <label>Order source<select className="form-control" name="orderSource" defaultValue="WHATSAPP"><option value="WHATSAPP">WhatsApp</option><option value="PHONE">Phone call</option><option value="SOCIAL_MEDIA">Social media</option><option value="IN_PERSON">In person</option><option value="OTHER">Other</option></select></label>
          <label>Payment method<select className="form-control" name="paymentMethod" defaultValue="MPESA"><option value="MPESA">M-Pesa</option><option value="CASH">Cash</option><option value="CHEQUE">Cheque</option></select></label>
        </div>
        <label>Delivery address<textarea className="form-control" name="deliveryAddress" minLength={5} maxLength={500} required /></label>
        <div className="form-row">
          <label>Town or area<input className="form-control" name="deliveryTown" minLength={2} maxLength={100} required /></label>
          <label>Delivery instructions (optional)<input className="form-control" name="deliveryInstructions" maxLength={500} /></label>
        </div>
        <div className="manual-order-lines">
          <div className="admin-card-heading"><h3>Products</h3><button className="text-button" type="button" disabled={!variants.length} onClick={() => setItems([...items, { variantId: variants[0]?.id ?? "", quantity: 1 }])}>Add a product line +</button></div>
          {items.map((item, index) => (
            <div className="manual-order-line" key={index}>
              <label>Package<select className="form-control" value={item.variantId} onChange={(event) => setItems(items.map((line, lineIndex) => lineIndex === index ? { ...line, variantId: event.target.value } : line))} required>
                {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.productName} · {variant.label} · KSh {variant.price}</option>)}
              </select></label>
              <label>Quantity<input className="form-control" type="number" min={1} max={50} step={1} value={item.quantity} onChange={(event) => setItems(items.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: Number(event.target.value) } : line))} required /></label>
              {items.length > 1 && <button className="text-button" type="button" aria-label="Remove product line" onClick={() => setItems(items.filter((_, lineIndex) => lineIndex !== index))}>Remove</button>}
            </div>
          ))}
        </div>
        <p>Prices use the current approved package price. Delivery is free within six calendar days. Record received payments separately.</p>
        <button className="button button-dark" type="submit" disabled={saving || !items.length || !variants.length}>{saving ? "Creating…" : "Create order"}</button>
      </form>
    </details>
  );
}

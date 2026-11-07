"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatKes } from "@/lib/money";

type Product = {
  id: string;
  name: string;
  slug: string;
  image: string;
  variants: { id: string; label: string; price: number }[];
};

export function ProductActions({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [selectedId, setSelectedId] = useState(product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const variant = product.variants.find((item) => item.id === selectedId);

  return (
    <div className="product-detail-actions">
      <label className="field-label" htmlFor="package-size">Choose your size</label>
      <select id="package-size" className="form-control" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
        {product.variants.map((item) => (
          <option value={item.id} key={item.id}>{item.label} — {formatKes(item.price)}</option>
        ))}
      </select>
      <label className="field-label" htmlFor="package-quantity">Quantity</label>
      <input id="package-quantity" className="form-control quantity-input" type="number" min={1} max={50} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(50, Number(event.target.value) || 1)))} />
      <button
        className="button button-dark full-button"
        type="button"
        disabled={!variant}
        onClick={() => {
          if (!variant) return;
          for (let count = 0; count < quantity; count += 1) addItem({
            variantId: variant.id,
            productId: product.id,
            name: product.name,
            variantName: variant.label,
            slug: product.slug,
            image: product.image,
            price: variant.price,
          });
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1800);
        }}
      >
        {added ? "Added to your bag ✓" : "Add to bag — " + (variant ? formatKes(variant.price) : "")}
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatKes } from "@/lib/money";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  category: string;
  variants: { id: string; label: string; price: number }[];
};

type Variant = Product["variants"][number];

export function ProductCard({ product, variant }: { product: Product; variant?: Variant }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [selectedId, setSelectedId] = useState(product.variants[0]?.id ?? "");
  const selectedVariant = variant ?? product.variants.find((item) => item.id === selectedId);
  if (!selectedVariant) return null;

  function addToCart() {
    if (!selectedVariant) return;
    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      name: product.name,
      variantName: selectedVariant.label,
      slug: product.slug,
      image: product.image,
      price: selectedVariant.price,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <article className="product-card">
      <Link href={`/shop/${product.slug}`} className="product-image-link" aria-label={`View ${product.name}`}>
        <div className="product-image" style={{ backgroundImage: `url("${product.image}")` }} />
        <span className="product-tag">{product.category}</span>
      </Link>
      <div className="product-info">
        <div className="product-heading">
          <Link href={`/shop/${product.slug}`}><h3>{product.name}</h3></Link>
          <span>{formatKes(selectedVariant.price)}</span>
        </div>
        <p>{product.description}</p>
        <div className="product-action">
          {variant ? (
            <div className="product-sizes">
              <span className="product-size product-size-selected product-size-static" aria-label={`${variant.label} pack`}>{variant.label}</span>
            </div>
          ) : (
            <div className="product-sizes" role="group" aria-label={`Choose a package size for ${product.name}`}>
              {product.variants.map((item) => (
              <button
                type="button"
                className={`product-size${item.id === selectedId ? " product-size-selected" : ""}`}
                aria-pressed={item.id === selectedId}
                onClick={() => setSelectedId(item.id)}
                key={item.id}
              >
                <span>{item.label}</span><small>{formatKes(item.price)}</small>
              </button>
              ))}
            </div>
          )}
          <button type="button" className="text-button" onClick={addToCart}>
            {added ? "Added ✓" : "Add to Cart +"}
          </button>
        </div>
        <Link className="product-detail-link" href={`/shop/${product.slug}`}>View Details ↗</Link>
      </div>
    </article>
  );
}

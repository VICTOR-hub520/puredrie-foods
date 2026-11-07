"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { expandCatalogVariants } from "@/lib/catalog";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  category: string;
  variants: { id: string; label: string; price: number }[];
};

export function Catalog({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All products");
  const [sort, setSort] = useState("featured");
  const categories = useMemo(
    () => ["All products", ...new Set(products.map((product) => product.category))],
    [products],
  );
  const filtered = expandCatalogVariants(products).filter(({ product, variant }) => {
    const matchesText = `${product.name} ${product.description} ${variant.label}`.toLowerCase().includes(query.toLowerCase());
    return matchesText && (category === "All products" || category === product.category);
  });
  if (sort === "name") filtered.sort((a, b) => a.product.name.localeCompare(b.product.name) || a.variant.label.localeCompare(b.variant.label));
  if (sort === "price-low" || sort === "price-high") {
    filtered.sort((a, b) => {
      const difference = a.variant.price - b.variant.price;
      return sort === "price-low" ? difference : -difference;
    });
  }

  return (
    <>
      <div className="catalog-tools">
        <label className="search-field">
          <span className="visually-hidden">Search products</span>
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find your favourite..." />
        </label>
        <div className="catalog-selects">
          <label className="filter-field">
            <span className="visually-hidden">Filter by category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="filter-field">
            <span className="visually-hidden">Sort products</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="featured">Featured</option>
              <option value="name">Name A–Z</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </label>
        </div>
      </div>
      {filtered.length ? (
        <div className="product-grid">
          {filtered.map(({ product, variant }) => (
            <ProductCard key={`${product.id}-${variant.id}`} product={product} variant={variant} />
          ))}
        </div>
      ) : (
        <div className="empty-state"><h2>No products found</h2><p>Try another search or choose a different category.</p></div>
      )}
    </>
  );
}

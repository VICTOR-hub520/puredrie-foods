"use client";

import { useEffect, useState, type FormEvent } from "react";

type Variant = { id?: string; label: string; weightGrams: string; amount: string; isCustom: boolean };
type Product = {
  id: string;
  name: string;
  description: string;
  image: string;
  isActive: boolean;
  variants: Variant[];
};

async function loadProducts(): Promise<Product[]> {
  const response = await fetch("/api/admin/products", { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not load products.");
  return (result as (Omit<Product, "variants"> & { variants: (Omit<Variant, "amount"> & { price: string | null })[] })[])
    .map((product) => ({
      ...product,
      variants: product.variants.map(({ price, ...variant }) => ({ ...variant, amount: price ?? "" })),
    }));
}

export function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [selectedImages, setSelectedImages] = useState<Record<string, File>>({});
  const [uploadingImageId, setUploadingImageId] = useState("");

  useEffect(() => {
    let active = true;
    loadProducts()
      .then((result) => { if (active) setProducts(result); })
      .catch((issue: unknown) => { if (active) setError(issue instanceof Error ? issue.message : "Could not load products."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function updateProduct(productId: string, update: Partial<Product>) {
    setProducts((current) => current.map((product) => product.id === productId ? { ...product, ...update } : product));
  }

  function updateVariant(product: Product, index: number, update: Partial<Variant>) {
    updateProduct(product.id, {
      variants: product.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, ...update } : variant),
    });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>, product: Product) {
    event.preventDefault();
    setSavingId(product.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          description: product.description,
          image: product.image,
          isActive: product.isActive,
          variants: product.variants.map((variant) => ({
            ...variant,
            weightGrams: Number(variant.weightGrams),
            amount: Number(variant.amount),
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save product.");
      const saved = await loadProducts();
      setProducts(saved);
      setMessage(`${product.name} saved. Price changes retain historical order prices.`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not save product.");
    } finally {
      setSavingId("");
    }
  }

  async function uploadProductImage(product: Product) {
    const image = selectedImages[product.id];
    if (!image) return;

    setUploadingImageId(product.id);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("image", image);
      const response = await fetch(`/api/admin/products/${product.id}/image`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not upload product image.");
      updateProduct(product.id, { image: result.image });
      setSelectedImages((current) => {
        const next = { ...current };
        delete next[product.id];
        return next;
      });
      setMessage(`Image for ${product.name} uploaded.`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not upload product image.");
    } finally {
      setUploadingImageId("");
    }
  }

  if (loading) return <p className="admin-loading" role="status">Loading products…</p>;
  return (
    <>
      {error && <p className="form-alert" role="alert">{error}</p>}
      {message && <p className="success-alert" role="status">{message}</p>}
      <div className="product-admin-list">
        {products.map((product) => (
          <details className="admin-card product-admin-card" key={product.id}>
            <summary><span className="product-admin-summary"><span><span className="eyebrow">{product.isActive ? "Active product" : "Hidden product"}</span><strong>{product.name}</strong></span><span>{product.variants.length} package(s)</span></span></summary>
            <form className="product-admin-form" onSubmit={(event) => saveProduct(event, product)}>
              <label>Product name<input className="form-control" value={product.name} onChange={(event) => updateProduct(product.id, { name: event.target.value })} minLength={2} maxLength={120} required /></label>
              <label>Description<textarea className="form-control" value={product.description} onChange={(event) => updateProduct(product.id, { description: event.target.value })} minLength={2} maxLength={1000} required /></label>
              <div className="product-image-upload">
                <div className="product-image-preview" role="img" aria-label={`${product.name} current image`} style={{ backgroundImage: `url("${product.image}")` }} />
                <div className="product-image-upload-controls">
                  <label>Upload product image<input className="form-control" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setSelectedImages((current) => ({ ...current, [product.id]: file }));
                  }} /><small>JPEG, PNG, or WebP; maximum 5 MB.</small></label>
                  {selectedImages[product.id] && <small className="product-image-filename">{selectedImages[product.id].name}</small>}
                  <button className="button button-outline" type="button" disabled={!selectedImages[product.id] || uploadingImageId === product.id} onClick={() => uploadProductImage(product)}>
                    {uploadingImageId === product.id ? "Uploading…" : "Upload image"}
                  </button>
                </div>
              </div>
              <label>Image path or URL<input className="form-control" value={product.image} onChange={(event) => updateProduct(product.id, { image: event.target.value })} maxLength={500} required /><small>Use a path in /public (for example /images/mango.svg) or an approved image URL.</small></label>
              <label className="product-active-toggle"><input type="checkbox" checked={product.isActive} onChange={(event) => updateProduct(product.id, { isActive: event.target.checked })} /> Available in the shop</label>
              <div className="product-admin-variants">
                <div className="admin-card-heading"><h3>Package prices</h3><button className="text-button" type="button" onClick={() => updateProduct(product.id, { variants: [...product.variants, { label: "", weightGrams: "100", amount: "", isCustom: true }] })}>Add custom package +</button></div>
                {product.variants.map((variant, index) => (
                  <div className="product-admin-variant" key={variant.id ?? `new-${index}`}>
                    <label>Package label<input className="form-control" value={variant.label} onChange={(event) => updateVariant(product, index, { label: event.target.value })} maxLength={40} placeholder="e.g. 250g custom" required /></label>
                    <label>Weight (g)<input className="form-control" type="number" value={variant.weightGrams} onChange={(event) => updateVariant(product, index, { weightGrams: event.target.value })} min="1" max="100000" step="0.001" required /></label>
                    <label>Price (KSh)<input className="form-control" type="number" value={variant.amount} onChange={(event) => updateVariant(product, index, { amount: event.target.value })} min="0.01" max="100000000" step="0.01" required /></label>
                    {!variant.id && <button className="text-button" type="button" onClick={() => updateProduct(product.id, { variants: product.variants.filter((_, variantIndex) => variantIndex !== index) })}>Remove</button>}
                  </div>
                ))}
              </div>
              <button className="button button-dark" type="submit" disabled={savingId === product.id}>{savingId === product.id ? "Saving…" : "Save product"}</button>
            </form>
          </details>
        ))}
      </div>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Variant = { id: string; label: string; weightGrams: string };
type Product = { id: string; name: string; variants: Variant[] };
type Batch = {
  id: string;
  batchNumber: string | null;
  quantityRemaining: string;
  receivedAt: string;
  supplierName: string | null;
};
type InventoryItem = {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantLabel: string | null;
  weightGrams: string | null;
  inventoryType: "BULK" | "FINISHED" | string;
  unit: string;
  onHand: string;
  reorderLevel: string;
  batches: Batch[];
};
type Movement = {
  id: string;
  movementType: string;
  quantity: string;
  unit: string;
  itemName: string;
  batchNumber: string | null;
  note: string | null;
  createdAt: string;
};
type InventoryData = { inventory: InventoryItem[]; products: Product[]; movements: Movement[] };

function amount(value: string) {
  return Number(value).toLocaleString("en-KE", { maximumFractionDigits: 3 });
}

export function InventoryManager() {
  const [data, setData] = useState<InventoryData>({ inventory: [], products: [], movements: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [productId, setProductId] = useState("");
  const [inventoryType, setInventoryType] = useState<"BULK" | "FINISHED">("BULK");
  const [variantId, setVariantId] = useState("");
  const [receiveItemId, setReceiveItemId] = useState("");
  const [adjustItemId, setAdjustItemId] = useState("");
  const [adjustBatchId, setAdjustBatchId] = useState("");
  const [packageProductId, setPackageProductId] = useState("");
  const [packageVariantId, setPackageVariantId] = useState("");
  const [packageInventoryId, setPackageInventoryId] = useState("");
  const [packageBatchId, setPackageBatchId] = useState("");
  const [reorderValues, setReorderValues] = useState<Record<string, string>>({});

  async function loadInventory(): Promise<InventoryData> {
    const response = await fetch("/api/admin/inventory", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load inventory.");
    return result as InventoryData;
  }

  useEffect(() => {
    let active = true;
    loadInventory()
      .then((result) => { if (active) setData(result); })
      .catch((issue: unknown) => { if (active) setError(issue instanceof Error ? issue.message : "Could not load inventory."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selectedProduct = data.products.find((product) => product.id === productId);
  const packageProduct = data.products.find((product) => product.id === packageProductId);
  const packageBulkItems = data.inventory.filter((item) => item.productId === packageProductId && item.inventoryType === "BULK");
  const receiveItem = data.inventory.find((item) => item.id === receiveItemId);
  const adjustItem = data.inventory.find((item) => item.id === adjustItemId);
  const packageItem = data.inventory.find((item) => item.id === packageInventoryId);
  const adjustUnbatched = adjustItem
    ? Number(adjustItem.onHand) - adjustItem.batches.reduce((total, batch) => total + Number(batch.quantityRemaining), 0)
    : 0;
  const packageUnbatched = packageItem
    ? Number(packageItem.onHand) - packageItem.batches.reduce((total, batch) => total + Number(batch.quantityRemaining), 0)
    : 0;
  const lowStockCount = useMemo(
    () => data.inventory.filter((item) => Number(item.onHand) <= Number(item.reorderLevel)).length,
    [data.inventory],
  );

  async function refresh() {
    const result = await loadInventory();
    setData(result);
    setReorderValues(Object.fromEntries(result.inventory.map((item) => [item.id, item.reorderLevel])));
  }

  async function submitAction(event: FormEvent<HTMLFormElement>, body: Record<string, unknown>, successMessage: string) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update inventory.");
      await refresh();
      setMessage(successMessage);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not update inventory.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPackaging(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/inventory/package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: packageProductId,
          variantId: packageVariantId,
          inputInventoryId: packageInventoryId,
          batchId: packageBatchId || null,
          quantity: Number(form.get("quantity")),
          packagingLoss: Number(form.get("packagingLoss")),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not complete packaging.");
      await refresh();
      setMessage(result.message ?? "Packaging completed.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not complete packaging.");
    } finally {
      setBusy(false);
    }
  }

  async function saveReorderLevel(event: FormEvent<HTMLFormElement>, item: InventoryItem) {
    await submitAction(event, {
      action: "reorder",
      inventoryId: item.id,
      reorderLevel: Number(reorderValues[item.id] ?? item.reorderLevel),
    }, `Reorder level saved for ${item.productName}.`);
  }

  if (loading) return <p className="admin-loading" role="status">Loading inventory…</p>;

  return (
    <>
      {error && <p className="form-alert" role="alert">{error}</p>}
      {message && <p className="success-alert" role="status">{message}</p>}

      <section className="metric-grid inventory-metrics" aria-label="Inventory overview">
        <article className="metric-card"><span>Stock items</span><strong>{data.inventory.length}</strong><small>Bulk and finished goods</small></article>
        <article className="metric-card metric-highlight"><span>At or below reorder level</span><strong>{lowStockCount}</strong><small>Review the stock list below</small></article>
      </section>

      <div className="inventory-workflows">
        <section className="admin-card">
          <div className="admin-card-heading"><div><span className="eyebrow">Set up tracking</span><h2>Add stock item</h2></div></div>
          <form className="inventory-form" onSubmit={(event) => submitAction(event, {
            action: "create",
            productId,
            inventoryType,
            variantId: inventoryType === "FINISHED" ? variantId : null,
            reorderLevel: Number(new FormData(event.currentTarget).get("reorderLevel")),
          }, "Stock item created.")}>
            <label>Product<select className="form-control" value={productId} onChange={(event) => { setProductId(event.target.value); setVariantId(""); }} required>
              <option value="">Select product</option>{data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select></label>
            <label>Stock type<select className="form-control" value={inventoryType} onChange={(event) => { const type = event.target.value as "BULK" | "FINISHED"; setInventoryType(type); setVariantId(""); }}><option value="BULK">Bulk ingredient (g)</option><option value="FINISHED">Finished packages (units)</option></select></label>
            {inventoryType === "FINISHED" && <label>Package<select className="form-control" value={variantId} onChange={(event) => setVariantId(event.target.value)} required>
              <option value="">Select package</option>{selectedProduct?.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
            </select></label>}
            <label>Reorder level ({inventoryType === "BULK" ? "g" : "units"})<input className="form-control" name="reorderLevel" type="number" min="0" max="999999999" step="0.001" defaultValue="0" required /></label>
            <button className="button button-dark" type="submit" disabled={busy || !productId || (inventoryType === "FINISHED" && !variantId)}>{busy ? "Saving…" : "Create stock item"}</button>
          </form>
        </section>

        <section className="admin-card">
          <div className="admin-card-heading"><div><span className="eyebrow">Record incoming stock</span><h2>Receive stock</h2></div></div>
          <form className="inventory-form" onSubmit={(event) => {
            const form = new FormData(event.currentTarget);
            return submitAction(event, {
              action: "receive",
              inventoryId: receiveItemId,
              amount: Number(form.get("amount")),
              batchNumber: form.get("batchNumber"),
              note: form.get("note"),
            }, "Stock received and batch recorded.");
          }}>
            <label>Stock item<select className="form-control" value={receiveItemId} onChange={(event) => setReceiveItemId(event.target.value)} required>
              <option value="">Select stock item</option>{data.inventory.map((item) => <option key={item.id} value={item.id}>{item.productName}{item.variantLabel ? ` · ${item.variantLabel}` : ""} ({item.unit})</option>)}
            </select></label>
            <label>Quantity ({receiveItem?.unit ?? "unit"})<input className="form-control" name="amount" type="number" min="0.001" max="999999999" step="0.001" required /></label>
            <label>Batch number<input className="form-control" name="batchNumber" maxLength={100} /></label>
            <label>Note<input className="form-control" name="note" maxLength={500} /></label>
            <button className="button button-dark" type="submit" disabled={busy || !receiveItemId}>{busy ? "Saving…" : "Receive stock"}</button>
          </form>
        </section>

        <section className="admin-card">
          <div className="admin-card-heading"><div><span className="eyebrow">Correct stock counts</span><h2>Adjust stock</h2></div></div>
          <form className="inventory-form" onSubmit={(event) => {
            const form = new FormData(event.currentTarget);
            return submitAction(event, {
              action: "adjust",
              inventoryId: adjustItemId,
              delta: Number(form.get("delta")),
              batchId: Number(form.get("delta")) < 0 ? adjustBatchId || null : null,
              note: form.get("note"),
            }, "Stock adjustment recorded.");
          }}>
            <label>Stock item<select className="form-control" value={adjustItemId} onChange={(event) => { setAdjustItemId(event.target.value); setAdjustBatchId(""); }} required>
              <option value="">Select stock item</option>{data.inventory.map((item) => <option key={item.id} value={item.id}>{item.productName}{item.variantLabel ? ` · ${item.variantLabel}` : ""} ({item.unit})</option>)}
            </select></label>
            <label>Change (+ or − {adjustItem?.unit ?? "unit"})<input className="form-control" name="delta" type="number" min="-999999999" max="999999999" step="0.001" placeholder="e.g. -25 or 10" required /></label>
            <label>Reduce from batch<select className="form-control" value={adjustBatchId} onChange={(event) => setAdjustBatchId(event.target.value)}>
              <option value="">Unbatched balance ({amount(String(Math.max(adjustUnbatched, 0)))})</option>{adjustItem?.batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchNumber || "Unlabelled batch"} · {amount(batch.quantityRemaining)} {adjustItem.unit}</option>)}
            </select></label>
            <label>Reason<input className="form-control" name="note" minLength={2} maxLength={500} placeholder="Required for audit clarity" required /></label>
            <button className="button button-dark" type="submit" disabled={busy || !adjustItemId}>{busy ? "Saving…" : "Record adjustment"}</button>
          </form>
        </section>

        <section className="admin-card">
          <div className="admin-card-heading"><div><span className="eyebrow">Prepare sale-ready stock</span><h2>Package product</h2></div></div>
          <form className="inventory-form" onSubmit={submitPackaging}>
            <label>Product<select className="form-control" value={packageProductId} onChange={(event) => { setPackageProductId(event.target.value); setPackageVariantId(""); setPackageInventoryId(""); setPackageBatchId(""); }} required>
              <option value="">Select product</option>{data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select></label>
            <label>Package size<select className="form-control" value={packageVariantId} onChange={(event) => setPackageVariantId(event.target.value)} required>
              <option value="">Select package</option>{packageProduct?.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label} ({amount(variant.weightGrams)} g)</option>)}
            </select></label>
            <label>Bulk stock source<select className="form-control" value={packageInventoryId} onChange={(event) => { setPackageInventoryId(event.target.value); setPackageBatchId(""); }} required>
              <option value="">Select bulk stock</option>{packageBulkItems.map((item) => <option key={item.id} value={item.id}>{amount(item.onHand)} g total</option>)}
            </select></label>
            <label>Source batch<select className="form-control" value={packageBatchId} onChange={(event) => setPackageBatchId(event.target.value)}>
              <option value="">Unbatched stock ({amount(String(Math.max(packageUnbatched, 0)))} g)</option>{packageItem?.batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchNumber || "Unlabelled batch"} · {amount(batch.quantityRemaining)} g</option>)}
            </select></label>
            <label>Packages to make<input className="form-control" name="quantity" type="number" min="1" max="100000" step="1" required /></label>
            <label>Packaging loss (g)<input className="form-control" name="packagingLoss" type="number" min="0" max="999999999" step="0.001" defaultValue="0" required /></label>
            <p className="form-hint inventory-form-hint">Bulk consumption is calculated from package weight × quantity, plus recorded loss. Stock is deducted once and finished stock is increased in the same transaction.</p>
            <button className="button button-dark" type="submit" disabled={busy || !packageProductId || !packageVariantId || !packageInventoryId}>{busy ? "Packaging…" : "Complete packaging"}</button>
          </form>
        </section>
      </div>

      <section className="admin-card inventory-stock-card">
        <div className="admin-card-heading"><div><span className="eyebrow">Current balances</span><h2>Stock on hand</h2></div></div>
        {data.inventory.length ? <div className="table-scroll"><table className="admin-table">
          <thead><tr><th>Item</th><th>Type</th><th>On hand</th><th>Reorder level</th><th>Available batches</th><th>Update reorder level</th></tr></thead>
          <tbody>{data.inventory.map((item) => (
            <tr key={item.id}>
              <td>{item.productName}{item.variantLabel ? ` · ${item.variantLabel}` : ""}</td>
              <td>{item.inventoryType === "BULK" ? "Bulk" : "Finished"}</td>
              <td>{amount(item.onHand)} {item.unit}</td>
              <td><span className={Number(item.onHand) <= Number(item.reorderLevel) ? "inventory-low-stock" : ""}>{amount(item.reorderLevel)} {item.unit}</span></td>
              <td>{item.batches.length ? item.batches.map((batch) => `${batch.batchNumber || "Unlabelled"}: ${amount(batch.quantityRemaining)}`).join(" · ") : "No batch stock"}</td>
              <td><form className="inventory-reorder-form" onSubmit={(event) => saveReorderLevel(event, item)}>
                <input className="form-control" aria-label={`Reorder level for ${item.productName}`} type="number" min="0" max="999999999" step="0.001" value={reorderValues[item.id] ?? item.reorderLevel} onChange={(event) => setReorderValues((values) => ({ ...values, [item.id]: event.target.value }))} />
                <button className="text-button" type="submit" disabled={busy}>Save</button>
              </form></td>
            </tr>
          ))}</tbody>
        </table></div> : <div className="admin-empty"><h3>No stock items yet</h3><p>Create a bulk or finished stock item to start tracking inventory.</p></div>}
      </section>

      <section className="admin-card inventory-stock-card">
        <div className="admin-card-heading"><div><span className="eyebrow">Audit trail</span><h2>Recent stock movements</h2></div></div>
        {data.movements.length ? <div className="table-scroll"><table className="admin-table">
          <thead><tr><th>Date</th><th>Item</th><th>Movement</th><th>Quantity</th><th>Batch</th><th>Note</th></tr></thead>
          <tbody>{data.movements.map((movement) => (
            <tr key={movement.id}>
              <td>{new Date(movement.createdAt).toLocaleString("en-KE")}</td><td>{movement.itemName}</td><td>{movement.movementType.replaceAll("_", " ").toLowerCase()}</td>
              <td>{Number(movement.quantity) > 0 ? "+" : ""}{amount(movement.quantity)} {movement.unit}</td><td>{movement.batchNumber ?? "—"}</td><td>{movement.note ?? "—"}</td>
            </tr>
          ))}</tbody>
        </table></div> : <div className="admin-empty"><h3>No stock movements yet</h3><p>Receipts, adjustments, and packaging runs will be recorded here.</p></div>}
      </section>
    </>
  );
}

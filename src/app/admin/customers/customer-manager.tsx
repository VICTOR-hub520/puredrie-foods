"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatKes } from "@/lib/money";

type Customer = {
  id: string;
  hasAccount: boolean;
  fullName: string;
  email: string | null;
  phone: string;
  createdAt: string;
  orderCount: number;
  availableCredit: string;
  creditTerms: { isApproved: boolean; creditLimit: string; paymentTermDays: number; notes: string | null } | null;
};

export function CustomerManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");

  async function loadCustomers(): Promise<Customer[]> {
    const response = await fetch("/api/admin/customers", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load customers.");
    return result as Customer[];
  }

  useEffect(() => {
    let active = true;
    loadCustomers()
      .then((result) => { if (active) setCustomers(result); })
      .catch((issue: unknown) => { if (active) setError(issue instanceof Error ? issue.message : "Could not load customers."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function saveCredit(event: FormEvent<HTMLFormElement>, customer: Customer) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSavingId(customer.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/credit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isApproved: form.get("isApproved") === "on",
          creditLimit: Number(form.get("creditLimit")),
          paymentTermDays: Number(form.get("paymentTermDays")),
          notes: form.get("notes"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save customer credit terms.");
      setCustomers(await loadCustomers());
      setMessage(`Credit terms saved for ${customer.fullName}.`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not save customer credit terms.");
    } finally {
      setSavingId("");
    }
  }

  const visible = customers.filter((customer) =>
    `${customer.fullName} ${customer.email ?? ""} ${customer.phone}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <label className="customer-search"><span className="visually-hidden">Search customers</span><input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or phone…" /></label>
      {error && <p className="form-alert" role="alert">{error}</p>}
      {message && <p className="success-alert" role="status">{message}</p>}
      {loading ? <p className="admin-loading" role="status">Loading customers…</p> : visible.length ? (
        <div className="customer-admin-list">
          {visible.map((customer) => (
            <article className="admin-card customer-admin-card" key={customer.id}>
              <div className="customer-admin-heading"><div><h2>{customer.fullName}</h2><p>{customer.email ?? "No email"} · {customer.phone} · {customer.hasAccount ? "Registered account" : "Guest order profile"}</p></div><span>{customer.orderCount} order(s)</span></div>
              <p className="customer-credit-balance">Available approved credit: {formatKes(customer.availableCredit)}</p>
              {!customer.hasAccount && <p className="form-hint">Credit checkout is available only to customers with a registered account.</p>}
              <form className="customer-credit-form" onSubmit={(event) => saveCredit(event, customer)}>
                <label className="customer-credit-approved"><input name="isApproved" type="checkbox" defaultChecked={customer.creditTerms?.isApproved ?? false} disabled={!customer.hasAccount} /> Approve credit</label>
                <label>Credit limit<input className="form-control" name="creditLimit" type="number" min="0" max="100000000" step="0.01" defaultValue={customer.creditTerms?.creditLimit ?? "0"} required /></label>
                <label>Payment term (days)<input className="form-control" name="paymentTermDays" type="number" min="0" max="365" step="1" defaultValue={customer.creditTerms?.paymentTermDays ?? 0} required /></label>
                <label>Internal notes<input className="form-control" name="notes" maxLength={1000} defaultValue={customer.creditTerms?.notes ?? ""} /></label>
                <button className="button button-dark" type="submit" disabled={savingId === customer.id || !customer.hasAccount}>{savingId === customer.id ? "Saving…" : "Save terms"}</button>
              </form>
            </article>
          ))}
        </div>
      ) : <div className="admin-empty"><h3>No customers found</h3><p>Customers will appear here after they register or place an order.</p></div>}
    </>
  );
}

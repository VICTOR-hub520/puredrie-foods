"use client";

import { useEffect, useState } from "react";
import { formatKes } from "@/lib/money";

type Report = {
  totalRevenue: number;
  orderCount: number;
  daily: { date: string; revenue: number; orders: number }[];
  weekly: { date: string; revenue: number; orders: number }[];
  monthly: { date: string; revenue: number; orders: number }[];
  bestSellers: { name: string; quantity: number; revenue: number }[];
};

export function ReportsView() {
  const [report, setReport] = useState<Report | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/admin/reports?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load sales report.");
        setReport(result as Report);
      })
      .catch((issue: unknown) => {
        if (issue instanceof Error && issue.name !== "AbortError") setError(issue.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [from, to]);

  const series = report?.[period] ?? [];
  const maxRevenue = Math.max(1, ...series.map((item) => item.revenue));
  const exportParams = new URLSearchParams();
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);
  return (
    <>
      <div className="admin-filters report-filters">
        <label>From <input className="form-control" type="date" value={from} max={to || undefined} onChange={(event) => { setLoading(true); setError(""); setFrom(event.target.value); }} /></label>
        <label>To <input className="form-control" type="date" value={to} min={from || undefined} onChange={(event) => { setLoading(true); setError(""); setTo(event.target.value); }} /></label>
        <a className="button button-dark" href={`/api/admin/reports/csv?${exportParams}`}>Export orders CSV ↓</a>
      </div>
      {error && <p className="form-alert" role="alert">{error}</p>}
      {loading ? <p className="admin-loading" role="status">Loading report…</p> : report && (
        <>
          <div className="metric-grid report-metrics">
            <article className="metric-card"><span>Paid revenue</span><strong>{formatKes(report.totalRevenue)}</strong><small>For selected dates</small></article>
            <article className="metric-card"><span>Fully paid orders</span><strong>{report.orderCount}</strong><small>Orders settled in full</small></article>
            <article className="metric-card"><span>Top products</span><strong>{report.bestSellers.length}</strong><small>With paid sales</small></article>
          </div>
          <section className="admin-card">
            <div className="admin-card-heading"><div><span className="eyebrow">Only confirmed payments</span><h2>{period[0].toUpperCase() + period.slice(1)} sales</h2></div>
              <label className="report-period"><span className="visually-hidden">Sales report period</span><select className="form-control" value={period} onChange={(event) => setPeriod(event.target.value as typeof period)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
            </div>
            {series.length ? <div className="sales-bars">{series.map((item) => <div className="sales-bar" key={item.date} title={`${item.date}: ${formatKes(item.revenue)} (${item.orders} orders)`}><div style={{ height: `${Math.max(4, item.revenue / maxRevenue * 100)}%` }} /><span>{new Date(`${item.date}T00:00:00`).toLocaleDateString("en-KE", { day: "numeric", month: "short", ...(period === "monthly" ? { year: "2-digit" } : {}) })}</span></div>)}</div> : <div className="admin-empty"><h3>No paid orders in this period</h3><p>Sales will appear here after payment is recorded.</p></div>}
          </section>
          <section className="admin-card">
            <div className="admin-card-heading"><div><span className="eyebrow">By quantity sold</span><h2>Best-selling products</h2></div></div>
            {report.bestSellers.length ? <div className="table-scroll"><table className="admin-table"><thead><tr><th>Product</th><th>Units sold</th><th>Sales</th></tr></thead><tbody>{report.bestSellers.map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.quantity}</td><td>{formatKes(item.revenue)}</td></tr>)}</tbody></table></div> : <p className="admin-loading">No product sales to report yet.</p>}
          </section>
        </>
      )}
    </>
  );
}

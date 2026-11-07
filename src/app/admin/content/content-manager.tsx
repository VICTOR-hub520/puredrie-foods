"use client";

import { useEffect, useState } from "react";

type ContentItem = {
  key: string;
  title: string;
  body: string;
  isPublished: boolean;
};

export function ContentManager() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/content", { cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json();
        if (!response.ok) {
          const errorMessage = typeof result === "object" && result !== null && "error" in result
            ? String(result.error)
            : "Could not load brand content.";
          throw new Error(errorMessage);
        }
        if (!Array.isArray(result)) throw new Error("The brand content response was invalid.");
        if (active) setItems(result as ContentItem[]);
      })
      .catch((issue: unknown) => {
        if (active) setError(issue instanceof Error ? issue.message : "Could not load brand content.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function updateItem(key: string, changes: Partial<ContentItem>) {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...changes } : item));
    setMessage("");
  }

  async function saveContent() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save brand content.");
      setMessage(result.message);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not save brand content.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="admin-loading" role="status">Loading brand story…</p>;
  if (error && !items.length) return <p className="form-alert" role="alert">{error}</p>;

  return (
    <section className="content-editor">
      <p className="content-editor-note">Edit the brand story, mission and customer commitments shown on the public About and Our Story pages. The founder’s message starts unpublished so the business owner can add their own words before sharing it.</p>
      {message && <p className="success-alert" role="status">{message}</p>}
      {error && <p className="form-alert" role="alert">{error}</p>}
      {items.map((item) => (
        <article className="admin-card content-editor-item" key={item.key}>
          <div className="admin-card-heading">
            <div><span className="eyebrow">{item.key === "founder-message" ? "Editable founder content" : "Public brand content"}</span><h2>{item.title}</h2></div>
          </div>
          <label className="field-label" htmlFor={`content-title-${item.key}`}>Section title</label>
          <input id={`content-title-${item.key}`} className="form-control" value={item.title} maxLength={100} onChange={(event) => updateItem(item.key, { title: event.target.value })} />
          <label className="field-label" htmlFor={`content-body-${item.key}`}>Section text</label>
          <textarea id={`content-body-${item.key}`} className="form-control content-editor-textarea" value={item.body} maxLength={5000} onChange={(event) => updateItem(item.key, { body: event.target.value })} />
          <label className="content-publish-toggle">
            <input type="checkbox" checked={item.isPublished} onChange={(event) => updateItem(item.key, { isPublished: event.target.checked })} />
            <span>Publish this section on the public site</span>
          </label>
        </article>
      ))}
      <button className="button button-dark" type="button" onClick={saveContent} disabled={saving}>
        {saving ? "Saving brand story…" : "Save brand story"}
      </button>
    </section>
  );
}

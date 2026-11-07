"use client";

import { useState, type FormEvent } from "react";

export function NewsletterForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const email = new FormData(formElement).get("email");
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not subscribe.");
      setMessage(result.message);
      formElement.reset();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not subscribe.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="newsletter">
      <div><span className="eyebrow">Good news, occasionally</span><h2>A little sunshine<br />in your <em>inbox.</em></h2></div>
      <form onSubmit={subscribe}>
        <label className="visually-hidden" htmlFor="newsletter-email">Your email address</label>
        <div className="newsletter-input"><input id="newsletter-email" name="email" type="email" autoComplete="email" placeholder="Your email address" required maxLength={254} /><button type="submit" disabled={busy}>{busy ? "Joining…" : "Join us ↗"}</button></div>
        {message && <p className="success-alert" role="status">{message}</p>}
        {error && <p className="form-alert" role="alert">{error}</p>}
      </form>
    </div>
  );
}

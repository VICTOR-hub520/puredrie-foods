"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { BRAND } from "@/lib/brand";

export default function ContactPage() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setStatus("");
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          message: form.get("message"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Your message could not be sent.");
      setStatus(result.message);
      formElement.reset();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="section contact-page">
      <div className="contact-intro">
        <span className="eyebrow">Puredrie Foods enquiries</span>
        <h1>We’re here to <em>help.</em></h1>
        <p>Ask us about a product, custom quantities, retail orders or delivery. Call or WhatsApp either contact below.</p>
        <div className="contact-detail"><span className="eyebrow">Email</span><a href={`mailto:${BRAND.email}`}>{BRAND.email}</a></div>
        <div className="contact-detail"><span className="eyebrow">Call or WhatsApp</span>{BRAND.phones.map((phone) => <span className="contact-number" key={phone.local}><a href={`tel:${phone.international}`}>{phone.display}</a><a href={`https://wa.me/${phone.international.replace("+", "")}`} target="_blank" rel="noreferrer">WhatsApp ↗</a></span>)}</div>
      </div>
      <form className="contact-form" onSubmit={submit}>
        <h2>Write us a little note</h2>
        {status && <p className="success-alert" role="status">{status}</p>}
        {error && <p className="form-alert" role="alert">{error}</p>}
        <label className="field-label" htmlFor="contact-name">Your name</label>
        <input className="form-control" id="contact-name" name="name" minLength={2} maxLength={100} required />
        <label className="field-label" htmlFor="contact-email">Email address</label>
        <input className="form-control" id="contact-email" name="email" type="email" maxLength={254} required />
        <label className="field-label" htmlFor="contact-message">Your message</label>
        <textarea className="form-control" id="contact-message" name="message" rows={5} minLength={10} maxLength={2000} required />
        <button className="button button-dark" type="submit" disabled={sending}>{sending ? "Sending…" : "Send message"} {!sending && <span>↗</span>}</button>
      </form>
    </section>
  );
}

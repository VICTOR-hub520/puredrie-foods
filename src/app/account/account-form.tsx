"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AccountForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form.entries());
    try {
      const response = await fetch(`/api/customer/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not sign in.");
      router.replace("/account");
      router.refresh();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <form className="account-form" onSubmit={submit}>
      {error && <p className="form-alert" role="alert">{error}</p>}
      {isRegister && <>
        <label className="field-label" htmlFor="account-name">Full name</label>
        <input className="form-control" id="account-name" name="fullName" autoComplete="name" minLength={2} maxLength={100} required />
        <label className="field-label" htmlFor="account-phone">Phone number</label>
        <input className="form-control" id="account-phone" name="phone" type="tel" autoComplete="tel" minLength={7} maxLength={20} required />
      </>}
      <label className="field-label" htmlFor="account-email">Email address</label>
      <input className="form-control" id="account-email" name="email" type="email" autoComplete="email" maxLength={254} required />
      <label className="field-label" htmlFor="account-password">Password</label>
      <input className="form-control" id="account-password" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 12 : 1} maxLength={200} required />
      <button className="button button-dark full-button" type="submit" disabled={busy}>{busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}</button>
      <p className="account-switch">{isRegister ? "Already have an account?" : "New to Puredrie Foods?"} <Link href={isRegister ? "/account/login" : "/account/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
    </form>
  );
}

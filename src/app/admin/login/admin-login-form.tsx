"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Sign in failed.");
      router.replace("/admin");
      router.refresh();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Sign in failed.");
      setBusy(false);
    }
  }

  return (
    <form className="login-form" onSubmit={signIn}>
      {error && <p className="form-alert" role="alert">{error}</p>}
      <label className="field-label" htmlFor="admin-email">Email address</label>
      <input className="form-control" id="admin-email" name="email" type="email" autoComplete="username" required maxLength={254} />
      <label className="field-label" htmlFor="admin-password">Password</label>
      <input className="form-control" id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={200} />
      <button className="button button-dark full-button" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in securely"}</button>
    </form>
  );
}

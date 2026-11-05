"use client";

import { useState } from "react";

const field = "mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-navy-900 placeholder:text-faint focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr("Enter a valid email address.");
    if (String(f.get("message") ?? "").trim().length < 10) return setErr("Tell us a little more (10+ characters).");
    setErr(null);
    setPending(true);
    try {
      const response = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(f)) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Message could not be saved");
      setSent(true);
    } catch (error) { setErr(error instanceof Error ? error.message : "Message could not be sent. Please try later."); }
    finally { setPending(false); }
  }

  if (sent)
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-8" role="status">
        <h2 className="text-xl font-bold text-navy-900">Thanks — message received.</h2>
        <p className="mt-2 text-muted">
          Your message has been saved for the Vinify support team.
        </p>
      </div>
    );

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[var(--radius-card)] border border-line p-6 shadow-card sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-navy-900">
          Name
          <input name="name" autoComplete="name" className={field} />
        </label>
        <label className="block text-sm font-medium text-navy-900">
          Email
          <input name="email" type="email" autoComplete="email" required className={field} />
        </label>
      </div>
      <label className="mt-5 block text-sm font-medium text-navy-900">
        Topic
        <select name="topic" className={field} defaultValue="general">
          <option value="general">General question</option>
          <option value="report">Report issue</option>
          <option value="billing">Billing</option>
          <option value="dealer">Dealership / business</option>
          <option value="privacy">Privacy request</option>
        </select>
      </label>
      <label className="mt-5 block text-sm font-medium text-navy-900">
        Message
        <textarea name="message" rows={5} required maxLength={5000} className={field} />
      </label>
      {err && <p role="alert" className="mt-3 text-sm text-bad">{err}</p>}
      <button type="submit" disabled={pending} className="mt-6 w-full rounded-full bg-navy-900 py-3 font-semibold text-white hover:bg-navy-800 disabled:opacity-50 sm:w-auto sm:px-8">
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

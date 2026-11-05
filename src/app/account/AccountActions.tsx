"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AccountActions({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState(""), [pending, setPending] = useState(false);
  async function submit(endpoint: string, body: object) {
    setPending(true); setMessage("");
    try {
      // Keep the same key for network retries of this exact request.
      const storageKey = `${endpoint}:${JSON.stringify(body)}`;
      const key = sessionStorage.getItem(storageKey) ?? crypto.randomUUID(); sessionStorage.setItem(storageKey, key);
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) {
        if ((endpoint === "/api/checkout" && response.status === 409) || (endpoint === "/api/reports" && (response.status === 502 || result.requestId))) sessionStorage.removeItem(storageKey);
        throw new Error(result.error ?? "Request failed");
      }
      if (result.url) { const url = new URL(result.url); if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Invalid checkout destination"); window.location.assign(url.href); }
      else if (result.reportId) { sessionStorage.removeItem(storageKey); router.push(`/account/reports/${result.reportId}`); }
      else setMessage("Your report is processing. Refresh your library shortly.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Request failed. Please try again."); }
    finally { setPending(false); }
  }
  return <section className="my-8 rounded-xl border border-line p-5"><h2 className="text-xl font-bold">Get a report</h2>{!enabled && <p className="my-3 text-muted">Paid reports are awaiting a licensed data supplier. No purchases are being accepted.</p>}<div className="my-4 flex flex-wrap gap-3"><button disabled={!enabled || pending} className="admin-button" onClick={() => submit("/api/checkout", { plan: "single" })}>Buy one report</button><button disabled={!enabled || pending} className="admin-button" onClick={() => submit("/api/checkout", { plan: "bundle3" })}>Buy three reports</button></div><form className="flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void submit("/api/reports", { vin: data.get("vin") }); }}><label>Vehicle VIN<input className="admin-input" name="vin" minLength={17} maxLength={17} required disabled={!enabled || pending}/></label><button disabled={!enabled || pending} className="admin-button">Use a report credit</button></form>{message && <p className="mt-3" role="status">{message}</p>}</section>;
}

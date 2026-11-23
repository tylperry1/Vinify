import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { historyProvider } from "@/lib/server/providers";
import { logout } from "@/app/login/actions";
import { AccountActions } from "./AccountActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account", robots: { index: false } };

const REQUEST_STATUS: Record<string, { label: string; cls: string }> = {
  QUEUED: { label: "Queued", cls: "bg-warn-bg text-warn" },
  FETCHING: { label: "Processing", cls: "bg-[#e8efff] text-blue-600" },
  SUCCEEDED: { label: "Completed", cls: "bg-good-bg text-good" },
  FAILED: { label: "Failed", cls: "bg-bad-bg text-bad" },
  REFUNDED: { label: "Refunded", cls: "bg-surface text-muted" },
};

const ORDER_STATUS: Record<string, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded",
};

const money = (cents: number, currency: string) => `${currency.toUpperCase()} ${(cents / 100).toFixed(2)}`;

export default async function Account({ searchParams }: { searchParams: Promise<{ welcome?: string; verify?: string; checkout?: string }> }) {
  const user = await currentUser();
  if (!user) {
    return (
      <PageShell>
        <main className="mx-auto max-w-lg px-6 py-16">
          <h1 className="text-3xl font-bold">Your Vinify account</h1>
          <p className="my-4 text-muted">Sign in to see your VIN searches, purchased reports and order history.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="admin-button">Sign in</Link>
            <Link href="/register" className="rounded-lg border border-line px-4 py-2.5 font-semibold text-navy-900">Create account</Link>
          </div>
          <Link href="/decode" className="mt-6 inline-block text-blue-600 hover:underline">Use the free VIN decoder</Link>
        </main>
      </PageShell>
    );
  }

  const { welcome, verify, checkout } = await searchParams;
  const [balance, reports, requests, orders, searches, tickets] = await Promise.all([
    db.creditLedger.aggregate({ where: { userId: user.id }, _sum: { delta: true } }),
    db.report.findMany({ where: { userId: user.id }, select: { publicId: true, vin: true, generatedAt: true, provider: true }, orderBy: { generatedAt: "desc" }, take: 25 }),
    db.reportRequest.findMany({ where: { userId: user.id }, select: { id: true, vin: true, status: true, createdAt: true, lastError: true, report: { select: { publicId: true } } }, orderBy: { createdAt: "desc" }, take: 25 }),
    db.order.findMany({ where: { userId: user.id }, select: { id: true, planId: true, amountCents: true, currency: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 25 }),
    db.vinSearch.findMany({ where: { userId: user.id }, select: { id: true, vin: true, year: true, make: true, model: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.supportTicket.findMany({ where: { userId: user.id }, select: { id: true, subject: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const commerceEnabled = process.env.COMMERCE_ENABLED === "true" && !!await historyProvider();
  const credits = balance._sum.delta ?? 0;
  const pending = requests.filter((r) => r.status === "QUEUED" || r.status === "FETCHING");

  return (
    <PageShell>
      <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">Your account</p>
            <h1 className="mt-1 text-3xl font-bold">{user.name ? `Welcome back, ${user.name}` : "Welcome back"}</h1>
            <p className="mt-1 text-muted">{user.email}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/account/profile" className="text-blue-600 hover:underline">Settings</Link>
            <form action={logout}><button className="text-blue-600 hover:underline">Sign out</button></form>
          </div>
        </header>

        {welcome && (
          <p role="status" className="mt-6 rounded-xl bg-good-bg p-4 text-good">
            Account created. {verify === "sent"
              ? "Check your email to verify this address."
              : "We couldn't send the verification email because email delivery isn't configured yet — you can request one later in Settings."}
          </p>
        )}
        {checkout === "success" && (
          <p role="status" className="mt-6 rounded-xl bg-surface p-4 text-muted">
            Checkout finished. Orders are marked paid only after the payment provider confirms the charge — refresh in a
            moment to see the update.
          </p>
        )}
        {!user.emailVerified && !welcome && (
          <p className="mt-6 rounded-xl bg-warn-bg p-4 text-warn">
            Your email isn&apos;t verified. <Link href="/verify-email" className="font-semibold underline">Verify it now</Link> to secure your account.
          </p>
        )}

        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Report credits", String(credits)],
            ["Reports", String(reports.length)],
            ["In progress", String(pending.length)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-line bg-white p-5">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-2 text-3xl font-bold tabular">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-8">
            <section aria-labelledby="reports-h">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="reports-h" className="text-xl font-bold">Your reports</h2>
                <Link href="/pricing" className="text-sm text-blue-600 hover:underline">Get a report</Link>
              </div>
              {reports.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-line p-5 text-muted">
                  No reports yet. <Link href="/decode" className="text-blue-600 hover:underline">Decode a VIN</Link> to see the vehicle first.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
                  {reports.map((r) => (
                    <li key={r.publicId} className="flex flex-wrap items-center justify-between gap-3 p-5">
                      <div>
                        <p className="font-semibold">{r.vin}</p>
                        <p className="text-sm text-muted">Report {r.publicId} · {r.generatedAt.toISOString().slice(0, 10)}</p>
                      </div>
                      <Link href={`/account/reports/${r.publicId}`} className="text-sm font-semibold text-blue-600 hover:underline">View report</Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="requests-h">
              <h2 id="requests-h" className="text-xl font-bold">Report activity</h2>
              {requests.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-line p-5 text-muted">Nothing in progress.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
                  {requests.map((r) => {
                    const status = REQUEST_STATUS[r.status] ?? { label: r.status, cls: "bg-surface text-muted" };
                    return (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                        <div>
                          <p className="font-semibold">{r.vin}</p>
                          <p className="text-sm text-muted">Requested {r.createdAt.toISOString().slice(0, 10)}{r.lastError ? ` · ${r.lastError}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
                          {r.report && <Link href={`/account/reports/${r.report.publicId}`} className="text-sm font-semibold text-blue-600 hover:underline">View</Link>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section aria-labelledby="orders-h">
              <h2 id="orders-h" className="text-xl font-bold">Orders &amp; payments</h2>
              {orders.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-line p-5 text-muted">No orders yet.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
                  <table className="w-full text-left text-sm">
                    <thead><tr>{["Date", "Order", "Amount", "Status"].map((h) => <th key={h} scope="col" className="border-b border-line p-4">{h}</th>)}</tr></thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td className="border-b border-line p-4">{o.createdAt.toISOString().slice(0, 10)}</td>
                          <td className="border-b border-line p-4 font-mono text-xs">{o.id}</td>
                          <td className="border-b border-line p-4">{money(o.amountCents, o.currency)}</td>
                          <td className="border-b border-line p-4">{ORDER_STATUS[o.status] ?? o.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <AccountActions enabled={commerceEnabled} />
          </div>

          <aside className="space-y-8">
            <section aria-labelledby="searches-h">
              <h2 id="searches-h" className="text-xl font-bold">Recent VIN searches</h2>
              {searches.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-line p-5 text-muted">Searches you run while signed in appear here.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
                  {searches.map((s) => (
                    <li key={s.id} className="p-4">
                      <Link href={`/vehicles/${s.vin}`} className="font-semibold text-blue-600 hover:underline">{s.vin}</Link>
                      <p className="text-sm text-muted">{[s.year, s.make, s.model].filter(Boolean).join(" ") || "Decoded vehicle"} · {s.createdAt.toISOString().slice(0, 10)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="support-h">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="support-h" className="text-xl font-bold">Support</h2>
                <Link href="/contact" className="text-sm text-blue-600 hover:underline">New request</Link>
              </div>
              {tickets.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-line p-5 text-muted">No support requests.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
                  {tickets.map((t) => (
                    <li key={t.id} className="p-4">
                      <p className="font-semibold">{t.subject}</p>
                      <p className="text-sm capitalize text-muted">{t.status.replace("_", " ")} · {t.createdAt.toISOString().slice(0, 10)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl bg-navy-900 p-5 text-white">
              <h2 className="font-bold">Buying a car?</h2>
              <p className="mt-2 text-sm text-white/70">Decode the VIN free, then add a history report when the listing looks right.</p>
              <Link href="/decode" className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-900">Check a VIN</Link>
            </section>
          </aside>
        </div>
      </main>
    </PageShell>
  );
}

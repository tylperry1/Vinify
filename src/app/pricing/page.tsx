import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PageShell } from "@/components/PageShell";
import { DEALER_PLAN, PLANS, formatPrice } from "@/lib/pricing";

export const metadata: Metadata = { title: "Pricing", description: "Simple Vinify pricing: single reports, bundles and monthly plans." };

export default function PricingPage() {
  return (
    <PageShell>
      <PageIntro eyebrow="Pricing" title="Simple pricing. No surprise renewals.">
        Buy one report for the car you’re serious about, or subscribe while you shop. Unused-credit and renewal rules
        will be shown before checkout.
      </PageIntro>
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <p className="mb-8 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
          <strong className="text-navy-900">Launch pricing preview.</strong> Paid reports aren’t on sale yet. Prices are
          proposed and will be confirmed before launch.
        </p>
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => {
            const per = p.reports ? p.priceCents! / p.reports : null;
            return (
              <li
                key={p.id}
                className={`relative flex flex-col rounded-[var(--radius-card)] border p-6 ${
                  p.highlight ? "border-blue-500 shadow-lift ring-1 ring-blue-500" : "border-line shadow-card"
                }`}
              >
                {p.highlight && (
                  <span className="bg-brand absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold text-white">Best value to start</span>
                )}
                <h2 className="text-lg font-bold text-navy-900">{p.name}</h2>
                <p className="mt-1 text-sm text-muted">{p.blurb}</p>
                <p className="font-display mt-6 text-4xl font-extrabold text-navy-900 tabular">
                  {formatPrice(p.priceCents)}
                  {p.interval === "month" && <span className="text-base font-medium text-faint">/mo</span>}
                </p>
                <p className="mt-1 text-sm text-faint">
                  {p.reports && p.reports > 1 ? `${formatPrice(Math.round(per!))} per report` : "One-time purchase"}
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-muted">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="mt-px shrink-0 text-blue-500" aria-hidden>
                        <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled
                  className={`mt-8 cursor-not-allowed rounded-full py-3 text-sm font-semibold ${
                    p.highlight ? "bg-brand text-white opacity-60" : "bg-surface text-muted"
                  }`}
                >
                  Available at launch
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex flex-col justify-between gap-6 rounded-[var(--radius-card)] bg-navy-900 p-8 text-white md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold">{DEALER_PLAN.name} &amp; business</h2>
            <p className="mt-1 max-w-xl text-white/65">{DEALER_PLAN.blurb} Team accounts and bulk lookups are on the roadmap.</p>
          </div>
          <Link href="/contact" className="shrink-0 rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-navy-900 hover:bg-sky-300">
            Talk to us
          </Link>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {[
            ["What if a report fails?", "If our data source can’t produce your report, the credit goes back to your account automatically."],
            ["Can I cancel?", "Monthly plans can be cancelled anytime from your dashboard. You keep access until the end of the period."],
            ["Do credits expire?", "Our credit rollover and expiry policy will be published here before any plan goes on sale."],
          ].map(([q, a]) => (
            <div key={q}>
              <h3 className="font-bold text-navy-900">{q}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{a}</p>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

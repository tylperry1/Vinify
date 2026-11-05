import Link from "next/link";
import { CoverageBadge } from "@/components/Coverage";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { VinSearch } from "@/components/VinSearch";
import { PLANS, formatPrice } from "@/lib/pricing";

const CHECKS = [
  { t: "Title brands", d: "Salvage, rebuilt, flood, junk and other state title brands." },
  { t: "Odometer readings", d: "Reported mileage over time, so gaps and rollbacks stand out." },
  { t: "Insurance total loss", d: "Whether an insurer declared the vehicle a total loss." },
  { t: "Theft records", d: "Reported theft where the data source includes it." },
  { t: "Recall campaigns", d: "NHTSA safety recalls for the vehicle’s year, make and model." },
  { t: "Full specifications", d: "Engine, transmission, drivetrain, body and assembly plant." },
];

export default function Home() {
  const preview = PLANS.slice(0, 3);
  return (
    <>
      <div className="bg-hero relative overflow-hidden">
        <SiteHeader tone="dark" />
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:pb-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-sky-300">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden />
              Free VIN decoding is live · history reports launching soon
            </p>
            <h1 className="font-display mt-6 text-[2.6rem] font-extrabold leading-[1.02] text-white sm:text-6xl">
              Know the car <br className="hidden sm:block" />
              <span className="text-gradient">before you sign.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
              Enter a VIN to see exactly what you’re looking at — then check its title, mileage and loss history in a
              report that’s honest about what it found and what it didn’t.
            </p>
            <div className="mt-8 max-w-2xl">
              <VinSearch tone="dark" />
            </div>
          </div>

          {/* Product preview */}
          <div className="relative hidden lg:block" aria-hidden>
            <div className="absolute -inset-6 rounded-[28px] bg-blue-500/20 blur-3xl" />
            <div className="relative rotate-[1.5deg] rounded-[22px] border border-white/10 bg-white p-6 shadow-lift">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">Sample report</p>
                  <p className="font-display mt-1 text-2xl font-extrabold text-navy-900">2003 Honda Accord EX-V6</p>
                  <p className="mt-1 font-mono text-xs tracking-[0.12em] text-muted">1HGCM82633A004352</p>
                </div>
                <span className="rounded-lg bg-surface px-2 py-1 font-mono text-[11px] text-muted">VNF-SMPL-0001</span>
              </div>
              <ul className="mt-5 divide-y divide-line">
                {[
                  ["Title brands", "no_records"],
                  ["Odometer readings", "reported"],
                  ["Insurance total loss", "no_records"],
                  ["Accident & damage", "reported"],
                  ["Service & maintenance", "not_covered"],
                ].map(([l, s]) => (
                  <li key={l} className="flex items-center justify-between py-3">
                    <span className="text-sm font-semibold text-navy-900">{l}</span>
                    <CoverageBadge status={s as "reported"} />
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex h-14 items-end gap-1.5">
                {[8, 38, 60, 86, 100].map((h, i) => (
                  <span key={i} className="bg-brand flex-1 rounded-t-md" style={{ height: `${h}%` }} />
                ))}
              </div>
              <p className="mt-2 text-xs text-faint">Odometer · 5 readings, 2003–2019</p>
            </div>
          </div>
        </section>
      </div>

      <main id="main">
        {/* What we check */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <p className="text-sm font-semibold text-blue-600">What a Vinify report covers</p>
              <h2 className="font-display mt-2 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
                The checks that change a buying decision.
              </h2>
              <p className="mt-4 text-muted">
                Every section in a Vinify report is labelled with what the data source actually returned. If a category
                isn’t covered, we say so — instead of leaving you to assume it’s clean.
              </p>
              <Link href="/data-coverage" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline">
                Read our data coverage notes <span aria-hidden>→</span>
              </Link>
            </div>
            <ul className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-2">
              {CHECKS.map((c, i) => (
                <li key={c.t} className="bg-white p-6">
                  <span className="font-mono text-xs font-semibold text-blue-500">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-2 font-bold text-navy-900">{c.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{c.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Honesty legend */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold text-blue-600">Straight answers</p>
              <h2 className="font-display mt-2 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
                “No records” and “not checked” are not the same thing.
              </h2>
              <p className="mt-4 max-w-lg text-muted">
                Most reports blur the two. Vinify shows four clear states for every section, so a clean-looking report
                never hides a gap in the data.
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["reported", "The source returned records. Details are in the report."],
                  ["no_records", "The source was searched and returned nothing."],
                  ["not_covered", "This report’s sources don’t include this category."],
                  ["unavailable", "The source didn’t respond. Your credit is protected."],
                ] as const
              ).map(([s, d]) => (
                <div key={s} className="rounded-2xl border border-line bg-white p-5">
                  <dt>
                    <CoverageBadge status={s} />
                  </dt>
                  <dd className="mt-3 text-sm leading-relaxed text-muted">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <h2 className="font-display text-3xl font-extrabold text-navy-900 sm:text-4xl">Three steps. About a minute.</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              ["Enter the VIN", "We validate it instantly — including the check digit — so typos don’t cost you a report."],
              ["See the vehicle, free", "Confirm year, make, model, engine and recall campaigns before you pay anything."],
              ["Unlock the history", "Get the full report on screen and as a PDF, saved to your account."],
            ].map(([t, d], i) => (
              <li key={t} className="border-t-2 border-navy-900 pt-5">
                <span className="font-mono text-sm font-semibold text-blue-500">Step {i + 1}</span>
                <h3 className="mt-2 text-xl font-bold text-navy-900">{t}</h3>
                <p className="mt-2 leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Pricing teaser */}
        <section className="bg-navy-900 text-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-semibold text-sky-300">Pricing</p>
                <h2 className="font-display mt-2 text-3xl font-extrabold sm:text-4xl">Pay per car, or subscribe if you shop a lot.</h2>
              </div>
              <Link href="/pricing" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-sky-300 hover:text-white">
                Compare all plans <span aria-hidden>→</span>
              </Link>
            </div>
            <ul className="mt-10 grid gap-4 md:grid-cols-3">
              {preview.map((p) => (
                <li key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                  <p className="font-semibold">{p.name}</p>
                  <p className="font-display mt-3 text-4xl font-extrabold tabular">
                    {formatPrice(p.priceCents)}
                    {p.interval === "month" && <span className="text-base font-medium text-white/50">/mo</span>}
                  </p>
                  <p className="mt-2 text-sm text-white/60">
                    {p.reports} report{p.reports! > 1 ? "s" : ""}
                    {p.interval === "month" ? " per month" : ""}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-white/45">Launch pricing preview. Final prices will be confirmed before paid reports go live.</p>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="bg-brand relative overflow-hidden rounded-[28px] px-6 py-12 text-white sm:px-12">
            <h2 className="font-display max-w-xl text-3xl font-extrabold leading-tight sm:text-4xl">
              Looking at a car right now? Start with the free decode.
            </h2>
            <p className="mt-3 max-w-lg text-white/85">No account, no card. Just the VIN.</p>
            <Link href="/decode" className="mt-7 inline-flex rounded-full bg-white px-6 py-3 font-semibold text-navy-900 transition hover:bg-navy-900 hover:text-white">
              Decode a VIN
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

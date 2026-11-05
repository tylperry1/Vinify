import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "How It Works" };

const STEPS = [
  {
    t: "Find and enter the VIN",
    d: "The 17-character VIN is on the driver-side dashboard, the door jamb, and the title. We check its format and its 9th-character check digit instantly — catching most typos before you spend anything.",
  },
  {
    t: "Confirm the vehicle for free",
    d: "We decode the VIN with NHTSA’s public database: year, make, model, trim, engine, transmission, drivetrain and assembly plant, plus recall campaigns for that model. Make sure it matches the listing.",
  },
  {
    t: "Unlock the history report",
    d: "Use a credit or buy a single report. We request the vehicle’s records from our licensed data partners and assemble them into one clear report with a timeline and odometer chart.",
  },
  {
    t: "Read it, save it, share it",
    d: "Your report is stored in your account with a report number and timestamp. View it on your phone or download a PDF to bring to the seller.",
  },
];

export default function HowItWorks() {
  return (
    <PageShell>
      <PageIntro eyebrow="How it works" title="From VIN to answers in about a minute." />
      <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <ol className="space-y-12">
          {STEPS.map((s, i) => (
            <li key={s.t} className="grid grid-cols-[3rem_1fr] gap-5">
              <span className="font-display grid h-12 w-12 place-items-center rounded-2xl bg-navy-900 text-xl font-extrabold text-white">{i + 1}</span>
              <div>
                <h2 className="text-xl font-bold text-navy-900">{s.t}</h2>
                <p className="mt-2 leading-relaxed text-muted">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-14 rounded-2xl bg-surface p-6">
          <h2 className="font-bold text-navy-900">A report is one tool, not the whole inspection</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            History reports only include events that were reported to their data sources. Pair any report with a
            pre-purchase inspection by a mechanic you trust.
          </p>
        </div>
        <Link href="/decode" className="bg-brand mt-10 inline-flex rounded-full px-6 py-3 font-semibold text-white">
          Try the free decoder
        </Link>
      </section>
    </PageShell>
  );
}

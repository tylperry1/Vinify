import type { Metadata } from "next";
import { CoverageBadge } from "@/components/Coverage";
import { PageIntro, PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Data Coverage & Limitations" };

export default function DataCoverage() {
  return (
    <PageShell>
      <PageIntro eyebrow="Data coverage" title="What our data can and can’t tell you.">
        We’d rather you know the limits up front than discover them after you buy a car.
      </PageIntro>
      <section className="prose-vinify mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <h2>Free VIN decoder</h2>
        <p>
          Specifications come from NHTSA’s Product Information Catalog (vPIC). It is designed mainly for vehicles from
          model year 1981 onward that were built for sale in the United States. Older or imported vehicles may decode
          partially or not at all. Decoded values describe the vehicle as manufactured.
        </p>
        <p>
          Recall results are NHTSA campaigns for the vehicle’s year, make and model. They are not specific to one VIN
          and don’t show repair status.
        </p>
        <h2>Vehicle history reports</h2>
        <p>
          Paid reports are not yet available. Before launch, this page will list each report section, its data source,
          and known gaps. We will only include a section in our reports when a licensed data partner reliably supplies it.
        </p>
        <h2>How to read section statuses</h2>
      </section>
      <section className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <dl className="divide-y divide-line rounded-2xl border border-line">
          {(
            [
              ["reported", "The source returned one or more records for this category."],
              ["no_records", "The source was searched and returned no records. Some events are never reported, so this is not a guarantee."],
              ["not_covered", "This report’s data sources don’t include this category, so we can’t tell you either way."],
              ["unavailable", "The source didn’t respond when the report was built. We retry, and if it still fails, return your credit."],
            ] as const
          ).map(([s, d]) => (
            <div key={s} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:gap-6">
              <dt className="sm:w-48 sm:shrink-0"><CoverageBadge status={s} /></dt>
              <dd className="text-sm leading-relaxed text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </section>
    </PageShell>
  );
}

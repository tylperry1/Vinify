import type { NormalizedReport } from "@/lib/providers/types";
import { CoverageBadge } from "./Coverage";

function fmtDate(d: string | null) {
  if (!d) return "Date not reported";
  const dt = new Date(d + "T00:00:00Z");
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function ReportView({
  report,
  vehicle,
  reportNumber,
  generatedAt,
}: {
  report: NormalizedReport;
  vehicle: { title: string; subtitle: string };
  reportNumber: string;
  generatedAt: string;
}) {
  const timeline = report.sections
    .flatMap((s) => s.events)
    .filter((e) => e.date)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
  const odo = report.sections.find((s) => s.key === "odometer")?.events.filter((e) => e.odometer != null) ?? [];
  const maxOdo = Math.max(1, ...odo.map((e) => e.odometer!));

  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-card">
      <header className="bg-navy-900 px-5 py-6 text-white sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Vehicle history report</p>
            <h2 className="font-display mt-2 text-2xl font-extrabold sm:text-3xl">{vehicle.title}</h2>
            <p className="mt-1 text-sm text-white/65">{vehicle.subtitle}</p>
            <p className="mt-3 font-mono text-sm tracking-[0.12em] text-white/90">{report.vin}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-right">
            <div>
              <dt className="text-white/50">Report no.</dt>
              <dd className="font-mono font-semibold">{reportNumber}</dd>
            </div>
            <div>
              <dt className="text-white/50">Generated</dt>
              <dd className="font-semibold">{generatedAt}</dd>
            </div>
            <div>
              <dt className="text-white/50">Source data as of</dt>
              <dd className="font-semibold">{fmtDate(report.sourceAsOf)}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section aria-labelledby="summary-h" className="border-b border-line px-5 py-6 sm:px-8">
        <h3 id="summary-h" className="text-sm font-semibold uppercase tracking-[0.12em] text-faint">
          Summary
        </h3>
        <ul className="mt-4 divide-y divide-line">
          {report.sections.map((s) => (
            <li key={s.key} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <p className="font-semibold text-navy-900">{s.label}</p>
                <p className="text-sm text-muted">{s.summary}</p>
              </div>
              <CoverageBadge status={s.status} />
            </li>
          ))}
        </ul>
      </section>

      {odo.length > 1 && (
        <section aria-labelledby="odo-h" className="border-b border-line px-5 py-6 sm:px-8">
          <h3 id="odo-h" className="text-sm font-semibold uppercase tracking-[0.12em] text-faint">
            Odometer readings
          </h3>
          <ol className="mt-5 space-y-3">
            {odo.map((e, i) => (
              <li key={i} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[7rem_1fr_6rem]">
                <span className="text-muted">{fmtDate(e.date)}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-surface">
                  <span className="bg-brand block h-full rounded-full" style={{ width: `${Math.max(2, (e.odometer! / maxOdo) * 100)}%` }} />
                </span>
                <span className="tabular text-right font-semibold text-navy-900">{e.odometer!.toLocaleString()} mi</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="tl-h" className="px-5 py-6 sm:px-8">
        <h3 id="tl-h" className="text-sm font-semibold uppercase tracking-[0.12em] text-faint">
          Timeline
        </h3>
        <ol className="relative mt-5 space-y-5 border-l border-line pl-6">
          {timeline.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[1.84rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500 ring-1 ring-blue-500/30" aria-hidden />
              <p className="text-xs font-medium text-faint">{fmtDate(e.date)}</p>
              <p className="font-semibold text-navy-900">{e.title}</p>
              <p className="text-sm text-muted">
                {[e.location, e.odometer != null ? `${e.odometer.toLocaleString()} mi` : null, e.detail].filter(Boolean).join(" · ")}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-line bg-surface px-5 py-5 text-xs leading-relaxed text-muted sm:px-8">
        A vehicle history report reflects only records reported to its data sources. “No records found” does not
        guarantee an event did not occur. Always get an independent pre-purchase inspection.
      </footer>
    </article>
  );
}

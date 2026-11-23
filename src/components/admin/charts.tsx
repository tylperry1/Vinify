"use client";
/**
 * Dependency-free SVG charts. Every value is passed in from server-side
 * aggregation — nothing is synthesised at render time, and an empty series
 * renders an explanation instead of a decorative curve.
 */
import { useState } from "react";
import { AdminIcon } from "./icons";

type Point = { label: string; value: number };

const money = (n: number) => `$${(n / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

/** Format is a serialisable token: these components are client components. */
export type ChartFormat = "number" | "currency" | "compact";
function formatter(kind: ChartFormat = "number") {
  if (kind === "currency") return (value: number) => `$${(value / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (kind === "compact") return (value: number) => `$${(value / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return (value: number) => value.toLocaleString();
}

export function Sparkline({ values, accent = "#38b6ff", className = "h-9 w-full" }: { values: number[]; accent?: string; className?: string }) {
  if (values.length < 2) return <div aria-hidden="true" className={className} />;
  const max = Math.max(...values, 0), min = Math.min(...values, 0);
  const span = max - min || 1;
  const width = 120, height = 36;
  const step = width / (values.length - 1);
  const y = (value: number) => 4 + (1 - (value - min) / span) * (height - 8);
  const line = values.map((value, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const id = `spark-${accent.replace("#", "")}-${values.length}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={accent} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function TrendChart({
  points, title, format: formatKind = "number", accent = "#2563ff", empty = "No activity in this period.",
  emptyHint, description,
}: {
  points: Point[];
  title: string;
  format?: ChartFormat;
  accent?: string;
  empty?: string;
  emptyHint?: string;
  description?: string;
}) {
  const format = formatter(formatKind);
  const [hover, setHover] = useState<number | null>(null);
  const width = 720, height = 210, pad = { top: 16, right: 12, bottom: 26, left: 12 };
  const max = Math.max(...points.map(p => p.value), 0);
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const hasData = points.length > 0 && total > 0;

  return (
    <figure className="admin-card flex flex-col p-5 sm:p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span>
          <span className="font-display block text-sm font-bold text-ink">{title}</span>
          {description && <span className="mt-0.5 block text-xs text-faint">{description}</span>}
        </span>
        <span className="tabular text-sm font-semibold text-muted">
          {format(total)}
          <span className="ml-1.5 text-xs font-normal text-faint">total</span>
        </span>
      </figcaption>

      {!hasData ? (
        <div className="admin-empty mt-4 flex-1">
          <span className="admin-empty-icon"><AdminIcon name="analytics" className="size-5" /></span>
          <p className="text-sm font-semibold text-ink">{empty}</p>
          <p className="max-w-xs text-xs text-faint">{emptyHint ?? "Activity recorded in this period will appear here."}</p>
        </div>
      ) : (
        <div className="relative mt-4">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`${title}: ${format(total)} total across ${points.length} intervals`}
            className="w-full"
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id={`fill-${accent.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0.26" />
                <stop offset="100%" stopColor={accent} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map(t => (
              <line key={t} x1={pad.left} x2={width - pad.right} y1={pad.top + t * (height - pad.top - pad.bottom)} y2={pad.top + t * (height - pad.top - pad.bottom)}
                stroke="currentColor" className="text-line" strokeDasharray="3 6" strokeWidth="1" />
            ))}
            <path d={areaPath(points, width, height, pad, max)} fill={`url(#fill-${accent.replace("#", "")})`} />
            <path d={linePath(points, width, height, pad, max)} fill="none" stroke={accent} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
            {hover !== null && points[hover] && (
              <>
                <line x1={xAt(hover, points.length, width, pad)} x2={xAt(hover, points.length, width, pad)} y1={pad.top} y2={height - pad.bottom} stroke={accent} strokeOpacity="0.35" strokeWidth="1.5" />
                <circle cx={xAt(hover, points.length, width, pad)} cy={yAt(points[hover].value, height, pad, max)} r="4.5" fill={accent} stroke="white" strokeWidth="2" />
              </>
            )}
            {points.map((point, index) => {
              const bandWidth = (width - pad.left - pad.right) / Math.max(points.length, 1);
              return (
                <rect
                  key={`${point.label}-${index}`}
                  x={pad.left + index * bandWidth}
                  y={pad.top}
                  width={bandWidth}
                  height={height - pad.top - pad.bottom}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${point.label}: ${format(point.value)}`}
                  onMouseEnter={() => setHover(index)}
                  onFocus={() => setHover(index)}
                  onBlur={() => setHover(null)}
                />
              );
            })}
            {points.map((point, index) => (
              index % Math.ceil(points.length / 7) === 0 ? (
                <text key={`label-${index}`} x={xAt(index, points.length, width, pad)} y={height - 7} textAnchor="middle" className="fill-current text-[10px] text-faint">{point.label}</text>
              ) : null
            ))}
          </svg>

          {hover !== null && points[hover] && (
            <div
              className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs shadow-lift"
              style={{ left: `${(xAt(hover, points.length, width, pad) / width) * 100}%` }}
            >
              <span className="block font-semibold text-ink">{format(points[hover].value)}</span>
              <span className="block text-faint">{points[hover].label}</span>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

function xAt(index: number, count: number, width: number, pad: { left: number; right: number }) {
  return pad.left + (index * (width - pad.left - pad.right)) / Math.max(count - 1, 1);
}
function yAt(value: number, height: number, pad: { top: number; bottom: number }, max: number) {
  return pad.top + (1 - (max ? value / max : 0)) * (height - pad.top - pad.bottom);
}
function linePath(points: Point[], width: number, height: number, pad: { top: number; right: number; bottom: number; left: number }, max: number) {
  return points.map((point, i) => `${i === 0 ? "M" : "L"}${xAt(i, points.length, width, pad).toFixed(1)},${yAt(point.value, height, pad, max).toFixed(1)}`).join(" ");
}
function areaPath(points: Point[], width: number, height: number, pad: { top: number; right: number; bottom: number; left: number }, max: number) {
  return `${linePath(points, width, height, pad, max)} L${width - pad.right},${height - pad.bottom} L${pad.left},${height - pad.bottom} Z`;
}

export function BarList({
  title, rows, format: formatKind = "number", empty = "Nothing recorded in this period.", emptyHint, description,
}: {
  title: string;
  rows: { label: string; value: number; hint?: string }[];
  format?: ChartFormat;
  empty?: string;
  emptyHint?: string;
  description?: string;
}) {
  const format = formatter(formatKind);
  const max = Math.max(...rows.map(r => r.value), 0);
  return (
    <section className="admin-card flex flex-col p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-sm font-bold text-ink">{title}</h2>
        {rows.length > 0 && <span className="text-xs text-faint">{rows.length} {rows.length === 1 ? "group" : "groups"}</span>}
      </div>
      {description && <p className="mt-1 text-xs text-faint">{description}</p>}
      {rows.length === 0 || max === 0 ? (
        <div className="admin-empty mt-4 flex-1">
          <span className="admin-empty-icon"><AdminIcon name="inbox" className="size-5" /></span>
          <p className="text-sm font-semibold text-ink">{empty}</p>
          <p className="max-w-xs text-xs text-faint">{emptyHint ?? "Rows will appear as activity is recorded."}</p>
        </div>
      ) : (
        <ul className="mt-4 grid flex-1 content-start gap-3.5">
          {rows.map(row => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium text-ink">{row.label}</span>
                <span className="tabular shrink-0 text-muted">
                  {format(row.value)}
                  {row.hint && <span className="ml-2 text-xs text-faint">{row.hint}</span>}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-[width] duration-500" style={{ width: `${Math.max((row.value / max) * 100, 2)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CompletionRing({ completed, pending, failed }: { completed: number; pending: number; failed: number }) {
  const total = completed + pending + failed;
  if (total === 0) {
    return (
      <section className="admin-card flex flex-col p-5 sm:p-6">
        <h2 className="font-display text-sm font-bold text-ink">Report completion</h2>
        <div className="admin-empty mt-4 flex-1">
          <span className="admin-empty-icon"><AdminIcon name="reports" className="size-5" /></span>
          <p className="text-sm font-semibold text-ink">No report requests in this period</p>
          <p className="max-w-xs text-xs text-faint">Completion rate appears once requests are recorded.</p>
        </div>
      </section>
    );
  }
  const rate = Math.round((completed / total) * 100);
  const circumference = 2 * Math.PI * 54;
  return (
    <section className="admin-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
      <svg viewBox="0 0 140 140" role="img" aria-label={`Report completion ${rate}%: ${completed} completed, ${pending} pending, ${failed} failed`} className="size-32 shrink-0 self-center">
        <circle cx="70" cy="70" r="54" fill="none" stroke="currentColor" className="text-line" strokeWidth="12" />
        <circle cx="70" cy="70" r="54" fill="none" stroke="#2563ff" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${(rate / 100) * circumference} ${circumference}`} transform="rotate(-90 70 70)" />
        <text x="70" y="66" textAnchor="middle" className="fill-current text-[22px] font-extrabold text-ink">{rate}%</text>
        <text x="70" y="86" textAnchor="middle" className="fill-current text-[10px] text-faint">completed</text>
      </svg>
      <div className="grid flex-1 gap-2.5 text-sm">
        <h2 className="font-display mb-1 text-sm font-bold text-ink">Report completion</h2>
        <RingRow label="Completed" value={completed} tone="text-good" />
        <RingRow label="Pending" value={pending} tone="text-warn" />
        <RingRow label="Failed" value={failed} tone="text-bad" />
        <p className="mt-2 border-t border-line pt-2 text-xs text-faint">{total.toLocaleString()} requests in range</p>
      </div>
    </section>
  );
}

function RingRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`tabular font-semibold ${tone}`}>{value.toLocaleString()}</span>
    </p>
  );
}

/** Conversion funnel: each stage is a real count, never a fabricated drop-off. */
export function Funnel({ stages, title = "Conversion funnel", empty = "Not enough activity yet." }: {
  stages: { label: string; value: number; hint?: string }[];
  title?: string;
  empty?: string;
}) {
  const max = Math.max(...stages.map(stage => stage.value), 0);
  return (
    <section className="admin-card p-5 sm:p-6">
      <h2 className="font-display text-sm font-bold text-ink">{title}</h2>
      <p className="mt-1 text-xs text-faint">Counts are summed from the same period as the dashboard filters.</p>
      {max === 0 ? (
        <div className="admin-empty mt-4">
          <span className="admin-empty-icon"><AdminIcon name="filter" className="size-5" /></span>
          <p className="text-sm font-semibold text-ink">{empty}</p>
          <p className="max-w-xs text-xs text-faint">VIN decodes and paid orders will build the funnel.</p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3">
          {stages.map((stage, index) => {
            const previous = stages[index - 1];
            const rate = previous && previous.value > 0 ? Math.round((stage.value / previous.value) * 100) : null;
            return (
              <li key={stage.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{stage.label}</span>
                  <span className="tabular text-muted">
                    {stage.value.toLocaleString()}
                    {rate !== null && <span className="ml-2 text-xs font-semibold text-blue-600">{rate}% of previous</span>}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400" style={{ width: `${Math.max((stage.value / max) * 100, 2)}%` }} />
                </div>
                {stage.hint && <p className="mt-1 text-[11px] text-faint">{stage.hint}</p>}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-[11px] leading-relaxed text-faint">Conversion uses paid orders ÷ VIN decodes in the same window — it is not a session-level attribution metric.</p>
    </section>
  );
}

export { money as chartMoney };

/**
 * Dependency-free SVG charts. Pure server components: they render from values
 * the caller has already fetched, so nothing is invented at render time.
 */
type Point = { label: string; value: number };

export function TrendChart({ points, title, format = n => n.toLocaleString(), accent = "#2563ff", empty = "No data in this period." }: {
  points: Point[];
  title: string;
  format?: (value: number) => string;
  accent?: string;
  empty?: string;
}) {
  const width = 640, height = 180, pad = { top: 14, right: 10, bottom: 24, left: 10 };
  const max = Math.max(...points.map(p => p.value), 0);
  const total = points.reduce((sum, p) => sum + p.value, 0);
  if (!points.length || total === 0) {
    return (
      <figure className="admin-card p-6">
        <figcaption className="font-display text-sm font-bold text-ink">{title}</figcaption>
        <p className="mt-6 grid h-32 place-items-center rounded-xl border border-dashed border-line text-sm text-faint">{empty}</p>
      </figure>
    );
  }
  const stepX = (width - pad.left - pad.right) / Math.max(points.length - 1, 1);
  const y = (value: number) => pad.top + (1 - (max ? value / max : 0)) * (height - pad.top - pad.bottom);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${pad.left + i * stepX},${y(p.value)}`).join(" ");
  const area = `${line} L${pad.left + (points.length - 1) * stepX},${height - pad.bottom} L${pad.left},${height - pad.bottom} Z`;
  const ticks = [0, 0.5, 1].map(t => max * t);

  return (
    <figure className="admin-card p-6">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-display text-sm font-bold text-ink">{title}</span>
        <span className="tabular text-sm text-muted">Total {format(total)}</span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}: total ${format(total)} across ${points.length} intervals`} className="mt-4 w-full">
        {ticks.map(tick => (
          <line key={tick} x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="currentColor" className="text-line" strokeDasharray="3 6" strokeWidth="1" />
        ))}
        <path d={area} fill={accent} opacity="0.12" />
        <path d={line} fill="none" stroke={accent} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.label + i} cx={pad.left + i * stepX} cy={y(p.value)} r="2.4" fill={accent}>
            <title>{`${p.label}: ${format(p.value)}`}</title>
          </circle>
        ))}
        {points.map((p, i) => (i % Math.ceil(points.length / 6) === 0 ? (
          <text key={`l${p.label}${i}`} x={pad.left + i * stepX} y={height - 6} textAnchor="middle" className="fill-current text-[10px] text-faint">{p.label}</text>
        ) : null))}
      </svg>
    </figure>
  );
}

export function BarList({ title, rows, format = n => n.toLocaleString(), empty = "Nothing recorded in this period." }: {
  title: string;
  rows: { label: string; value: number; hint?: string }[];
  format?: (value: number) => string;
  empty?: string;
}) {
  const max = Math.max(...rows.map(r => r.value), 0);
  return (
    <section className="admin-card p-6">
      <h2 className="font-display text-sm font-bold text-ink">{title}</h2>
      {rows.length === 0 || max === 0 ? (
        <p className="mt-6 grid h-24 place-items-center rounded-xl border border-dashed border-line text-sm text-faint">{empty}</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {rows.map(row => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium text-ink">{row.label}</span>
                <span className="tabular shrink-0 text-muted">{format(row.value)}{row.hint ? <span className="ml-2 text-xs text-faint">{row.hint}</span> : null}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400" style={{ width: `${Math.max((row.value / max) * 100, 2)}%` }} />
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
      <section className="admin-card p-6">
        <h2 className="font-display text-sm font-bold text-ink">Report completion</h2>
        <p className="mt-6 grid h-32 place-items-center rounded-xl border border-dashed border-line text-sm text-faint">No report requests in this period.</p>
      </section>
    );
  }
  const rate = Math.round((completed / total) * 100);
  const circumference = 2 * Math.PI * 54;
  return (
    <section className="admin-card flex items-center gap-6 p-6">
      <svg viewBox="0 0 140 140" role="img" aria-label={`Report completion ${rate}%: ${completed} completed, ${pending} pending, ${failed} failed`} className="size-32 shrink-0">
        <circle cx="70" cy="70" r="54" fill="none" stroke="currentColor" className="text-line" strokeWidth="12" />
        <circle cx="70" cy="70" r="54" fill="none" stroke="#2563ff" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${(rate / 100) * circumference} ${circumference}`} transform="rotate(-90 70 70)" />
        <text x="70" y="66" textAnchor="middle" className="fill-current text-[22px] font-extrabold text-ink">{rate}%</text>
        <text x="70" y="86" textAnchor="middle" className="fill-current text-[10px] text-faint">completed</text>
      </svg>
      <div className="grid flex-1 gap-2 text-sm">
        <h2 className="font-display mb-1 text-sm font-bold text-ink">Report completion</h2>
        <Row label="Completed" value={completed} tone="text-good" />
        <Row label="Pending" value={pending} tone="text-warn" />
        <Row label="Failed" value={failed} tone="text-bad" />
      </div>
    </section>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`tabular font-semibold ${tone}`}>{value.toLocaleString()}</span>
    </p>
  );
}

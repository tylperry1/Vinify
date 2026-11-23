import Link from "next/link";
import type { ReactNode } from "react";
import { AdminIcon, type IconName } from "./icons";

export function PageHeader({
  eyebrow, title, description, actions,
}: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">{eyebrow}</p>}
        <h1 className="font-display mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({
  title, description, actions, children, className = "", padded = true,
}: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={`admin-card ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="font-display text-sm font-bold text-ink">{title}</h2>}
            {description && <p className="mt-1 text-xs leading-relaxed text-faint">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

const tones: Record<string, "good" | "warn" | "bad" | "info" | "neutral"> = {
  PAID: "good", SUCCEEDED: "good", ACTIVE: "good", resolved: "good", ADMIN: "info", SUPER_ADMIN: "info",
  PENDING: "warn", QUEUED: "warn", FETCHING: "warn", in_progress: "warn", TRIALING: "warn", PARTIALLY_REFUNDED: "warn",
  FAILED: "bad", REFUNDED: "bad", CANCELED: "bad", PAST_DUE: "bad", INCOMPLETE: "bad",
};

export function StatusBadge({ value }: { value: string }) {
  const tone = tones[value] ?? "neutral";
  return <span className="admin-badge" data-tone={tone}>{value.replaceAll("_", " ").toLowerCase()}</span>;
}

export function EmptyState({ icon = "inbox", title, description }: { icon?: IconName; title: string; description?: string }) {
  return (
    <div className="admin-empty">
      <span className="admin-empty-icon"><AdminIcon name={icon} className="size-5" /></span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-xs leading-relaxed text-faint">{description}</p>}
    </div>
  );
}

export type Query = Record<string, string | undefined>;

/** Build a URL that preserves the current filters while changing one key. */
export function hrefWith(basePath: string, query: Query, changes: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...changes })) {
    if (value !== undefined && value !== "" && value !== null) params.set(key, value);
  }
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export function Pagination({
  page, pageSize, total, basePath, query, label = "records",
}: { page: number; pageSize: number; total: number; basePath: string; query: Query; label?: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const windowStart = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, i) => windowStart + i).filter(n => n <= pages);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm">
      <p className="text-xs text-faint">Showing <span className="tabular font-semibold text-muted">{from.toLocaleString()}–{to.toLocaleString()}</span> of <span className="tabular font-semibold text-muted">{total.toLocaleString()}</span> {label}</p>
      <nav aria-label="Pages" className="flex items-center gap-1">
        <Link
          aria-disabled={page <= 1}
          href={hrefWith(basePath, query, { page: String(Math.max(1, page - 1)) })}
          className={`rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold ${page <= 1 ? "pointer-events-none opacity-40" : "text-muted hover:text-ink"}`}
        >Previous</Link>
        {numbers.map(number => (
          <Link key={number} href={hrefWith(basePath, query, { page: String(number) })}
            aria-current={number === page ? "page" : undefined}
            className={`grid size-8 place-items-center rounded-lg border text-xs font-semibold ${number === page ? "border-blue-500 bg-blue-500 text-white" : "border-line text-muted hover:text-ink"}`}>
            {number}
          </Link>
        ))}
        <Link
          aria-disabled={page >= pages}
          href={hrefWith(basePath, query, { page: String(Math.min(pages, page + 1)) })}
          className={`rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold ${page >= pages ? "pointer-events-none opacity-40" : "text-muted hover:text-ink"}`}
        >Next</Link>
      </nav>
    </div>
  );
}

export function TableShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return <div className="admin-card overflow-hidden"><div className="overflow-x-auto">{children}</div>{footer}</div>;
}

export function SortHeader({ label, column, sort, dir, basePath, query, numeric = false }: {
  label: string; column: string; sort: string; dir: "asc" | "desc"; basePath: string; query: Query; numeric?: boolean;
}) {
  const active = sort === column;
  const next = active && dir === "desc" ? "asc" : "desc";
  return (
    <Link href={hrefWith(basePath, query, { sort: column, dir: next })} className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""} ${numeric ? "justify-end" : ""}`}>
      {label}
      <AdminIcon name="chevronDown" className={`size-3 transition-transform ${active ? (dir === "asc" ? "rotate-180" : "") : "opacity-30"}`} />
    </Link>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "good" | "warn" | "bad"; children: ReactNode }) {
  const map = { info: "border-blue-500/25 bg-blue-500/8 text-blue-700", good: "border-good/25 bg-good-bg text-good", warn: "border-warn/25 bg-warn-bg text-warn", bad: "border-bad/25 bg-bad-bg text-bad" };
  return <p role="status" className={`rounded-xl border px-4 py-3 text-sm ${map[tone]}`}>{children}</p>;
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

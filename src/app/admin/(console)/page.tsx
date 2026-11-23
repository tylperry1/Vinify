import Link from "next/link";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { AdminIcon, type IconName } from "@/components/admin/icons";

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function Overview() {
  await requireAdmin();
  const [customers, reports, orders, revenue, errors, recent] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER", deletedAt: null } }),
    db.report.count(),
    db.order.count(),
    db.order.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
    db.apiUsage.count({ where: { success: false, createdAt: { gte: new Date(Date.now() - 86400_000) } } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, action: true, createdAt: true, target: true } }),
  ]);

  const stats: { label: string; value: string; hint: string; icon: IconName }[] = [
    { label: "Paid order value", value: money(revenue._sum.amountCents ?? 0), hint: "Sum of PAID orders", icon: "orders" },
    { label: "Customers", value: customers.toLocaleString(), hint: "Active customer accounts", icon: "customers" },
    { label: "Orders", value: orders.toLocaleString(), hint: "All orders on record", icon: "subscriptions" },
    { label: "Reports", value: reports.toLocaleString(), hint: "Generated reports", icon: "reports" },
    { label: "API failures · 24h", value: errors.toLocaleString(), hint: "Provider calls that failed", icon: "api" },
  ];

  return (
    <div className="grid gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Command center</p>
          <h1 className="font-display mt-1 text-3xl font-extrabold text-ink sm:text-4xl">Overview</h1>
          <p className="mt-2 max-w-2xl text-muted">Live operational totals, read straight from the database. No sample metrics are shown anywhere in this console.</p>
        </div>
        <span className="admin-chip"><span className="size-1.5 rounded-full bg-good" /> Live data</span>
      </header>

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(stat => (
          <article key={stat.label} className="admin-card group relative overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-0.5">
            <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-gradient-to-br from-blue-500/12 to-sky-400/0 blur-xl transition group-hover:from-blue-500/20" />
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-400 text-white shadow-[0_8px_18px_-12px_rgb(37_99_255/0.9)]">
                <AdminIcon name={stat.icon} className="size-[18px]" />
              </span>
              <p className="text-sm font-medium text-muted">{stat.label}</p>
            </div>
            <p className="tabular mt-4 text-[1.9rem] font-extrabold leading-none text-ink">{stat.value}</p>
            <p className="mt-2 text-xs text-faint">{stat.hint}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="admin-card p-6">
          <h2 className="font-display text-lg font-bold text-ink">Report pipeline</h2>
          <p className="mt-2 text-sm text-muted">
            Paid reports require a licensed supplier adapter and explicit commerce activation. NHTSA decoding returns
            specifications and recall campaigns only — it is not vehicle history, and the console never presents it as such.
          </p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-4">
              <dt className="text-xs uppercase tracking-wider text-faint">Customers</dt>
              <dd className="tabular mt-1 text-xl font-bold text-ink">{customers.toLocaleString()}</dd>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4">
              <dt className="text-xs uppercase tracking-wider text-faint">Reports on record</dt>
              <dd className="tabular mt-1 text-xl font-bold text-ink">{reports.toLocaleString()}</dd>
            </div>
          </dl>
        </section>

        <section className="admin-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink">Recent activity</h2>
            <Link href="/admin/activity" className="text-sm font-semibold text-blue-600 hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-sm text-faint">No administrative events recorded yet.</p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {recent.map(row => (
                <li key={row.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition hover:bg-surface">
                  <span className="truncate font-medium text-ink">{row.action.replaceAll("_", " ").toLowerCase()}</span>
                  <span className="tabular shrink-0 text-xs text-faint">{row.createdAt.toISOString().slice(5, 16).replace("T", " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

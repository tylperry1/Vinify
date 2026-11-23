import Link from "next/link";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { change, dashboardMetrics, rangeLabels, rangeKeys, resolveRange } from "@/lib/server/metrics";
import { BarList, CompletionRing, TrendChart } from "@/components/admin/charts";
import { AdminIcon, type IconName } from "@/components/admin/icons";

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const compact = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export default async function Overview({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  await requireAdmin();
  const { range: rangeKey, from, to } = await searchParams;
  const range = resolveRange(rangeKey, from, to);
  const m = await dashboardMetrics(range);

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
  const [today, month] = await Promise.all([
    db.order.aggregate({ where: { status: "PAID", createdAt: { gte: startOfToday } }, _sum: { amountCents: true } }),
    db.order.aggregate({ where: { status: "PAID", createdAt: { gte: startOfMonth } }, _sum: { amountCents: true } }),
  ]);

  const kpis: { label: string; value: string; hint: string; icon: IconName; delta?: number | null }[] = [
    { label: "Revenue", value: money(m.revenue), hint: range.label, icon: "orders", delta: change(m.revenue, m.previous.revenue) },
    { label: "Revenue today", value: money(today._sum.amountCents ?? 0), hint: "Since local midnight", icon: "activity" },
    { label: "Revenue this month", value: money(month._sum.amountCents ?? 0), hint: "Since the 1st", icon: "analytics" },
    { label: "Paid orders", value: m.paidOrders.toLocaleString(), hint: `${m.orders.toLocaleString()} created in range`, icon: "subscriptions", delta: change(m.paidOrders, m.previous.paidOrders) },
    { label: "Customers", value: m.totalCustomers.toLocaleString(), hint: `${m.newCustomers} new in range`, icon: "customers", delta: change(m.newCustomers, m.previous.customers) },
    { label: "VIN searches", value: m.searches.toLocaleString(), hint: "Decodes run in range", icon: "search", delta: change(m.searches, m.previous.searches) },
    { label: "Reports completed", value: m.completedReports.toLocaleString(), hint: `${m.pendingReports} pending · ${m.failedReports} failed`, icon: "reports" },
    { label: "Refunds", value: money(m.refunds), hint: "Refunded orders in range", icon: "signout" },
    { label: "Avg order value", value: money(m.aov), hint: "Paid orders in range", icon: "orders" },
    { label: "Conversion", value: m.conversion === null ? "—" : `${(m.conversion * 100).toFixed(1)}%`, hint: "Paid orders ÷ VIN searches", icon: "analytics" },
    { label: "Est. gross profit", value: money(m.grossProfit), hint: "After refunds, provider costs, fee estimate", icon: "analytics" },
  ];

  const filters = rangeKeys.filter(key => key !== "custom");

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Command center</p>
          <h1 className="font-display mt-1 text-3xl font-extrabold text-ink sm:text-4xl">Executive overview</h1>
          <p className="mt-2 max-w-2xl text-muted">{range.label}. Every figure is aggregated from live order, report, customer and provider rows — nothing is sampled or invented.</p>
        </div>
        <span className="admin-chip"><span className="size-1.5 rounded-full bg-good" /> Live data</span>
      </header>

      <nav aria-label="Date range" className="flex flex-wrap items-center gap-2">
        {filters.map(key => (
          <Link key={key} href={`/admin?range=${key}`} aria-current={range.key === key ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${range.key === key ? "border-blue-500 bg-blue-500 text-white shadow-[0_8px_18px_-12px_rgb(37_99_255/0.9)]" : "border-line bg-white text-muted hover:text-ink"}`}>
            {rangeLabels[key]}
          </Link>
        ))}
        <form className="flex flex-wrap items-center gap-2" action="/admin" method="get">
          <input type="hidden" name="range" value="custom" />
          <label className="sr-only" htmlFor="from">From date</label>
          <input id="from" name="from" type="date" defaultValue={range.key === "custom" ? from : undefined} className="admin-input !mt-0 w-auto py-1.5 text-sm" required />
          <label className="sr-only" htmlFor="to">To date</label>
          <input id="to" name="to" type="date" defaultValue={range.key === "custom" ? to : undefined} className="admin-input !mt-0 w-auto py-1.5 text-sm" required />
          <button className={`rounded-full border px-3 py-1.5 text-sm font-medium ${range.key === "custom" ? "border-blue-500 bg-blue-500 text-white" : "border-line bg-white text-muted hover:text-ink"}`}>Custom</button>
        </form>
      </nav>

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(kpi => (
          <article key={kpi.label} className="admin-card group relative overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-0.5">
            <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-gradient-to-br from-blue-500/12 to-sky-400/0 blur-xl transition group-hover:from-blue-500/20" />
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-sky-400 text-white">
                  <AdminIcon name={kpi.icon} className="size-4" />
                </span>
                <span className="text-sm font-medium text-muted">{kpi.label}</span>
              </span>
              {kpi.delta != null && kpi.delta !== 0 && (
                <span className={`tabular rounded-full px-2 py-0.5 text-[11px] font-bold ${kpi.delta > 0 ? "bg-good-bg text-good" : "bg-bad-bg text-bad"}`}>
                  {kpi.delta > 0 ? "▲" : "▼"} {Math.abs(kpi.delta)}%
                </span>
              )}
            </div>
            <p className="tabular mt-4 text-[1.75rem] font-extrabold leading-none text-ink">{kpi.value}</p>
            <p className="mt-2 text-xs text-faint">{kpi.hint}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <TrendChart points={m.series.revenue} title="Revenue" format={compact} />
        <TrendChart points={m.series.orders} title="Paid orders" />
        <TrendChart points={m.series.customers} title="New customers" accent="#38b6ff" />
        <TrendChart points={m.series.reports} title="Reports generated" accent="#0f8a5f" />
        <CompletionRing completed={m.completedReports} pending={m.pendingReports} failed={m.failedReports} />
        <BarList title="Sales by package" rows={m.plans.map(p => ({ label: p.planId, value: p.revenueCents, hint: `${p.orders} order${p.orders === 1 ? "" : "s"}` }))} format={compact} />
        <BarList title="Provider costs" rows={m.providers.map(p => ({ label: p.provider, value: p.costCents, hint: `${p.calls} calls` }))} format={money} />
        <section className="admin-card p-6">
          <h2 className="font-display text-sm font-bold text-ink">Profitability · estimate</h2>
          <dl className="mt-4 grid gap-2.5 text-sm">
            <Line label="Gross revenue" value={money(m.revenue)} />
            <Line label="Refunds" value={`−${money(m.refunds)}`} tone="text-bad" />
            <Line label="Provider costs" value={`−${money(m.providerCosts)}`} tone="text-bad" />
            <Line label="Stripe fees (2.9% + $0.30)" value={`−${money(m.stripeFees)}`} tone="text-bad" />
            <div className="mt-1 border-t border-line pt-3">
              <Line label="Estimated gross profit" value={money(m.grossProfit)} strong />
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-faint">
            This is an estimate for planning, not an accounting record. Stripe fees use the standard US card rate; provider costs come from recorded API usage rows only. Refunds are counted at full order value.
          </p>
        </section>
      </div>

      <p className="rounded-xl border border-line bg-white p-5 text-sm text-muted">
        Paid reports require a licensed supplier adapter and explicit commerce activation. NHTSA decoding returns specifications and recall campaigns only — it is not vehicle history, and this console never presents it as such.
      </p>
    </div>
  );
}

function Line({ label, value, tone = "text-ink", strong = false }: { label: string; value: string; tone?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? "font-semibold text-ink" : "text-muted"}>{label}</dt>
      <dd className={`tabular ${strong ? "text-base font-extrabold" : "font-semibold"} ${tone}`}>{value}</dd>
    </div>
  );
}

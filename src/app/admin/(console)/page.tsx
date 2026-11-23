import Link from "next/link";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { change, dashboardMetrics, rangeLabels, rangeKeys, resolveRange } from "@/lib/server/metrics";
import { BarList, CompletionRing, Funnel, Sparkline, TrendChart } from "@/components/admin/charts";
import { AdminIcon, type IconName } from "@/components/admin/icons";
import { KeyValue, PageHeader } from "@/components/admin/ui";

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Kpi = {
  label: string; value: string; hint: string; icon: IconName;
  delta?: number | null; suffix?: string; spark?: number[]; accent?: string;
};

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

  const revenueSeries = m.series.revenue.map(point => point.value);
  const orderSeries = m.series.orders.map(point => point.value);
  const aovSeries = revenueSeries.map((value, index) => (orderSeries[index] ? Math.round(value / orderSeries[index]) : 0));
  const profitSeries = revenueSeries.map((value, index) =>
    value - (m.series.refunds[index]?.value ?? 0) - (m.series.costs[index]?.value ?? 0) - Math.round(value * 0.029) - (orderSeries[index] ?? 0) * 30);
  const previousAov = m.previous.paidOrders ? Math.round(m.previous.revenue / m.previous.paidOrders) : 0;
  const previousConversion = m.previous.searches ? (m.previous.paidOrders / m.previous.searches) * 100 : null;
  const conversion = m.conversion === null ? null : m.conversion * 100;

  const kpis: Kpi[] = [
    { label: "Revenue", value: money(m.revenue), hint: `${range.label} · paid orders only`, icon: "payments", delta: change(m.revenue, m.previous.revenue), spark: revenueSeries, accent: "#2563ff" },
    { label: "Revenue today", value: money(today._sum.amountCents ?? 0), hint: "Since local midnight", icon: "activity" },
    { label: "Revenue this month", value: money(month._sum.amountCents ?? 0), hint: "Since the 1st", icon: "financials" },
    { label: "Paid orders", value: m.paidOrders.toLocaleString(), hint: `${m.orders.toLocaleString()} created in range`, icon: "orders", delta: change(m.paidOrders, m.previous.paidOrders), spark: orderSeries, accent: "#2563ff" },
    { label: "Customers", value: m.totalCustomers.toLocaleString(), hint: `${m.newCustomers} new in range`, icon: "customers", delta: change(m.newCustomers, m.previous.customers), spark: m.series.customers.map(p => p.value), accent: "#38b6ff" },
    { label: "VIN searches", value: m.searches.toLocaleString(), hint: "Decodes run in range", icon: "search", delta: change(m.searches, m.previous.searches), spark: m.series.searches.map(p => p.value), accent: "#38b6ff" },
    { label: "Reports completed", value: m.completedReports.toLocaleString(), hint: `${m.pendingReports} pending · ${m.failedReports} failed`, icon: "reports", delta: change(m.completedReports, m.previous.completedReports), spark: m.series.reports.map(p => p.value), accent: "#0f8a5f" },
    { label: "Pending reports", value: m.pendingReports.toLocaleString(), hint: "Queued or fetching in range", icon: "clock" },
    { label: "Refunds", value: money(m.refunds), hint: "Refunded orders in range", icon: "refunds", spark: m.series.refunds.map(p => p.value), accent: "#b42318" },
    { label: "Avg order value", value: money(m.aov), hint: "Paid orders in range", icon: "analytics", delta: change(m.aov, previousAov), spark: aovSeries, accent: "#2563ff" },
    {
      label: "Conversion", value: conversion === null ? "—" : `${conversion.toFixed(1)}%`,
      hint: m.conversion === null ? "No VIN searches in range" : "Paid orders ÷ VIN searches",
      icon: "filter",
      delta: conversion !== null && previousConversion !== null ? Math.round((conversion - previousConversion) * 10) / 10 : null,
      suffix: " pts",
    },
    { label: "Est. gross profit", value: money(m.grossProfit), hint: "After refunds, provider costs and fee estimate", icon: "costs", spark: profitSeries, accent: "#0f8a5f" },
  ];

  const filters = rangeKeys.filter(key => key !== "custom");
  const renderedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Command center"
        title="Executive overview"
        description={`${range.label}. Every figure is aggregated from live order, report, customer, search and provider rows — nothing is sampled or invented.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="admin-chip"><span className="size-1.5 rounded-full bg-good" aria-hidden="true" /> Live records</span>
            <span className="admin-chip">Rendered {renderedAt}</span>
          </div>
        }
      />

      <nav aria-label="Date range" className="admin-card flex flex-col gap-2 p-2.5 xl:flex-row xl:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map(key => (
            <Link key={key} href={`/admin?range=${key}`} aria-current={range.key === key ? "page" : undefined}
              className={`rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition ${range.key === key ? "bg-blue-500 text-white shadow-[0_10px_22px_-16px_rgb(37_99_255/1)]" : "text-muted hover:bg-surface hover:text-ink"}`}>
              {rangeLabels[key]}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap items-center gap-2 xl:ml-auto" action="/admin" method="get">
          <input type="hidden" name="range" value="custom" />
          <label className="sr-only" htmlFor="from">From date</label>
          <input id="from" name="from" type="date" defaultValue={range.key === "custom" ? from : undefined} className="admin-input !mt-0 !w-[9.5rem] py-1.5 text-sm" required />
          <span aria-hidden="true" className="text-xs text-faint">to</span>
          <label className="sr-only" htmlFor="to">To date</label>
          <input id="to" name="to" type="date" defaultValue={range.key === "custom" ? to : undefined} className="admin-input !mt-0 !w-[9.5rem] py-1.5 text-sm" required />
          <button className={`rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition ${range.key === "custom" ? "bg-blue-500 text-white" : "border border-line text-muted hover:text-ink"}`}>Apply range</button>
        </form>
      </nav>

      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kpis.map(kpi => <KpiCard key={kpi.label} kpi={kpi} />)}
      </section>

      <TrendChart points={m.series.revenue} title="Revenue" format="compact" description="Paid order value per interval, in the selected window."
        empty="No paid revenue in this period" emptyHint="Paid Stripe orders will draw the revenue trend here." />

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart points={m.series.orders} title="Paid orders" description="Count of orders settled as PAID."
          empty="No paid orders in this period" emptyHint="Orders appear once Stripe confirms payment." />
        <TrendChart points={m.series.searches} title="VIN search activity" accent="#38b6ff" description="Decodes recorded by the public VIN decoder."
          empty="No VIN decodes in this period" emptyHint="Every decoded VIN is stored and counted here." />
        <TrendChart points={m.series.customers} title="Customer growth" accent="#38b6ff" description="New customer accounts created."
          empty="No new customers in this period" emptyHint="Registrations in this window will appear here." />
        <TrendChart points={m.series.reports} title="Report generation" accent="#0f8a5f" description="Reports actually generated, not requested."
          empty="No reports generated in this period" emptyHint="A generated report requires a licensed history provider." />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Funnel stages={[
          { label: "VIN decodes", value: m.searches, hint: "Public decoder activity in range" },
          { label: "Orders created", value: m.orders, hint: "All orders, any status" },
          { label: "Orders paid", value: m.paidOrders, hint: "Settled by Stripe" },
          { label: "Reports completed", value: m.completedReports, hint: "Generated reports" },
        ]} />
        <CompletionRing completed={m.completedReports} pending={m.pendingReports} failed={m.failedReports} />
        <BarList title="Provider performance" rows={m.providers.map(provider => ({
          label: provider.provider,
          value: provider.calls,
          hint: `${provider.successRate}% ok · ${provider.avgLatency} ms`,
        }))} empty="No provider calls in this period" emptyHint="Supplier attempts are recorded with latency and cost."
          description="Calls recorded in range, with success rate and mean latency." />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BarList title="Sales by package" rows={m.plans.map(plan => ({ label: plan.planId, value: plan.revenueCents, hint: `${plan.orders} order${plan.orders === 1 ? "" : "s"}` }))}
          format="compact" empty="No paid orders in this period" emptyHint="Package revenue is grouped from paid orders." />
        <BarList title="Provider costs" rows={m.providers.map(provider => ({ label: provider.provider, value: provider.costCents, hint: `${provider.calls} calls` }))}
          format="currency" empty="No provider cost recorded" emptyHint="Costs come from recorded API usage rows only." />

        <section className="admin-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-bold text-ink">Profitability · estimate</h2>
              <p className="mt-1 text-xs text-faint">Planning estimate, not an accounting record.</p>
            </div>
            <span className="admin-badge" data-tone="neutral">Estimate</span>
          </div>
          <dl className="mt-4 grid gap-2.5 text-sm">
            <Line label="Gross revenue" value={money(m.revenue)} />
            <Line label="Refunds" value={`−${money(m.refunds)}`} tone="text-bad" />
            <Line label="Provider costs" value={`−${money(m.providerCosts)}`} tone="text-bad" />
            <Line label="Stripe fees (2.9% + $0.30)" value={`−${money(m.stripeFees)}`} tone="text-bad" />
            <div className="mt-1 border-t border-line pt-3">
              <Line label="Estimated gross profit" value={money(m.grossProfit)} strong />
            </div>
          </dl>
          <p className="mt-4 text-[11px] leading-relaxed text-faint">
            Stripe fees use the standard US card rate. Provider costs come from recorded API usage rows only. Refunds are counted at full order value.
          </p>
        </section>
      </div>

      <section className="admin-card flex flex-wrap items-start gap-4 p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-faint"><AdminIcon name="lock" className="size-5" /></span>
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted">
          Paid reports require a licensed supplier adapter and explicit commerce activation. NHTSA decoding returns specifications and recall campaigns only — it is not vehicle history, and this console never presents it as such.
        </p>
        <Link href="/admin/health" className="admin-button-secondary">Check system health</Link>
      </section>

      <dl className="grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <KeyValue label="Window" value={range.label} />
        <KeyValue label="Comparison" value="Previous window of identical length" />
        <KeyValue label="Open tickets" value={m.openTickets.toLocaleString()} />
        <KeyValue label="Data source" value="PostgreSQL via Prisma" />
      </dl>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const delta = kpi.delta;
  return (
    <article className="admin-kpi flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-sky-400 text-white shadow-[0_8px_16px_-12px_rgb(37_99_255/1)]">
            <AdminIcon name={kpi.icon} className="size-4" />
          </span>
          <span className="truncate text-[13px] font-semibold text-muted">{kpi.label}</span>
        </span>
        {delta != null && (
          <span className={`tabular shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${delta > 0 ? "bg-good-bg text-good" : delta < 0 ? "bg-bad-bg text-bad" : "bg-surface text-faint"}`}
            title="Change against the previous window of the same length">
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta)}{kpi.suffix ?? "%"}
          </span>
        )}
      </div>
      <p className="tabular text-[1.65rem] font-extrabold leading-none tracking-tight text-ink">{kpi.value}</p>
      <div className="mt-auto flex items-end justify-between gap-3">
        <p className="text-[11px] leading-relaxed text-faint">{kpi.hint}</p>
        {kpi.spark && kpi.spark.some(value => value > 0) && (
          <span className="w-20 shrink-0 opacity-80"><Sparkline values={kpi.spark} accent={kpi.accent} /></span>
        )}
      </div>
    </article>
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

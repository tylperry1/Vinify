import "server-only";
import { db } from "./db";

/**
 * Executive metrics, computed only from rows that exist. Nothing here is
 * synthesised: an empty database produces zeroes and empty series, and the UI
 * says so rather than drawing a decorative curve.
 */
export const rangeKeys = ["today", "yesterday", "7d", "30d", "month", "lastmonth", "year", "custom"] as const;
export type RangeKey = (typeof rangeKeys)[number];

export const rangeLabels: Record<RangeKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  lastmonth: "Last month",
  year: "This year",
  custom: "Custom range",
};

const DAY = 86_400_000;

export function resolveRange(key: string | undefined, from?: string, to?: string) {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let start: Date;
  let end: Date;
  let bucket: "hour" | "day" | "week" | "month";
  let label: string;
  const chosen = (rangeKeys as readonly string[]).includes(key ?? "") ? (key as RangeKey) : "30d";

  switch (chosen) {
    case "today": start = startOfDay(now); end = now; bucket = "hour"; label = rangeLabels.today; break;
    case "yesterday": { const y = startOfDay(new Date(now.getTime() - DAY)); start = y; end = new Date(y.getTime() + DAY - 1); bucket = "hour"; label = rangeLabels.yesterday; break; }
    case "7d": start = startOfDay(new Date(now.getTime() - 6 * DAY)); end = now; bucket = "day"; label = rangeLabels["7d"]; break;
    case "30d": start = startOfDay(new Date(now.getTime() - 29 * DAY)); end = now; bucket = "day"; label = rangeLabels["30d"]; break;
    case "month": start = new Date(now.getFullYear(), now.getMonth(), 1); end = now; bucket = "day"; label = rangeLabels.month; break;
    case "lastmonth": start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 1); bucket = "day"; label = rangeLabels.lastmonth; break;
    case "year": start = new Date(now.getFullYear(), 0, 1); end = now; bucket = "month"; label = rangeLabels.year; break;
    default: {
      const parse = (value?: string) => {
        if (!value) return null;
        const [y, m, d] = value.split("-").map(Number);
        return Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d) ? new Date(y, m - 1, d) : null;
      };
      const customStart = parse(from);
      const customEnd = parse(to);
      start = customStart ?? startOfDay(new Date(now.getTime() - 29 * DAY));
      end = customEnd ? new Date(customEnd.getTime() + DAY - 1) : now;
      if (end < start) [start, end] = [end, start];
      bucket = (end.getTime() - start.getTime()) > 92 * DAY ? "month" : (end.getTime() - start.getTime()) > 2 * DAY ? "day" : "hour";
      label = `Custom · ${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`;
    }
  }

  // Previous window of identical length, for comparison only.
  const span = end.getTime() - start.getTime();
  return { key: chosen, label, start, end, bucket, prevStart: new Date(start.getTime() - span), prevEnd: new Date(start.getTime() - 1) };
}

type Range = ReturnType<typeof resolveRange>;

export async function dashboardMetrics(range: Range) {
  const [paid, refunded, ordersAll, completed, pending, failed, newCustomers, totalCustomers, searches, usage, ticketsOpen, customerRows] = await Promise.all([
    db.order.findMany({ where: { status: "PAID", createdAt: { gte: range.start, lte: range.end } }, select: { amountCents: true, createdAt: true, planId: true } }),
    db.order.findMany({ where: { status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] }, createdAt: { gte: range.start, lte: range.end } }, select: { amountCents: true, createdAt: true } }),
    db.order.count({ where: { createdAt: { gte: range.start, lte: range.end } } }),
    db.report.findMany({ where: { generatedAt: { gte: range.start, lte: range.end } }, select: { generatedAt: true, provider: true } }),
    db.reportRequest.count({ where: { status: { in: ["QUEUED", "FETCHING"] }, createdAt: { gte: range.start, lte: range.end } } }),
    db.reportRequest.count({ where: { status: "FAILED", updatedAt: { gte: range.start, lte: range.end } } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: range.start, lte: range.end } } }),
    db.user.count({ where: { role: "CUSTOMER", deletedAt: null } }),
    db.vinSearch.findMany({ where: { createdAt: { gte: range.start, lte: range.end } }, select: { createdAt: true } }),
    db.apiUsage.findMany({ where: { createdAt: { gte: range.start, lte: range.end } }, select: { provider: true, success: true, latencyMs: true, costCents: true, createdAt: true } }),
    db.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }),
    db.user.findMany({ where: { role: "CUSTOMER", createdAt: { gte: range.start, lte: range.end } }, select: { createdAt: true } }),
  ]);

  const [prevPaid, prevRefunded, prevCustomers, prevSearches, prevCompleted] = await Promise.all([
    db.order.findMany({ where: { status: "PAID", createdAt: { gte: range.prevStart, lte: range.prevEnd } }, select: { amountCents: true } }),
    db.order.findMany({ where: { status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] }, createdAt: { gte: range.prevStart, lte: range.prevEnd } }, select: { amountCents: true } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: range.prevStart, lte: range.prevEnd } } }),
    db.vinSearch.count({ where: { createdAt: { gte: range.prevStart, lte: range.prevEnd } } }),
    db.report.count({ where: { generatedAt: { gte: range.prevStart, lte: range.prevEnd } } }),
  ]);

  const sum = (rows: { amountCents: number }[]) => rows.reduce((total, row) => total + row.amountCents, 0);
  const revenue = sum(paid);
  const refunds = sum(refunded);
  const providerCosts = usage.reduce((total, row) => total + row.costCents, 0);
  // Stripe's standard US card rate. An estimate, never an accounting figure.
  const stripeFees = Math.round(revenue * 0.029) + paid.length * 30;
  const grossProfit = revenue - refunds - providerCosts - stripeFees;

  const byPlan = group(paid, row => row.planId);
  const byProvider = group(usage, row => row.provider);
  const providerStats = [...byProvider.entries()].map(([provider, rows]) => ({
    provider,
    calls: rows.length,
    costCents: rows.reduce((t, r) => t + r.costCents, 0),
    successRate: rows.length ? Math.round((rows.filter(r => r.success).length / rows.length) * 100) : 0,
    avgLatency: rows.length ? Math.round(rows.reduce((t, r) => t + r.latencyMs, 0) / rows.length) : 0,
  }));

  return {
    range,
    revenue,
    refunds,
    orders: ordersAll,
    paidOrders: paid.length,
    aov: paid.length ? Math.round(revenue / paid.length) : 0,
    completedReports: completed.length,
    pendingReports: pending,
    failedReports: failed,
    newCustomers,
    totalCustomers,
    searches: searches.length,
    openTickets: ticketsOpen,
    providerCosts,
    stripeFees,
    grossProfit,
    conversion: searches.length ? paid.length / searches.length : null,
    plans: [...byPlan.entries()].map(([planId, rows]) => ({ planId, orders: rows.length, revenueCents: sum(rows) })).sort((a, b) => b.revenueCents - a.revenueCents),
    providers: providerStats.sort((a, b) => b.costCents - a.costCents),
    previous: {
      revenue: sum(prevPaid),
      refunds: sum(prevRefunded),
      paidOrders: prevPaid.length,
      customers: prevCustomers,
      searches: prevSearches,
      completedReports: prevCompleted,
    },
    series: {
      revenue: bucketize(paid, range, row => row.amountCents),
      orders: bucketize(paid, range, () => 1),
      refunds: bucketize(refunded, range, row => row.amountCents),
      costs: bucketize(usage, range, row => row.costCents),
      customers: bucketize(customerRows, range, () => 1),
      searches: bucketize(searches, range, () => 1),
      reports: bucketize(completed.map(row => ({ createdAt: row.generatedAt })), range, () => 1),
    },
  };
}

function group<T>(rows: T[], keyOf: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const bucket = map.get(key);
    if (bucket) bucket.push(row); else map.set(key, [row]);
  }
  return map;
}

/** Sum a numeric field into evenly spaced buckets covering the range. */
function bucketize<T extends { createdAt: Date }>(rows: T[], range: Range, value: (row: T) => number) {
  const edges: Date[] = [];
  const cursor = new Date(range.start);
  while (cursor <= range.end) {
    edges.push(new Date(cursor));
    if (range.bucket === "hour") cursor.setHours(cursor.getHours() + 1);
    else if (range.bucket === "day") cursor.setDate(cursor.getDate() + 1);
    else cursor.setMonth(cursor.getMonth() + 1);
  }
  if (edges.length === 0) edges.push(new Date(range.start));
  const totals = edges.map(() => 0);
  for (const row of rows) {
    let index = 0;
    for (let i = 0; i < edges.length; i++) if (row.createdAt >= edges[i]) index = i;
    totals[index] += value(row);
  }
  return edges.map((edge, i) => ({
    label: range.bucket === "hour"
      ? `${String(edge.getHours()).padStart(2, "0")}:00`
      : range.bucket === "month"
        ? edge.toLocaleDateString("en-US", { month: "short" })
        : edge.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: totals[i],
  }));
}

/**
 * Percentage change against the previous window. Returns null when there is no
 * prior activity to compare with — a jump from zero is not a percentage, and
 * showing "+100%" would misrepresent it.
 */
export function change(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

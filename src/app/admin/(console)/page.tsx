import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
export default async function Overview() {
  await requireAdmin();
  const [customers, reports, orders, revenue, errors] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER", deletedAt: null } }), db.report.count(), db.order.count(),
    db.order.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
    db.apiUsage.count({ where: { success: false, createdAt: { gte: new Date(Date.now() - 86400_000) } } }),
  ]);
  return <><h1 className="text-3xl font-bold">Overview</h1><p className="my-3 text-muted">Live operational totals. No sample metrics.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Object.entries({ Customers: customers, Reports: reports, Orders: orders, "Paid order value": `$${((revenue._sum.amountCents ?? 0)/100).toFixed(2)}`, "API failures · 24h": errors }).map(([label,value]) => <article key={label} className="rounded-2xl border border-line bg-white p-6"><p className="text-muted">{label}</p><p className="mt-3 text-3xl font-bold">{value}</p></article>)}</div><p className="mt-8 rounded-xl bg-white p-5">Paid reports require a licensed supplier adapter and explicit commerce activation. NHTSA decoding does not include vehicle history.</p></>;
}

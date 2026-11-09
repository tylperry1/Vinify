import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { AccountActions } from "./AccountActions";
import { historyProvider } from "@/lib/server/providers";
import { logout } from "@/app/admin/login/actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your account", robots: { index: false } };
export default async function Account() {
  const user = await currentUser();
  if (!user) return <PageShell><main className="mx-auto max-w-lg px-6 py-16"><h1 className="text-3xl font-bold">Your Vinify account</h1><p className="my-4">Sign in to view your report library. New accounts require an invitation.</p><Link href="/account/login" className="admin-button">Sign in</Link><Link href="/decode" className="ml-5 text-blue-600">Use the free decoder</Link></main></PageShell>;
  const [balance, reports, orders] = await Promise.all([
    db.creditLedger.aggregate({ where: { userId: user.id }, _sum: { delta: true } }),
    db.report.findMany({ where: { userId: user.id }, select: { publicId: true, vin: true, generatedAt: true }, orderBy: { generatedAt: "desc" }, take: 100 }),
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const commerceEnabled = process.env.COMMERCE_ENABLED === "true" && !!await historyProvider();
  return <PageShell><main className="mx-auto max-w-4xl px-6 py-16"><h1 className="text-3xl font-bold">Your account</h1><p className="my-4">{user.email} · {balance._sum.delta ?? 0} report credits</p><form action={logout}><button className="text-blue-600">Sign out</button></form><AccountActions enabled={commerceEnabled}/><h2 className="my-6 text-2xl font-bold">Report library</h2>{reports.length ? reports.map(r => <p key={r.publicId} className="my-3"><Link className="text-blue-600" href={`/account/reports/${r.publicId}`}>{r.vin} · {r.generatedAt.toISOString().slice(0, 10)}</Link></p>) : <p>No reports yet.</p>}<h2 className="my-6 text-2xl font-bold">Orders</h2>{orders.length ? orders.map(o => <p key={o.id}>{o.planId} · {o.currency.toUpperCase()} {(o.amountCents / 100).toFixed(2)} · {o.status}</p>) : <p>No orders yet.</p>}</main></PageShell>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { retryReport } from "../../actions";

export const dynamic = "force-dynamic";

const money = (cents: number, currency = "usd") => `${currency.toUpperCase()} ${(cents / 100).toFixed(2)}`;
const stamp = (value: Date) => value.toISOString().slice(0, 16).replace("T", " ");

const notices: Record<string, string> = {
  "retry-503": "Licensed vehicle history is not available, so the retry did nothing. No credit was reserved.",
  "retry-502": "The provider failed again and the credit was returned.",
  "retry-200": "Report generated.",
  "retry-202": "A request for that VIN is already in flight.",
  "retry-409": "That request is already settled.",
};

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> }) {
  const viewer = await requireAdmin();
  const { id } = await params;
  const { notice } = await searchParams;
  const order = await db.order.findUnique({
    where: { id },
    select: {
      id: true, amountCents: true, currency: true, taxCents: true, status: true, product: true, planId: true,
      promoCode: true, stripeCheckoutSession: true, stripePaymentIntent: true, createdAt: true, updatedAt: true,
      userId: true, user: { select: { id: true, email: true, deletedAt: true } },
    },
  });
  if (!order) notFound();

  const [ledger, requests, audit] = await Promise.all([
    db.creditLedger.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "asc" } }),
    db.reportRequest.findMany({
      where: { userId: order.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, vin: true, status: true, attempts: true, lastError: true, createdAt: true, updatedAt: true, report: { select: { publicId: true } } },
    }),
    db.auditLog.findMany({ where: { target: order.id }, orderBy: { createdAt: "asc" }, take: 20, select: { id: true, action: true, createdAt: true, meta: true } }),
  ]);

  const events: { at: Date; title: string; detail?: string }[] = [
    { at: order.createdAt, title: "Order created", detail: `${order.product.replaceAll("_", " ")} · ${order.planId}` },
    ...(order.stripeCheckoutSession ? [{ at: order.createdAt, title: "Stripe checkout session", detail: order.stripeCheckoutSession }] : []),
    ...(order.stripePaymentIntent ? [{ at: order.updatedAt, title: "Payment intent recorded", detail: order.stripePaymentIntent }] : []),
    ...ledger.map(row => ({ at: row.createdAt, title: row.reason.replaceAll("_", " ").toLowerCase(), detail: `${row.delta > 0 ? "+" : ""}${row.delta} credit${Math.abs(row.delta) === 1 ? "" : "s"}` })),
    ...audit.map(row => ({ at: row.createdAt, title: row.action.replaceAll("_", " ").toLowerCase(), detail: row.meta ? JSON.stringify(row.meta) : undefined })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <div className="grid gap-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/admin/orders" className="hover:text-ink">Orders</Link> <span aria-hidden="true">/</span>{" "}
        <span className="font-mono font-semibold text-ink">{order.id}</span>
      </nav>

      <header className="admin-card flex flex-wrap items-start justify-between gap-5 p-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">{money(order.amountCents, order.currency)}</h1>
          <p className="mt-1 text-sm text-muted">{order.product.replaceAll("_", " ")} · plan {order.planId}</p>
          <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Status" value={order.status} />
            <Fact label="Tax" value={money(order.taxCents, order.currency)} />
            <Fact label="Promo code" value={order.promoCode ?? "—"} />
            <Fact label="Created" value={stamp(order.createdAt)} />
            <Fact label="Updated" value={stamp(order.updatedAt)} />
            <Fact label="Order id" value={<span className="font-mono text-xs">{order.id}</span>} />
            <Fact label="Customer" value={<Link href={`/admin/customers/${order.user.id}`} className="text-blue-600 hover:underline">{order.user.email}</Link>} />
            <Fact label="Account" value={order.user.deletedAt ? "Suspended" : "Active"} />
          </dl>
        </div>
        <div className="grid gap-2 text-sm">
          {order.stripePaymentIntent ? (
            <a className="rounded-lg border border-line px-4 py-2 font-semibold text-blue-600 hover:underline"
              href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntent}`} target="_blank" rel="noreferrer">
              Open payment in Stripe
            </a>
          ) : <span className="rounded-lg border border-dashed border-line px-4 py-2 text-faint">No payment intent</span>}
          {order.stripeCheckoutSession ? (
            <a className="rounded-lg border border-line px-4 py-2 font-semibold text-blue-600 hover:underline"
              href={`https://dashboard.stripe.com/checkout/sessions/${order.stripeCheckoutSession}`} target="_blank" rel="noreferrer">
              Open checkout session
            </a>
          ) : <span className="rounded-lg border border-dashed border-line px-4 py-2 text-faint">No checkout session</span>}
        </div>
      </header>

      {notice && notices[notice] && <p role="status" className="rounded-lg bg-surface p-3 text-sm text-muted">{notices[notice]}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="admin-card p-6">
          <h2 className="font-display text-sm font-bold text-ink">Timeline</h2>
          <p className="mt-1 text-xs text-faint">Built from the order row, its credit ledger entries and audit records. No events are inferred.</p>
          {events.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-line p-4 text-sm text-faint">No events recorded.</p>
          ) : (
            <ol className="mt-5 grid gap-4">
              {events.map((event, index) => (
                <li key={`${event.title}-${index}`} className="relative flex gap-3 pl-1">
                  <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-sky-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold capitalize text-ink">{event.title}</p>
                    {event.detail && <p className="truncate text-xs text-muted">{event.detail}</p>}
                    <p className="tabular text-xs text-faint">{stamp(event.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="admin-card p-6">
          <h2 className="font-display text-sm font-bold text-ink">Credits from this order</h2>
          {ledger.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-line p-4 text-sm text-faint">This order produced no credit movements.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[color:var(--color-line)] text-sm">
              {ledger.map(row => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="admin-chip">{row.reason}</span>
                  <span className={`tabular font-semibold ${row.delta > 0 ? "text-good" : row.delta < 0 ? "text-bad" : "text-muted"}`}>{row.delta > 0 ? "+" : ""}{row.delta}</span>
                  <span className="tabular text-xs text-faint">{stamp(row.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="admin-card p-6">
        <h2 className="font-display text-sm font-bold text-ink">Reports for this customer</h2>
        <p className="mt-1 text-xs text-faint">Retry sends the request through the licensed pipeline again. Without a configured adapter it returns “not available” and reserves no credit.</p>
        {requests.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-line p-4 text-sm text-faint">No report requests for this customer.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[color:var(--color-line)]">
            {requests.map(row => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="font-mono text-ink">{row.vin}</span>
                <span className="admin-chip">{row.status}</span>
                {row.report ? <span className="font-mono text-xs text-muted">{row.report.publicId}</span> : <span className="text-xs text-faint">No report</span>}
                <span className="tabular text-xs text-faint">{row.attempts} attempt{row.attempts === 1 ? "" : "s"}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">{row.lastError ?? ""}</span>
                {viewer.role === "SUPER_ADMIN" && !row.report && ["FAILED", "REFUNDED"].includes(row.status) && (
                  <form action={retryReport}>
                    <input type="hidden" name="request" value={row.id} />
                    <input type="hidden" name="returnTo" value={`/admin/orders/${order.id}`} />
                    <button className="admin-button !py-1.5 text-xs">Retry</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (<><dt className="text-faint">{label}</dt><dd className="font-semibold text-ink">{value}</dd></>);
}

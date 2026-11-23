import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { adjustCredits, adminSendReset, retryReport, updateCustomer } from "../../actions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";

export const dynamic = "force-dynamic";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const date = (value: Date | null | undefined) => (value ? value.toISOString().slice(0, 10) : "—");
const stamp = (value: Date | null | undefined) => (value ? value.toISOString().slice(0, 16).replace("T", " ") : "—");

const notices: Record<string, string> = {
  sent: "Reset link sent.",
  "dev-log": "Development has no email provider, so the reset link was written to .local-test/mail.log. Nothing was delivered.",
  "send-failed": "The email provider rejected the message. Nothing was delivered.",
  "retry-503": "Licensed vehicle history is not available, so the retry did nothing. No credit was reserved.",
  "retry-502": "The provider failed again and the credit was returned.",
  "retry-200": "Report generated.",
  "retry-202": "A request for that VIN is already in flight.",
  "retry-409": "That request is already settled.",
  "email-unavailable": "No email provider is configured, so no reset link could be sent. Nothing was delivered or claimed.",
  missing: "That account no longer exists or is suspended.",
};

export default async function CustomerProfile({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const viewer = await requireAdmin();
  const { id } = await params;
  const { notice } = await searchParams;
  const superAdmin = viewer.role === "SUPER_ADMIN";

  const customer = await db.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, role: true, emailVerified: true, createdAt: true,
      updatedAt: true, deletedAt: true, marketingOptIn: true, stripeCustomer: true,
    },
  });
  if (!customer) notFound();

  const [searches, orders, reports, tickets, ledger, audit, lastLogin, sessions] = await Promise.all([
    db.vinSearch.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 15 }),
    db.order.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.report.findMany({ where: { userId: id }, orderBy: { generatedAt: "desc" }, take: 10, select: { id: true, publicId: true, vin: true, provider: true, generatedAt: true, pdfKey: true } }),
    db.supportTicket.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.creditLedger.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.auditLog.findMany({ where: { OR: [{ actorId: id }, { target: id }] }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.auditLog.findFirst({ where: { actorId: id, action: { in: ["LOGIN", "CUSTOMER_LOGIN"] } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    db.session.count({ where: { userId: id, expires: { gt: new Date() } } }),
  ]);

  const balance = await db.creditLedger.aggregate({ where: { userId: id }, _sum: { delta: true } });
  const failedRequests = await db.reportRequest.findMany({
    where: { userId: id, status: { in: ["FAILED", "REFUNDED"] }, report: null },
    orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, vin: true, status: true, attempts: true, lastError: true, updatedAt: true },
  });

  return (
    <div className="grid gap-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/admin/customers" className="hover:text-ink">Customers</Link> <span aria-hidden="true">/</span>{" "}
        <span className="font-semibold text-ink">{customer.email}</span>
      </nav>

      <header className="admin-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold text-ink">{customer.name ?? customer.email}</h1>
              <span className="admin-chip">{customer.role.replaceAll("_", " ")}</span>
              <span className={`admin-chip ${customer.deletedAt ? "!text-bad" : "!text-good"}`}>{customer.deletedAt ? "Suspended" : "Active"}</span>
              {customer.emailVerified ? <span className="admin-chip">Email verified</span> : <span className="admin-chip">Unverified</span>}
            </div>
            <p className="mt-2 text-sm text-muted">{customer.email}</p>
            <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Fact label="Registered" value={date(customer.createdAt)} />
              <Fact label="Last updated" value={stamp(customer.updatedAt)} />
              <Fact label="Last login" value={stamp(lastLogin?.createdAt)} />
              <Fact label="Active sessions" value={String(sessions)} />
              <Fact label="Credit balance" value={balance._sum.delta ?? 0} />
              <Fact label="Marketing opt-in" value={customer.marketingOptIn ? "Yes" : "No"} />
              <Fact label="Stripe customer" value={customer.stripeCustomer ? "Linked" : "—"} />
              <Fact label="Suspended" value={date(customer.deletedAt)} />
            </dl>
          </div>
          <div className="flex flex-col gap-2">
            {customer.role === "CUSTOMER" && (
              <form action={updateCustomer}>
                <input type="hidden" name="id" value={customer.id} />
                <input type="hidden" name="suspended" value={customer.deletedAt ? "" : "on"} />
                <input type="hidden" name="returnTo" value={`/admin/customers/${customer.id}`} />
                {customer.deletedAt ? (
                  <button className="admin-button-secondary w-full !border-good/40 !text-good">Reactivate account</button>
                ) : (
                  <ConfirmSubmit
                    message={`Suspend ${customer.email}? Every session for this account is deleted immediately. You can reactivate the account later.`}
                    confirmLabel="Suspend account"
                    className="admin-button-danger w-full">Suspend account</ConfirmSubmit>
                )}
              </form>
            )}
            <form action={adminSendReset}>
              <input type="hidden" name="id" value={customer.id} />
              <input type="hidden" name="returnTo" value={`/admin/customers/${customer.id}`} />
              <button className="admin-button-secondary w-full">Send password reset</button>
            </form>
          </div>
        </div>
        {notice && notices[notice] && <p role="status" className="mt-4 rounded-lg bg-surface p-3 text-sm text-muted">{notices[notice]}</p>}
      </header>

      {superAdmin && customer.role === "CUSTOMER" && (
        <section className="admin-card p-6">
          <h2 className="font-display text-sm font-bold text-ink">Adjust credits</h2>
          <form action={adjustCredits} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={customer.id} />
            <input type="hidden" name="returnTo" value={`/admin/customers/${customer.id}`} />
            <input type="hidden" name="key" value={randomUUID()} />
            <label className="text-sm">Delta<input className="admin-input w-32" name="delta" type="number" min={-100} max={100} required /></label>
            <label className="flex-1 text-sm">Reason<input className="admin-input" name="note" minLength={5} maxLength={500} required /></label>
            <button className="admin-button">Apply</button>
          </form>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="VIN searches" empty="No VIN searches recorded." count={searches.length}>
          {searches.map(row => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <Link href={`/vehicles/${row.vin}`} className="font-mono text-blue-600 hover:underline">{row.vin}</Link>
              <span className="truncate text-muted">{[row.year, row.make, row.model].filter(Boolean).join(" ") || "Decoded"}</span>
              <span className="tabular shrink-0 text-xs text-faint">{stamp(row.createdAt)}</span>
            </li>
          ))}
        </Panel>

        <Panel title="Orders" empty="No orders for this customer." count={orders.length}>
          {orders.map(row => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <Link href={`/admin/orders/${row.id}`} className="truncate text-blue-600 hover:underline">{row.id.slice(0, 12)}…</Link>
              <span className="tabular">{money(row.amountCents)}</span>
              <span className="admin-chip">{row.status}</span>
              <span className="tabular shrink-0 text-xs text-faint">{date(row.createdAt)}</span>
            </li>
          ))}
        </Panel>

        <Panel title="Reports" empty="No reports generated for this customer." count={reports.length}>
          {reports.map(row => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="font-mono text-ink">{row.publicId.slice(0, 14)}…</span>
              <span className="text-muted">{row.vin}</span>
              <span className="admin-chip">{row.provider}</span>
              <span className="tabular shrink-0 text-xs text-faint">{date(row.generatedAt)}</span>
            </li>
          ))}
        </Panel>

        <Panel title="Support history" empty="No support tickets." count={tickets.length}>
          {tickets.map(row => (
            <li key={row.id} className="py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-medium text-ink">{row.subject}</span>
                <span className="admin-chip">{row.status}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted">{row.body}</p>
            </li>
          ))}
        </Panel>

        <Panel title="Credit ledger" empty="No credit movements." count={ledger.length}>
          {ledger.map(row => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="admin-chip">{row.reason}</span>
              <span className={`tabular font-semibold ${row.delta > 0 ? "text-good" : row.delta < 0 ? "text-bad" : "text-muted"}`}>{row.delta > 0 ? "+" : ""}{row.delta}</span>
              <span className="tabular shrink-0 text-xs text-faint">{stamp(row.createdAt)}</span>
            </li>
          ))}
        </Panel>

        <Panel title="Security events" empty="No recorded activity." count={audit.length}>
          {audit.map(row => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="truncate text-ink">{row.action.replaceAll("_", " ").toLowerCase()}</span>
              <span className="tabular shrink-0 text-xs text-faint">{stamp(row.createdAt)}</span>
            </li>
          ))}
        </Panel>
      </div>

      {failedRequests.length > 0 && (
        <section className="admin-card p-6">
          <h2 className="font-display text-sm font-bold text-ink">Failed report requests</h2>
          <p className="mt-1 text-xs text-faint">Retry asks the licensed provider again through the normal pipeline; no credit is reserved when no adapter is configured.</p>
          <ul className="mt-3 grid gap-2">
            {failedRequests.map(row => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3 text-sm">
                <span className="font-mono">{row.vin}</span>
                <span className="admin-chip">{row.status} · {row.attempts} attempt{row.attempts === 1 ? "" : "s"}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">{row.lastError ?? "No error recorded"}</span>
                {superAdmin && (
                  <form action={retryReport}>
                    <input type="hidden" name="request" value={row.id} />
                    <input type="hidden" name="returnTo" value={`/admin/customers/${customer.id}`} />
                    <button className="admin-button !py-1.5 text-xs">Retry report</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (<><dt className="text-faint">{label}</dt><dd className="tabular font-semibold text-ink">{value}</dd></>);
}

function Panel({ title, empty, count, children }: { title: string; empty: string; count: number; children: React.ReactNode }) {
  const isEmpty = count === 0;
  return (
    <section className="admin-card p-5">
      <h2 className="font-display text-sm font-bold text-ink">{title}</h2>
      {isEmpty ? (
        <p className="mt-3 rounded-lg border border-dashed border-line p-4 text-sm text-faint">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-[color:var(--color-line)]">{children}</ul>
      )}
    </section>
  );
}

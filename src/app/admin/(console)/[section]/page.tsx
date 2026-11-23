import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/auth";
import { dashboardMetrics, rangeKeys, rangeLabels, resolveRange, change } from "@/lib/server/metrics";
import { emailDeliverable } from "@/lib/server/email";
import { historyProvider } from "@/lib/server/providers";
import { PLANS, formatPrice } from "@/lib/pricing";
import { releaseStaleReports, retryReport, saveProvider, testNhtsa, updateStaff, updateTicket } from "../actions";
import { AdminIcon } from "@/components/admin/icons";
import { BarList, Funnel, TrendChart } from "@/components/admin/charts";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { Card, EmptyState, KeyValue, Notice, PageHeader, Pagination, SortHeader, StatusBadge, TableShell, hrefWith } from "@/components/admin/ui";
import { sectionMeta } from "@/components/admin/nav";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const money = (cents: number, currency = "usd") => `${currency.toUpperCase()} ${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const moneyUsd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortDate = (value: Date) => value.toISOString().slice(0, 10);
const stamp = (value: Date | null | undefined) => (value ? value.toISOString().slice(0, 16).replace("T", " ") : "—");

const notices: Record<string, string> = {
  suspended: "Customer suspended and their sessions revoked.",
  restored: "Customer reactivated.",
  credits: "Credit adjustment written to the ledger.",
  "role-updated": "Role updated. That staff member's sessions were revoked.",
  "ticket-updated": "Ticket status saved.",
  released: "Interrupted reservations released and credits returned.",
  "retry-503": "Licensed vehicle history is not available, so the retry did nothing. No credit was reserved.",
  "retry-502": "The provider failed again and the credit was returned.",
  "retry-200": "Report generated.",
  "retry-202": "A request for that VIN is already in flight.",
  "retry-409": "That request is already settled.",
};

export default async function Section({
  params, searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ q?: string; page?: string; status?: string; sort?: string; dir?: string; range?: string; notice?: string }>;
}) {
  const viewer = await requireAdmin();
  const { section } = await params;
  const meta = sectionMeta[section];
  if (!meta) notFound();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").slice(0, 100).trim();
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Math.min(10_000, Math.floor(Number(sp.page)) || 1));
  const skip = (page - 1) * PAGE_SIZE;
  const sortKey = typeof sp.sort === "string" ? sp.sort : "";
  const dir: "asc" | "desc" = sp.dir === "asc" ? "asc" : "desc";
  const basePath = `/admin/${section}`;
  const query = { q, status, sort: sortKey, dir: sortKey ? dir : "" };
  const superAdmin = viewer.role === "SUPER_ADMIN";
  const notice = sp.notice ? notices[sp.notice] : undefined;
  const like = { contains: q, mode: "insensitive" as const };

  let body: React.ReactNode;
  let actions: React.ReactNode = null;

  // ── Customers ────────────────────────────────────────────────────────
  if (section === "customers") {
    const where: Prisma.UserWhereInput = {
      role: "CUSTOMER",
      ...(status === "suspended" ? { deletedAt: { not: null } } : status === "active" ? { deletedAt: null } : {}),
      ...(q ? { OR: [{ email: like }, { name: like }] } : {}),
    };
    const orderBy: Prisma.UserOrderByWithRelationInput =
      sortKey === "email" ? { email: dir } : sortKey === "created" ? { createdAt: dir } : sortKey === "status" ? { deletedAt: dir } : { createdAt: "desc" };
    const [rows, total] = await Promise.all([
      db.user.findMany({ where, orderBy, take: PAGE_SIZE, skip, select: { id: true, email: true, name: true, createdAt: true, deletedAt: true, emailVerified: true, _count: { select: { orders: true, reports: true, searches: true } } } }),
      db.user.count({ where }),
    ]);
    actions = <span className="admin-chip">{total.toLocaleString()} customer{total === 1 ? "" : "s"}</span>;
    body = (
      <>
        <FilterBar basePath={basePath} q={q} status={status} placeholder="Search email or name" options={[["active", "Active"], ["suspended", "Suspended"]]} />
        <TableShell footer={total > 0 ? <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath={basePath} query={query} label="customers" /> : undefined}>
          <table className="admin-table">
            <thead>
              <tr>
                <th><SortHeader label="Customer" column="email" sort={sortKey} dir={dir} basePath={basePath} query={query} /></th>
                <th>Account</th>
                <th className="hidden md:table-cell">Activity</th>
                <th><SortHeader label="Joined" column="created" sort={sortKey} dir={dir} basePath={basePath} query={query} /></th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/admin/customers/${row.id}`} className="block truncate font-semibold">{row.email}</Link>
                    <span className="mt-0.5 block text-xs text-faint">{row.name ?? "No name on file"}</span>
                  </td>
                  <td>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="admin-badge" data-tone={row.deletedAt ? "bad" : "good"}>{row.deletedAt ? "suspended" : "active"}</span>
                      {!row.emailVerified && <span className="admin-badge" data-tone="warn">unverified</span>}
                    </span>
                  </td>
                  <td className="hidden text-xs text-muted md:table-cell">
                    {row._count.orders} orders · {row._count.reports} reports · {row._count.searches} searches
                  </td>
                  <td className="tabular whitespace-nowrap text-muted">{shortDate(row.createdAt)}</td>
                  <td className="text-right">
                    <Link href={`/admin/customers/${row.id}`} className="admin-button-secondary">Open profile</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-4"><EmptyState icon="customers" title="No customers match" description="Clear the filters or wait for the first registration." /></div>}
        </TableShell>
      </>
    );
  }

  // ── Orders / payments / refunds ─────────────────────────────────────
  else if (section === "orders" || section === "payments" || section === "refunds") {
    const where: Prisma.OrderWhereInput = {
      ...(section === "payments" ? { status: "PAID" } : section === "refunds" ? { status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } } : {}),
      ...(section === "orders" && status ? { status: status as "PAID" } : {}),
      ...(q ? { OR: [{ id: like }, { stripePaymentIntent: like }, { user: { email: like } }] } : {}),
    };
    const orderBy: Prisma.OrderOrderByWithRelationInput =
      sortKey === "amount" ? { amountCents: dir } : sortKey === "status" ? { status: dir } : sortKey === "created" ? { createdAt: dir } : { createdAt: "desc" };
    const [rows, total] = await Promise.all([
      db.order.findMany({ where, orderBy, take: PAGE_SIZE, skip, include: { user: { select: { id: true, email: true } } } }),
      db.order.count({ where }),
    ]);
    actions = <span className="admin-chip">{total.toLocaleString()} {section}</span>;
    body = (
      <>
        <FilterBar basePath={basePath} q={q} status={status} placeholder="Search order, payment intent or email"
          options={section === "orders" ? [["PAID", "Paid"], ["PENDING", "Pending"], ["FAILED", "Failed"], ["REFUNDED", "Refunded"], ["PARTIALLY_REFUNDED", "Partially refunded"]] : undefined} />
        <TableShell footer={total > 0 ? <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath={basePath} query={query} label={section} /> : undefined}>
          <table className="admin-table">
            <thead>
              <tr>
                <th><SortHeader label="Order" column="created" sort={sortKey} dir={dir} basePath={basePath} query={query} /></th>
                <th>Customer</th>
                <th className="hidden md:table-cell">Package</th>
                <th className="text-right"><SortHeader label="Amount" column="amount" sort={sortKey} dir={dir} basePath={basePath} query={query} numeric /></th>
                <th><SortHeader label="Status" column="status" sort={sortKey} dir={dir} basePath={basePath} query={query} /></th>
                <th className="hidden lg:table-cell">Created</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td><Link href={`/admin/orders/${row.id}`} className="font-mono text-xs">{row.id.slice(0, 14)}…</Link></td>
                  <td>
                    <Link href={`/admin/customers/${row.user.id}`} className="block max-w-[220px] truncate text-sm">{row.user.email}</Link>
                  </td>
                  <td className="hidden text-muted md:table-cell">{row.planId}<span className="ml-1 text-xs text-faint">{row.product.replaceAll("_", " ").toLowerCase()}</span></td>
                  <td className="tabular whitespace-nowrap font-semibold text-ink">{money(row.amountCents, row.currency)}</td>
                  <td><StatusBadge value={row.status} /></td>
                  <td className="tabular hidden whitespace-nowrap text-muted lg:table-cell">{stamp(row.createdAt)}</td>
                  <td className="text-right"><Link href={`/admin/orders/${row.id}`} className="admin-button-secondary">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-4"><EmptyState icon="orders" title={`No ${section} recorded`} description={section === "payments" ? "Paid orders appear once Stripe confirms a payment." : section === "refunds" ? "Refunds are recorded by the Stripe webhook." : "Orders will appear here when checkout runs."} /></div>}
        </TableShell>
        {section === "orders" && <p className="text-xs leading-relaxed text-faint">VINs are attached to report requests, not orders — open an order or a customer profile to see the vehicles involved.</p>}
      </>
    );
  }

  // ── Subscriptions ───────────────────────────────────────────────────
  else if (section === "subscriptions") {
    const where: Prisma.SubscriptionWhereInput = { ...(status ? { status: status as "ACTIVE" } : {}), ...(q ? { user: { email: like } } : {}) };
    const [rows, total] = await Promise.all([
      db.subscription.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE_SIZE, skip, include: { user: { select: { email: true } } } }),
      db.subscription.count({ where }),
    ]);
    actions = <span className="admin-chip">{total.toLocaleString()} subscriptions</span>;
    body = (
      <>
        <Notice tone="warn">Recurring billing is not enabled. This table stays empty until subscriptions are activated and Stripe grants are recorded.</Notice>
        <FilterBar basePath={basePath} q={q} status={status} placeholder="Search customer email" options={[["ACTIVE", "Active"], ["TRIALING", "Trialing"], ["PAST_DUE", "Past due"], ["CANCELED", "Canceled"]]} />
        <TableShell footer={total > 0 ? <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath={basePath} query={query} label="subscriptions" /> : undefined}>
          <table className="admin-table">
            <thead><tr><th>Customer</th><th>Plan</th><th>Status</th><th>Reports / period</th><th>Renews</th></tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="max-w-[240px] truncate">{row.user.email}</td>
                  <td className="text-muted">{row.planId}</td>
                  <td><StatusBadge value={row.status} /></td>
                  <td className="tabular text-muted">{row.reportsPerPeriod}</td>
                  <td className="tabular whitespace-nowrap text-muted">{shortDate(row.currentPeriodEnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-4"><EmptyState icon="subscriptions" title="No subscriptions yet" description="Nothing is invented here: the table populates when recurring billing starts." /></div>}
        </TableShell>
      </>
    );
  }

  // ── Products ────────────────────────────────────────────────────────
  else if (section === "products") {
    const sales = await db.order.groupBy({ by: ["planId", "status"], _count: true, _sum: { amountCents: true } });
    const rows = PLANS.map(plan => {
      const paid = sales.filter(row => row.planId === plan.id && row.status === "PAID");
      return {
        plan,
        orders: paid.reduce((sum, row) => sum + row._count, 0),
        revenue: paid.reduce((sum, row) => sum + (row._sum.amountCents ?? 0), 0),
      };
    });
    body = (
      <>
        <Notice tone="info">Catalogue prices are the proposed list in <span className="font-mono text-xs">src/lib/pricing.ts</span> and are not a live checkout configuration. Sales columns are real paid orders.</Notice>
        <TableShell>
          <table className="admin-table">
            <thead><tr><th>Plan</th><th>Billing</th><th>List price</th><th>Reports included</th><th className="text-right">Paid orders</th><th className="text-right">Revenue</th></tr></thead>
            <tbody>
              {rows.map(({ plan, orders, revenue }) => (
                <tr key={plan.id}>
                  <td>
                    <span className="font-semibold text-ink">{plan.name}</span>
                    <span className="mt-0.5 block max-w-[280px] text-xs text-faint">{plan.blurb}</span>
                  </td>
                  <td className="text-muted">{plan.interval === "month" ? "Monthly" : plan.interval === "one_time" ? "One-time" : "Custom"}</td>
                  <td className="tabular font-semibold text-ink">{formatPrice(plan.priceCents)}</td>
                  <td className="tabular text-muted">{plan.reports ?? "Custom"}</td>
                  <td className="tabular text-right text-muted">{orders.toLocaleString()}</td>
                  <td className="tabular text-right font-semibold text-ink">{moneyUsd(revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </>
    );
  }

  // ── Staff ───────────────────────────────────────────────────────────
  else if (section === "staff") {
    if (!superAdmin) {
      body = <AccessDenied />;
    } else {
      const rows = await db.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, ...(q ? { email: like } : {}) }, orderBy: { createdAt: "asc" }, take: 100 });
      actions = <span className="admin-chip">{rows.length} staff accounts</span>;
      body = (
        <>
          <FilterBar basePath={basePath} q={q} placeholder="Search staff email" />
          <TableShell>
            <table className="admin-table">
              <thead><tr><th>Staff</th><th>Role</th><th>Joined</th><th className="text-right">Change role</th></tr></thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td className="font-semibold text-ink">{row.email}{row.id === viewer.id && <span className="admin-badge ml-2" data-tone="info">you</span>}</td>
                    <td><StatusBadge value={row.role} /></td>
                    <td className="tabular text-muted">{shortDate(row.createdAt)}</td>
                    <td>
                      <form action={updateStaff} className="flex items-center justify-end gap-2">
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="returnTo" value={basePath} />
                        <select aria-label={`Role for ${row.email}`} name="role" defaultValue={row.role} disabled={row.id === viewer.id} className="admin-select !mt-0 !w-auto py-1.5 text-sm">
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                        {row.id === viewer.id
                          ? <span className="text-xs text-faint">Your own role</span>
                          : <ConfirmSubmit message={`Change ${row.email} to the selected role? Their sessions will be revoked immediately.`} confirmLabel="Update role" className="admin-button-secondary">Save</ConfirmSubmit>}
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
          <p className="text-xs text-faint">New staff are provisioned with <span className="font-mono">npm run admin:create</span>, which writes the account directly against the configured database.</p>
        </>
      );
    }
  }

  // ── Support ─────────────────────────────────────────────────────────
  else if (section === "support") {
    const where: Prisma.SupportTicketWhereInput = {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ email: like }, { subject: like }, { body: like }] } : {}),
    };
    const [rows, total] = await Promise.all([
      db.supportTicket.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE_SIZE, skip }),
      db.supportTicket.count({ where }),
    ]);
    actions = <span className="admin-chip">{total.toLocaleString()} tickets</span>;
    body = (
      <>
        <FilterBar basePath={basePath} q={q} status={status} placeholder="Search email, subject or message" options={[["open", "Open"], ["in_progress", "In progress"], ["resolved", "Resolved"]]} />
        <TableShell footer={total > 0 ? <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath={basePath} query={query} label="tickets" /> : undefined}>
          <table className="admin-table">
            <thead><tr><th>Ticket</th><th>Customer</th><th>Opened</th><th>Status</th><th className="text-right">Update</th></tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="max-w-[420px]">
                    <span className="font-semibold text-ink">{row.subject}</span>
                    <span className="mt-0.5 block text-xs uppercase tracking-wider text-faint">{row.category}</span>
                    <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-xs text-muted">{row.body}</p>
                  </td>
                  <td className="max-w-[200px] truncate">{row.email}</td>
                  <td className="tabular whitespace-nowrap text-muted">{stamp(row.createdAt)}</td>
                  <td><StatusBadge value={row.status} /></td>
                  <td>
                    <form action={updateTicket} className="flex items-center justify-end gap-2">
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="returnTo" value={basePath} />
                      <select aria-label="Ticket status" name="status" defaultValue={row.status} className="admin-select !mt-0 !w-auto py-1.5 text-sm">
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      <button className="admin-button-secondary">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-4"><EmptyState icon="support" title="No tickets match" description="The support form writes rows here as customers submit them." /></div>}
        </TableShell>
      </>
    );
  }

  // ── Reports ─────────────────────────────────────────────────────────
  else if (section === "reports") {
    const where: Prisma.ReportRequestWhereInput = {
      ...(status ? { status: status as "FAILED" } : {}),
      ...(q ? { vin: { contains: q.toUpperCase() } } : {}),
    };
    const [rows, total] = await Promise.all([
      db.reportRequest.findMany({
        where, orderBy: { createdAt: "desc" }, take: PAGE_SIZE, skip,
        include: { report: { select: { publicId: true } }, user: { select: { id: true, email: true } }, _count: { select: { supplierCalls: true } } },
      }),
      db.reportRequest.count({ where }),
    ]);
    actions = superAdmin ? (
      <form action={releaseStaleReports}>
        <ConfirmSubmit message="Mark every request stuck in FETCHING for over ten minutes as failed and return its reserved credit?" confirmLabel="Release reservations">
          Release stalled
        </ConfirmSubmit>
      </form>
    ) : <span className="admin-chip">{total.toLocaleString()} requests</span>;
    body = (
      <>
        <FilterBar basePath={basePath} q={q} status={status} placeholder="Search VIN" options={[["QUEUED", "Queued"], ["FETCHING", "Fetching"], ["SUCCEEDED", "Succeeded"], ["FAILED", "Failed"], ["REFUNDED", "Refunded"]]} />
        <TableShell footer={total > 0 ? <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath={basePath} query={query} label="requests" /> : undefined}>
          <table className="admin-table">
            <thead><tr><th>VIN</th><th>Customer</th><th>Status</th><th>Report</th><th>Attempts</th><th>Updated</th><th className="text-right">Action</th></tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="font-mono text-xs font-semibold text-ink">{row.vin}</td>
                  <td><Link href={`/admin/customers/${row.user.id}`} className="block max-w-[200px] truncate text-sm">{row.user.email}</Link></td>
                  <td><StatusBadge value={row.status} /></td>
                  <td className="text-muted">{row.report?.publicId ?? <span className="text-faint">Not generated</span>}</td>
                  <td className="tabular text-muted">{row.attempts} <span className="text-xs text-faint">· {row._count.supplierCalls} calls</span></td>
                  <td className="tabular whitespace-nowrap text-muted">{stamp(row.updatedAt)}</td>
                  <td className="text-right">
                    {superAdmin && !row.report && ["FAILED", "REFUNDED"].includes(row.status) ? (
                      <form action={retryReport}>
                        <input type="hidden" name="request" value={row.id} />
                        <input type="hidden" name="returnTo" value={basePath} />
                        <ConfirmSubmit message={`Retry report generation for ${row.vin}? Credentials are only reserved when a licensed adapter exists.`} confirmLabel="Retry report" className="admin-button-secondary">Retry</ConfirmSubmit>
                      </form>
                    ) : row.lastError ? <span className="block max-w-[200px] truncate text-xs text-bad" title={row.lastError}>{row.lastError}</span> : <span className="text-xs text-faint">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-4"><EmptyState icon="reports" title="No report requests match" description="Requests are created when a paid report is generated." /></div>}
        </TableShell>
      </>
    );
  }

  // ── VIN searches ────────────────────────────────────────────────────
  else if (section === "vin-searches") {
    const where: Prisma.VinSearchWhereInput = q
      ? { OR: [{ vin: { contains: q.toUpperCase() } }, { make: like }, { model: like }, { user: { email: like } }] }
      : {};
    const [rows, total] = await Promise.all([
      db.vinSearch.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE_SIZE, skip, include: { user: { select: { id: true, email: true } } } }),
      db.vinSearch.count({ where }),
    ]);
    actions = <span className="admin-chip">{total.toLocaleString()} decodes</span>;
    body = (
      <>
        <FilterBar basePath={basePath} q={q} placeholder="Search VIN, make, model or email" />
        <TableShell footer={total > 0 ? <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath={basePath} query={query} label="searches" /> : undefined}>
          <table className="admin-table">
            <thead><tr><th>VIN</th><th>Vehicle</th><th>Customer</th><th>Decoded</th></tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="font-mono text-xs font-semibold text-ink">{row.vin}</td>
                  <td className="text-muted">{[row.year, row.make, row.model].filter(Boolean).join(" ") || <span className="text-faint">Not decoded</span>}</td>
                  <td>{row.user ? <Link href={`/admin/customers/${row.user.id}`} className="text-sm">{row.user.email}</Link> : <span className="text-xs text-faint">Anonymous</span>}</td>
                  <td className="tabular whitespace-nowrap text-muted">{stamp(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-4"><EmptyState icon="vin" title="No VIN searches match" description="Every decode from the public tool is stored and listed here." /></div>}
        </TableShell>
      </>
    );
  }

  // ── API center ──────────────────────────────────────────────────────
  else if (section === "api-center") {
    const since = new Date(Date.now() - 24 * 3600_000);
    const providers = await Promise.all(["nhtsa", "licensed-history"].map(async id => {
      const config = await db.apiProvider.findUnique({ where: { id } });
      const calls = await db.apiUsage.findMany({ where: { provider: id, createdAt: { gte: since } }, select: { success: true, latencyMs: true, costCents: true } });
      const last = await db.apiUsage.findFirst({ where: { provider: id }, orderBy: { createdAt: "desc" } });
      return {
        id,
        config,
        calls: calls.length,
        successRate: calls.length ? Math.round((calls.filter(call => call.success).length / calls.length) * 100) : null,
        cost: calls.reduce((sum, call) => sum + call.costCents, 0),
        latency: calls.length ? Math.round(calls.reduce((sum, call) => sum + call.latencyMs, 0) / calls.length) : null,
        last,
      };
    }));
    const usage = await db.apiUsage.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
    actions = (
      <form action={testNhtsa}>
        <button className="admin-button-secondary">Test NHTSA connection</button>
      </form>
    );
    body = (
      <>
        <div className="grid gap-4 lg:grid-cols-2">
          {providers.map(provider => (
            <form key={provider.id} action={saveProvider} className="admin-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-ink">{provider.id === "nhtsa" ? "NHTSA vPIC" : "Licensed history"}</h2>
                  <p className="mt-1 text-xs text-faint">{provider.id === "nhtsa" ? "Public VIN decoder · no key required" : "Requires a supplier contract and adapter"}</p>
                </div>
                <span className="admin-badge" data-tone={provider.successRate === null ? "neutral" : provider.successRate >= 99 ? "good" : provider.successRate >= 80 ? "warn" : "bad"}>
                  {provider.successRate === null ? "no calls" : `${provider.successRate}% ok`}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 border-y border-line py-3">
                <KeyValue label="Calls · 24h" value={provider.calls.toLocaleString()} />
                <KeyValue label="Mean latency" value={provider.latency === null ? "—" : `${provider.latency} ms`} />
                <KeyValue label="Cost · 24h" value={moneyUsd(provider.cost)} />
              </dl>
              <p className="mt-3 text-xs text-faint">
                Credential: {provider.config?.encryptedSecret ? "encrypted secret stored" : provider.id === "licensed-history" && process.env.HISTORY_PROVIDER_API_KEY ? "environment configured" : "none"}
                {provider.last && <> · last call {stamp(provider.last.createdAt)} ({provider.last.success ? "success" : "failed"})</>}
              </p>
              <div className="mt-4 grid gap-3">
                <input type="hidden" name="provider" value={provider.id} />
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input disabled={!superAdmin} type="checkbox" name="enabled" defaultChecked={provider.config?.enabled ?? provider.id === "nhtsa"} /> Enabled
                </label>
                <label className="text-sm text-muted">
                  Cost per successful call (cents)
                  <input disabled={!superAdmin || provider.id === "nhtsa"} className="admin-input" type="number" name="costCents" min={0} max={100000} defaultValue={provider.config?.costCents ?? 0} />
                </label>
                {provider.id === "nhtsa" && <input type="hidden" name="costCents" value="0" />}
                <label className="text-sm text-muted">
                  New credential
                  <input disabled={!superAdmin || provider.id === "nhtsa"} className="admin-input" type="password" name="secret" autoComplete="new-password" maxLength={4096} />
                </label>
                {superAdmin && provider.id === "licensed-history" && provider.config?.encryptedSecret && (
                  <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="clearSecret" /> Remove stored credential</label>
                )}
                {superAdmin
                  ? <button className="admin-button w-fit">Save configuration</button>
                  : <p className="text-xs text-faint">Master Admin required to change provider configuration.</p>}
              </div>
            </form>
          ))}
        </div>
        <Card title="Recent provider calls" description="Every monitored call records outcome, latency and estimated cost." padded={false}>
          <TableShell>
            <table className="admin-table">
              <thead><tr><th>Time</th><th>Provider</th><th>Operation</th><th>Result</th><th>Latency</th><th>Cost</th></tr></thead>
              <tbody>
                {usage.map(row => (
                  <tr key={row.id}>
                    <td className="tabular whitespace-nowrap text-muted">{stamp(row.createdAt)}</td>
                    <td className="text-muted">{row.provider}</td>
                    <td className="text-muted">{row.operation}</td>
                    <td><span className="admin-badge" data-tone={row.success ? "good" : "bad"}>{row.success ? "success" : "failed"}</span></td>
                    <td className="tabular text-muted">{row.latencyMs} ms</td>
                    <td className="tabular text-muted">{moneyUsd(row.costCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {usage.length === 0 && <div className="p-4"><EmptyState icon="api" title="No provider calls recorded" description="Run the NHTSA test to record a real call." /></div>}
          </TableShell>
        </Card>
        <p className="text-xs leading-relaxed text-faint">Secrets are encrypted with AES-256-GCM and never displayed. Leave the credential blank to keep the stored value. Environment credentials are used when no stored credential exists.</p>
      </>
    );
  }

  // ── Providers ───────────────────────────────────────────────────────
  else if (section === "providers") {
    const where: Prisma.SupplierRequestWhereInput = q ? { reportRequest: { vin: { contains: q.toUpperCase() } } } : {};
    const [rows, total, grouped] = await Promise.all([
      db.supplierRequest.findMany({
        where, orderBy: { createdAt: "desc" }, take: PAGE_SIZE, skip,
        include: { reportRequest: { select: { id: true, vin: true, status: true, userId: true } } },
      }),
      db.supplierRequest.count({ where }),
      db.supplierRequest.groupBy({ by: ["provider"], _count: true, _sum: { costCents: true }, _avg: { latencyMs: true } }),
    ]);
    actions = <span className="admin-chip">{total.toLocaleString()} supplier calls</span>;
    body = (
      <>
        <div className="grid gap-4 lg:grid-cols-3">
          {grouped.length === 0 ? <Card title="Provider summary"><EmptyState icon="providers" title="No supplier calls yet" description="Attempts made while generating a report are listed here." /></Card>
            : grouped.map(row => (
              <Card key={row.provider} title={row.provider}>
                <dl className="grid gap-3 text-sm">
                  <KeyValue label="Attempts" value={row._count.toLocaleString()} />
                  <KeyValue label="Recorded cost" value={moneyUsd(row._sum.costCents ?? 0)} />
                  <KeyValue label="Mean latency" value={`${Math.round(row._avg.latencyMs ?? 0)} ms`} />
                </dl>
              </Card>
            ))}
        </div>
        <FilterBar basePath={basePath} q={q} placeholder="Search VIN" />
        <TableShell footer={total > 0 ? <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath={basePath} query={query} label="calls" /> : undefined}>
          <table className="admin-table">
            <thead><tr><th>Time</th><th>Provider</th><th>VIN</th><th>Attempt</th><th>HTTP</th><th>Result</th><th>Latency</th><th>Cost</th></tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="tabular whitespace-nowrap text-muted">{stamp(row.createdAt)}</td>
                  <td className="text-muted">{row.provider}</td>
                  <td className="font-mono text-xs">{row.reportRequest.vin}</td>
                  <td className="tabular text-muted">#{row.attempt}</td>
                  <td className="tabular text-muted">{row.httpStatus ?? "—"}</td>
                  <td><span className="admin-badge" data-tone={row.success ? "good" : "bad"}>{row.success ? "success" : "failed"}</span>{row.error && <span className="ml-2 block max-w-[220px] truncate text-[11px] text-bad" title={row.error}>{row.error}</span>}</td>
                  <td className="tabular text-muted">{row.latencyMs === null ? "—" : `${row.latencyMs} ms`}</td>
                  <td className="tabular text-muted">{moneyUsd(row.costCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-4"><EmptyState icon="providers" title="No supplier calls match" description="Only calls that reached a provider adapter are recorded." /></div>}
        </TableShell>
      </>
    );
  }

  // ── Financials ──────────────────────────────────────────────────────
  else if (section === "financials" || section === "analytics") {
    const range = resolveRange(sp.range, undefined, undefined);
    const m = await dashboardMetrics(range);
    actions = (
      <nav aria-label="Date range" className="flex flex-wrap items-center gap-1.5">
        {rangeKeys.filter(key => key !== "custom").map(key => (
          <Link key={key} href={`${basePath}?range=${key}`} aria-current={range.key === key ? "page" : undefined}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${range.key === key ? "bg-blue-500 text-white" : "border border-line text-muted hover:text-ink"}`}>
            {rangeLabels[key]}
          </Link>
        ))}
      </nav>
    );

    const stats = section === "financials" ? (
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Revenue", value: moneyUsd(m.revenue), hint: range.label, delta: change(m.revenue, m.previous.revenue) },
          { label: "Refunds", value: moneyUsd(m.refunds), hint: "Full order value", delta: change(m.refunds, m.previous.refunds) },
          { label: "Provider costs", value: moneyUsd(m.providerCosts), hint: "Recorded usage only" },
          { label: "Stripe fee estimate", value: moneyUsd(m.stripeFees), hint: "2.9% + $0.30 per paid order" },
          { label: "Estimated gross profit", value: moneyUsd(m.grossProfit), hint: "After refunds, provider costs and fees" },
          { label: "Average order value", value: moneyUsd(m.aov), hint: `${m.paidOrders} paid orders` },
          { label: "Provider cost ratio", value: m.revenue ? `${((m.providerCosts / m.revenue) * 100).toFixed(1)}%` : "—", hint: "Provider cost ÷ revenue" },
          { label: "Refund ratio", value: m.revenue ? `${((m.refunds / m.revenue) * 100).toFixed(1)}%` : "—", hint: "Refunds ÷ revenue" },
        ].map(item => (
          <article key={item.label} className="admin-kpi p-4">
            <p className="text-[13px] font-semibold text-muted">{item.label}</p>
            <p className="tabular mt-2 text-2xl font-extrabold text-ink">{item.value}</p>
            <p className="mt-1 text-[11px] text-faint">{item.hint}</p>
          </article>
        ))}
      </section>
    ) : null;

    body = (
      <>
        {stats}
        <div className="grid gap-4 lg:grid-cols-2">
          <TrendChart points={m.series.revenue} title="Revenue" format="currency" empty="No paid revenue in this window" description="Paid order value per interval." />
          <TrendChart points={m.series.refunds} title="Refunds" accent="#b42318" format="currency" empty="No refunds in this window" />
          <TrendChart points={m.series.orders} title="Paid orders" empty="No paid orders in this window" />
          {section === "analytics" && <TrendChart points={m.series.searches} title="VIN searches" accent="#38b6ff" empty="No decodes in this window" />}
          {section === "analytics" && <TrendChart points={m.series.customers} title="New customers" accent="#38b6ff" empty="No new customers in this window" />}
          {section === "analytics" && <TrendChart points={m.series.reports} title="Reports generated" accent="#0f8a5f" empty="No reports in this window" />}
          <Funnel stages={[
            { label: "VIN decodes", value: m.searches },
            { label: "Orders created", value: m.orders },
            { label: "Orders paid", value: m.paidOrders },
            { label: "Reports completed", value: m.completedReports },
          ]} />
          <BarList title="Provider costs" rows={m.providers.map(p => ({ label: p.provider, value: p.costCents, hint: `${p.calls} calls` }))} format="currency" empty="No provider cost recorded" />
          <BarList title="Revenue by package" rows={m.plans.map(p => ({ label: p.planId, value: p.revenueCents, hint: `${p.orders} paid` }))} format="currency" empty="No paid orders in this window" />
        </div>
        <section className="admin-card p-5">
          <h2 className="font-display text-sm font-bold text-ink">Profitability statement · estimate</h2>
          <dl className="mt-4 grid gap-2.5 text-sm sm:max-w-md">
            <Line label="Gross revenue" value={moneyUsd(m.revenue)} />
            <Line label="Refunds" value={`−${moneyUsd(m.refunds)}`} tone="text-bad" />
            <Line label="Provider costs" value={`−${moneyUsd(m.providerCosts)}`} tone="text-bad" />
            <Line label="Stripe fees (estimate)" value={`−${moneyUsd(m.stripeFees)}`} tone="text-bad" />
            <div className="mt-1 border-t border-line pt-3"><Line label="Estimated gross profit" value={moneyUsd(m.grossProfit)} strong /></div>
          </dl>
          <p className="mt-4 text-[11px] leading-relaxed text-faint">This is a planning estimate, not an accounting record. Stripe fees use the standard US card rate; provider costs come from recorded usage rows only; refunds are counted at full order value.</p>
        </section>
      </>
    );
  }

  // ── Provider costs ──────────────────────────────────────────────────
  else if (section === "provider-costs") {
    const since = new Date(Date.now() - 30 * 86400_000);
    const [usage, supplier] = await Promise.all([
      db.apiUsage.groupBy({ by: ["provider"], where: { createdAt: { gte: since } }, _count: true, _sum: { costCents: true }, _avg: { latencyMs: true } }),
      db.supplierRequest.groupBy({ by: ["provider"], where: { createdAt: { gte: since } }, _count: true, _sum: { costCents: true } }),
    ]);
    const totalCost = usage.reduce((sum, row) => sum + (row._sum.costCents ?? 0), 0);
    body = (
      <>
        <p className="text-sm text-muted">Last 30 days. Two ledgers are shown separately because they measure different things: monitored API calls and supplier attempts attached to report requests.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Monitored API calls" description={`${moneyUsd(totalCost)} recorded across ${usage.reduce((sum, row) => sum + row._count, 0)} calls.`} padded={false}>
            <TableShell>
              <table className="admin-table">
                <thead><tr><th>Provider</th><th>Calls</th><th>Mean latency</th><th className="text-right">Cost</th></tr></thead>
                <tbody>
                  {usage.map(row => (
                    <tr key={row.provider}>
                      <td className="font-semibold text-ink">{row.provider}</td>
                      <td className="tabular text-muted">{row._count.toLocaleString()}</td>
                      <td className="tabular text-muted">{Math.round(row._avg.latencyMs ?? 0)} ms</td>
                      <td className="tabular text-right font-semibold text-ink">{moneyUsd(row._sum.costCents ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {usage.length === 0 && <div className="p-4"><EmptyState icon="costs" title="No recorded API cost" description="Costs appear after a provider call is monitored." /></div>}
            </TableShell>
          </Card>
          <Card title="Supplier attempts" description="Calls attached to report requests, including failures." padded={false}>
            <TableShell>
              <table className="admin-table">
                <thead><tr><th>Provider</th><th>Attempts</th><th className="text-right">Billed cost</th></tr></thead>
                <tbody>
                  {supplier.map(row => (
                    <tr key={row.provider}>
                      <td className="font-semibold text-ink">{row.provider}</td>
                      <td className="tabular text-muted">{row._count.toLocaleString()}</td>
                      <td className="tabular text-right font-semibold text-ink">{moneyUsd(row._sum.costCents ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {supplier.length === 0 && <div className="p-4"><EmptyState icon="providers" title="No supplier attempts" description="Attempts are recorded per report request." /></div>}
            </TableShell>
          </Card>
        </div>
        <p className="text-xs leading-relaxed text-faint">Cost figures use the configured per-call estimate. Reconcile with supplier invoices before treating them as payable amounts.</p>
      </>
    );
  }

  // ── Promotions ──────────────────────────────────────────────────────
  else if (section === "promotions") {
    const rows = await db.order.findMany({ where: { promoCode: { not: null }, ...(q ? { promoCode: { contains: q, mode: "insensitive" } } : {}) }, select: { promoCode: true, status: true, amountCents: true, createdAt: true } });
    const grouped = new Map<string, { code: string; orders: number; paid: number; revenue: number; last: Date }>();
    for (const row of rows) {
      if (!row.promoCode) continue;
      const entry = grouped.get(row.promoCode) ?? { code: row.promoCode, orders: 0, paid: 0, revenue: 0, last: row.createdAt };
      entry.orders += 1;
      if (row.status === "PAID") { entry.paid += 1; entry.revenue += row.amountCents; }
      if (row.createdAt > entry.last) entry.last = row.createdAt;
      grouped.set(row.promoCode, entry);
    }
    const list = [...grouped.values()].sort((a, b) => b.orders - a.orders);
    actions = <span className="admin-chip">{list.length} codes redeemed</span>;
    body = (
      <>
        <FilterBar basePath={basePath} q={q} placeholder="Search promo code" />
        <TableShell>
          <table className="admin-table">
            <thead><tr><th>Code</th><th>Orders</th><th>Paid</th><th className="text-right">Paid revenue</th><th>Last used</th></tr></thead>
            <tbody>
              {list.map(row => (
                <tr key={row.code}>
                  <td className="font-mono text-xs font-semibold text-ink">{row.code}</td>
                  <td className="tabular text-muted">{row.orders}</td>
                  <td className="tabular text-muted">{row.paid}</td>
                  <td className="tabular text-right font-semibold text-ink">{moneyUsd(row.revenue)}</td>
                  <td className="tabular text-muted">{shortDate(row.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <div className="p-4"><EmptyState icon="promotions" title="No promo codes redeemed" description="Codes created in Stripe are recorded on the order when a customer uses one." /></div>}
        </TableShell>
        <p className="text-xs text-faint">Codes are managed in Stripe. This view only reports what reached the order table.</p>
      </>
    );
  }

  // ── Activity ────────────────────────────────────────────────────────
  else if (section === "activity") {
    const where: Prisma.AuditLogWhereInput = q
      ? { OR: [{ action: like }, { target: like }, { actorId: like }, { actor: { email: like } }] }
      : {};
    const [rows, total] = await Promise.all([
      db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE_SIZE, skip, include: { actor: { select: { email: true } } } }),
      db.auditLog.count({ where }),
    ]);
    actions = <span className="admin-chip">{total.toLocaleString()} events</span>;
    body = (
      <>
        <FilterBar basePath={basePath} q={q} placeholder="Search action, target or actor" />
        <TableShell footer={total > 0 ? <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath={basePath} query={query} label="events" /> : undefined}>
          <table className="admin-table">
            <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th className="hidden lg:table-cell">Metadata</th></tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="tabular whitespace-nowrap text-muted">{stamp(row.createdAt)}</td>
                  <td className="max-w-[200px] truncate text-muted">{row.actor?.email ?? row.actorId ?? "Anonymous"}</td>
                  <td><span className="admin-badge" data-tone="neutral">{row.action}</span></td>
                  <td className="max-w-[200px] truncate font-mono text-xs text-muted">{row.target ?? "—"}</td>
                  <td className="hidden max-w-[280px] truncate font-mono text-[11px] text-faint lg:table-cell" title={row.meta ? JSON.stringify(row.meta) : undefined}>{row.meta ? JSON.stringify(row.meta) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-4"><EmptyState icon="activity" title="No audit rows match" description="Sign-ins and admin actions append rows here." /></div>}
        </TableShell>
      </>
    );
  }

  // ── Security ────────────────────────────────────────────────────────
  else if (section === "security") {
    const now = new Date();
    const [activeSessions, adminAccounts, supers, authEvents, tokenSessions] = await Promise.all([
      db.session.count({ where: { expires: { gt: now } } }),
      db.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, deletedAt: null } }),
      db.user.count({ where: { role: "SUPER_ADMIN", deletedAt: null } }),
      db.auditLog.findMany({ where: { OR: [{ action: like }, { action: { contains: "LOGIN" } }, { action: { contains: "PASSWORD" } }, { action: { contains: "ROLE" } }, { action: { contains: "SUSPENDED" } }] }, orderBy: { createdAt: "desc" }, take: 25, include: { actor: { select: { email: true } } } }),
      db.session.findMany({ where: { expires: { gt: now } }, orderBy: { expires: "desc" }, take: 20, include: { user: { select: { email: true, role: true } } } }),
    ]);
    body = (
      <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active sessions", value: activeSessions, hint: "Rows that have not expired" },
            { label: "Admin accounts", value: adminAccounts, hint: "ADMIN + SUPER_ADMIN, not suspended" },
            { label: "Master admins", value: supers, hint: "Accounts holding SUPER_ADMIN" },
            { label: "Session lifetime", value: "8h", hint: "Cookie and row expiry" },
          ].map(item => (
            <article key={item.label} className="admin-kpi p-4">
              <p className="text-[13px] font-semibold text-muted">{item.label}</p>
              <p className="tabular mt-2 text-2xl font-extrabold text-ink">{item.value}</p>
              <p className="mt-1 text-[11px] text-faint">{item.hint}</p>
            </article>
          ))}
        </section>

        <Card title="Authentication and access events" description="Filtered from the append-only audit log." padded={false}>
          <TableShell>
            <table className="admin-table">
              <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead>
              <tbody>
                {authEvents.map(row => (
                  <tr key={row.id}>
                    <td className="tabular whitespace-nowrap text-muted">{stamp(row.createdAt)}</td>
                    <td className="max-w-[220px] truncate text-muted">{row.actor?.email ?? row.actorId ?? "Anonymous"}</td>
                    <td><span className="admin-badge" data-tone="neutral">{row.action}</span></td>
                    <td className="max-w-[220px] truncate font-mono text-xs text-muted">{row.target ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {authEvents.length === 0 && <div className="p-4"><EmptyState icon="security" title="No authentication events recorded" description="Sign-ins and password changes append audit rows." /></div>}
          </TableShell>
        </Card>

        <Card title="Active sessions" description="Session tokens are stored hashed and never shown. Revoking a customer account deletes its sessions." padded={false}>
          <TableShell>
            <table className="admin-table">
              <thead><tr><th>Account</th><th>Role</th><th>Expires</th></tr></thead>
              <tbody>
                {tokenSessions.map(row => (
                  <tr key={row.id}>
                    <td className="max-w-[240px] truncate text-muted">{row.user.email}</td>
                    <td><StatusBadge value={row.user.role} /></td>
                    <td className="tabular whitespace-nowrap text-muted">{stamp(row.expires)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tokenSessions.length === 0 && <div className="p-4"><EmptyState icon="lock" title="No active sessions" description="Sessions are created on sign-in and expire after eight hours." /></div>}
          </TableShell>
        </Card>
      </>
    );
  }

  // ── Permissions ─────────────────────────────────────────────────────
  else if (section === "permissions") {
    const rows: { capability: string; admin: boolean; master: boolean; note: string }[] = [
      { capability: "View console sections", admin: true, master: true, note: "requireAdmin() on every route" },
      { capability: "Suspend / reactivate a customer", admin: true, master: true, note: "Revokes the customer's sessions" },
      { capability: "Send a customer password reset", admin: true, master: true, note: "Only when email delivery is configured" },
      { capability: "Update a support ticket", admin: true, master: true, note: "Status values are validated" },
      { capability: "Test the NHTSA connection", admin: true, master: true, note: "Records a real provider call" },
      { capability: "Retry a failed report", admin: false, master: true, note: "Server rejects non-master roles" },
      { capability: "Release stalled reservations", admin: false, master: true, note: "Returns reserved credits" },
      { capability: "Adjust customer credits", admin: false, master: true, note: "Ledger entry with a required reason" },
      { capability: "Change a staff role", admin: false, master: true, note: "Cannot change your own role" },
      { capability: "Save provider configuration", admin: false, master: true, note: "Credentials encrypted at rest" },
      { capability: "View staff accounts", admin: false, master: true, note: "Nav hides the section for admins" },
    ];
    body = (
      <>
        <Notice tone="info">These rules are enforced in server actions and layout guards — hiding a button is never the only protection.</Notice>
        <TableShell>
          <table className="admin-table">
            <thead><tr><th>Capability</th><th>Admin</th><th>Master admin</th><th>Enforced by</th></tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.capability}>
                  <td className="font-medium text-ink">{row.capability}</td>
                  <td>{row.admin ? <span className="admin-badge" data-tone="good">allowed</span> : <span className="admin-badge" data-tone="neutral">blocked</span>}</td>
                  <td>{row.master ? <span className="admin-badge" data-tone="good">allowed</span> : <span className="admin-badge" data-tone="neutral">blocked</span>}</td>
                  <td className="text-xs text-muted">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
        <p className="text-xs text-faint">Your role: <span className="font-semibold text-ink">{viewer.role.replaceAll("_", " ")}</span>.</p>
      </>
    );
  }

  // ── Settings ────────────────────────────────────────────────────────
  else if (section === "settings") {
    const [emailReady, licensed, providerRows] = await Promise.all([
      Promise.resolve(emailDeliverable()),
      historyProvider().then(provider => provider !== null).catch(() => false),
      db.apiProvider.findMany({ select: { id: true, enabled: true } }),
    ]);
    const staff = superAdmin ? await db.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, select: { id: true, email: true, role: true }, take: 100 }) : [];
    body = (
      <>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Email delivery" description="Password resets are only sent when this is configured.">
            <span className="admin-badge" data-tone={emailReady ? "good" : "warn"}>{emailReady ? "configured" : "not configured"}</span>
            <p className="mt-3 text-xs leading-relaxed text-faint">{emailReady ? "A provider key is present; delivery requests are attempted for real." : "Without a provider key, reset links are written to the development log and nothing is sent."}</p>
          </Card>
          <Card title="Licensed history" description="Required for paid vehicle-history reports.">
            <span className="admin-badge" data-tone={licensed ? "good" : "warn"}>{licensed ? "adapter available" : "adapter unavailable"}</span>
            <p className="mt-3 text-xs leading-relaxed text-faint">{licensed ? "A provider adapter is configured." : "Report generation refuses with 503 before any credential is reserved."}</p>
          </Card>
          <Card title="Provider switches" description="Stored provider configuration.">
            {providerRows.length === 0 ? <p className="text-sm text-faint">No provider rows stored yet.</p> : (
              <ul className="grid gap-2 text-sm">
                {providerRows.map(row => (
                  <li key={row.id} className="flex items-center justify-between gap-3">
                    <span className="text-muted">{row.id}</span>
                    <span className="admin-badge" data-tone={row.enabled ? "good" : "neutral"}>{row.enabled ? "enabled" : "disabled"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {superAdmin ? (
          <Card title="Staff roles" description="A role change revokes that staff member's sessions immediately." padded={false}>
            <TableShell>
              <table className="admin-table">
                <thead><tr><th>Staff</th><th>Role</th><th className="text-right">Change role</th></tr></thead>
                <tbody>
                  {staff.map(row => (
                    <tr key={row.id}>
                      <td className="font-medium text-ink">{row.email}{row.id === viewer.id && <span className="admin-badge ml-2" data-tone="info">you</span>}</td>
                      <td><StatusBadge value={row.role} /></td>
                      <td>
                        <form action={updateStaff} className="flex items-center justify-end gap-2">
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="returnTo" value={basePath} />
                          <select aria-label={`Role for ${row.email}`} name="role" defaultValue={row.role} disabled={row.id === viewer.id} className="admin-select !mt-0 !w-auto py-1.5 text-sm">
                            <option value="ADMIN">ADMIN</option>
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          </select>
                          {row.id === viewer.id ? <span className="text-xs text-faint">Your own role</span>
                            : <ConfirmSubmit message={`Change ${row.email} to the selected role? Their sessions will be revoked immediately.`} confirmLabel="Update role" className="admin-button-secondary">Save</ConfirmSubmit>}
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </Card>
        ) : <Notice tone="warn">Staff management requires a Master Admin account.</Notice>}

        <p className="text-xs leading-relaxed text-faint">Create staff with <span className="font-mono">npm run admin:create</span>. Production secrets stay in the hosting environment and are never read into this page.</p>
      </>
    );
  }

  // ── System health ───────────────────────────────────────────────────
  else if (section === "health") {
    const started = Date.now();
    let databaseOk = true;
    try { await db.$queryRaw`SELECT 1`; } catch { databaseOk = false; }
    const databaseMs = Date.now() - started;

    const [configs, pendingWebhooks, failedWebhooks, stale, lastCalls, emailReady, licensed] = await Promise.all([
      db.apiProvider.findMany(),
      db.webhookEvent.count({ where: { processedAt: null } }),
      db.webhookEvent.count({ where: { error: { not: null } } }),
      db.reportRequest.count({ where: { status: "FETCHING", updatedAt: { lt: new Date(Date.now() - 600_000) } } }),
      db.apiUsage.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
      Promise.resolve(emailDeliverable()),
      historyProvider().then(provider => provider !== null).catch(() => false),
    ]);

    const checks: { name: string; state: "ok" | "warn" | "fail"; detail: string; at?: Date }[] = [
      {
        name: "PostgreSQL (Prisma)",
        state: databaseOk ? "ok" : "fail",
        detail: databaseOk ? `SELECT 1 completed in ${databaseMs} ms` : "The connectivity query failed",
        at: new Date(),
      },
      {
        name: "Billing webhooks",
        state: failedWebhooks > 0 ? "fail" : pendingWebhooks > 0 ? "warn" : "ok",
        detail: `${pendingWebhooks} unprocessed · ${failedWebhooks} with a recorded error`,
      },
      {
        name: "Report reservations",
        state: stale > 0 ? "warn" : "ok",
        detail: `${stale} request${stale === 1 ? "" : "s"} fetching for over ten minutes`,
      },
      {
        name: "Email delivery",
        state: emailReady ? "ok" : "warn",
        detail: emailReady ? "A delivery provider is configured" : "No provider configured — reset links go to the development log",
      },
      {
        name: "Licensed history adapter",
        state: licensed ? "ok" : "warn",
        detail: licensed ? "Adapter available" : "Unavailable — paid reports refuse before reserving credits",
      },
      ...configs.map(config => {
        const calls = lastCalls.filter(call => call.provider === config.id);
        const last = calls[0];
        return {
          name: `Provider · ${config.id}`,
          state: (config.enabled ? "ok" : "warn") as "ok" | "warn",
          detail: last ? `${config.enabled ? "enabled" : "disabled"} · last call ${last.success ? "succeeded" : "failed"} in ${last.latencyMs} ms` : `${config.enabled ? "enabled" : "disabled"} · no call recorded yet`,
          at: last?.createdAt,
        };
      }),
    ];

    body = (
      <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {checks.map(check => (
            <article key={check.name} className="admin-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{check.name}</p>
                <span className="admin-badge" data-tone={check.state === "ok" ? "good" : check.state === "warn" ? "warn" : "bad"}>
                  {check.state === "ok" ? "healthy" : check.state === "warn" ? "attention" : "failing"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{check.detail}</p>
              {check.at && <p className="tabular mt-2 text-[11px] text-faint">Observed {stamp(check.at)}</p>}
            </article>
          ))}
        </div>
        <p className="text-sm text-muted">Checks ran when this page rendered at <span className="tabular font-semibold text-ink">{new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" })}</span>. Refresh to run them again.</p>
        <Card title="Recent provider activity" description="The last twenty monitored calls across all providers." padded={false}>
          <TableShell>
            <table className="admin-table">
              <thead><tr><th>Time</th><th>Provider</th><th>Operation</th><th>Result</th><th>Latency</th></tr></thead>
              <tbody>
                {lastCalls.map(call => (
                  <tr key={call.id}>
                    <td className="tabular whitespace-nowrap text-muted">{stamp(call.createdAt)}</td>
                    <td className="text-muted">{call.provider}</td>
                    <td className="text-muted">{call.operation}</td>
                    <td><span className="admin-badge" data-tone={call.success ? "good" : "bad"}>{call.success ? "success" : "failed"}</span></td>
                    <td className="tabular text-muted">{call.latencyMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lastCalls.length === 0 && <div className="p-4"><EmptyState icon="health" title="No provider calls recorded" description="Run the NHTSA test from the API center to record one." /></div>}
          </TableShell>
        </Card>
      </>
    );
  }

  else notFound();

  return (
    <div className="grid gap-5">
      <PageHeader eyebrow={meta.eyebrow} title={meta.title} description={meta.description} actions={actions} />
      {notice && <Notice tone={notice.startsWith("Licensed") || notice.startsWith("No email") ? "warn" : "good"}>{notice}</Notice>}
      {body}
    </div>
  );
}

/** Shared GET filter bar; keeps the layout consistent across every list view. */
function FilterBar({
  basePath, q, status, placeholder, options, children,
}: {
  basePath: string;
  q: string;
  status?: string;
  placeholder: string;
  options?: [string, string][];
  children?: React.ReactNode;
}) {
  const clear = hrefWith(basePath, {}, {});
  return (
    <form action={basePath} method="get" className="admin-card flex flex-wrap items-center gap-2 p-2.5">
      <div className="relative min-w-[220px] flex-1">
        <AdminIcon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input name="q" type="search" defaultValue={q} placeholder={placeholder} aria-label={placeholder}
          className="admin-input !mt-0 w-full py-2 pl-9 text-sm" />
      </div>
      {options && (
        <select name="status" defaultValue={status} aria-label="Status filter" className="admin-select !mt-0 !w-auto py-2 text-sm">
          <option value="">All statuses</option>
          {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      )}
      <button className="admin-button py-2">Filter</button>
      {(q || status) && <Link href={clear} className="px-1 text-xs font-semibold text-muted hover:text-ink">Clear</Link>}
      {children}
    </form>
  );
}

function AccessDenied() {
  return (
    <Card title="Master Admin required" description="This section is limited to accounts holding SUPER_ADMIN.">
      <EmptyState icon="lock" title="Your role cannot open this section" description="If you believe you should have access, ask a Master Admin to review your role in Settings." />
    </Card>
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

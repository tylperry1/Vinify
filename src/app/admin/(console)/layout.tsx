import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vinify Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const jar = await cookies();
  const theme = jar.get("vinify-theme")?.value === "dark" ? "dark" : "light";
  const collapsed = jar.get("vinify-sidebar")?.value === "collapsed";

  // Real records that need a human. Zero counts are hidden by the shell.
  const staleBefore = new Date(Date.now() - 10 * 60_000);
  const [failedReports, openTickets, staleRequests, webhookErrors] = await Promise.all([
    db.reportRequest.count({ where: { status: "FAILED" } }),
    db.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }),
    db.reportRequest.count({ where: { status: "FETCHING", updatedAt: { lt: staleBefore } } }),
    db.webhookEvent.count({ where: { error: { not: null } } }),
  ]);

  const attention = [
    { label: "Failed reports", count: failedReports, href: "/admin/reports?status=FAILED", hint: "Requests with a recorded failure" },
    { label: "Open tickets", count: openTickets, href: "/admin/support?status=open", hint: "Support queue awaiting a reply" },
    { label: "Stalled reservations", count: staleRequests, href: "/admin/reports?status=FETCHING", hint: "Fetching for more than ten minutes" },
    { label: "Webhook errors", count: webhookErrors, href: "/admin/health", hint: "Billing events that failed processing" },
  ];

  return (
    <AdminShell
      user={{ email: user.email, role: user.role }}
      initialTheme={theme}
      initialCollapsed={collapsed}
      attention={attention}
    >
      {children}
    </AdminShell>
  );
}

import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { isAdmin } from "@/lib/security";

export const dynamic = "force-dynamic";

/** Global search for the command palette. Authorised server-side, never cached. */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user || !isAdmin(user.role) || user.deletedAt) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return NextResponse.json({ query: q, groups: [] }, { headers: { "cache-control": "no-store" } });

  const like = { contains: q, mode: "insensitive" as const };
  const [customers, staff, orders, reports, requests, tickets, searches] = await Promise.all([
    db.user.findMany({ where: { role: "CUSTOMER", email: like }, select: { id: true, email: true }, take: 5 }),
    db.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, email: like }, select: { id: true, email: true, role: true }, take: 5 }),
    db.order.findMany({ where: { OR: [{ id: like }, { stripePaymentIntent: like }] }, select: { id: true, amountCents: true, status: true }, take: 5 }),
    db.report.findMany({ where: { OR: [{ vin: { contains: q.toUpperCase() } }, { publicId: like }] }, select: { publicId: true, vin: true }, take: 5 }),
    db.reportRequest.findMany({ where: { vin: { contains: q.toUpperCase() } }, select: { id: true, vin: true, status: true }, take: 5 }),
    db.supportTicket.findMany({ where: { OR: [{ email: like }, { subject: like }] }, select: { id: true, email: true, subject: true }, take: 5 }),
    db.vinSearch.findMany({ where: { vin: { contains: q.toUpperCase() } }, select: { vin: true, year: true, make: true, model: true }, take: 5 }),
  ]);

  const groups = [
    { label: "Customers", items: customers.map(c => ({ title: c.email, hint: "Customer", href: `/admin/customers?q=${encodeURIComponent(c.email)}` })) },
    { label: "Staff", items: staff.map(s => ({ title: s.email, hint: s.role.replaceAll("_", " "), href: `/admin/settings?q=${encodeURIComponent(s.email)}` })) },
    { label: "Orders", items: orders.map(o => ({ title: o.id, hint: `${o.status} · $${(o.amountCents / 100).toFixed(2)}`, href: `/admin/orders?q=${encodeURIComponent(o.id)}` })) },
    { label: "Reports", items: reports.map(r => ({ title: r.publicId, hint: r.vin, href: `/admin/reports?q=${encodeURIComponent(r.vin)}` })) },
    { label: "Report requests", items: requests.map(r => ({ title: r.vin, hint: r.status, href: `/admin/reports?q=${encodeURIComponent(r.vin)}` })) },
    { label: "VIN searches", items: searches.map(s => ({ title: s.vin, hint: [s.year, s.make, s.model].filter(Boolean).join(" ") || "Decoded", href: `/vehicles/${s.vin}` })) },
    { label: "Support", items: tickets.map(t => ({ title: t.subject, hint: t.email, href: `/admin/support?q=${encodeURIComponent(t.email)}` })) },
  ].filter(group => group.items.length > 0);

  return NextResponse.json({ query: q, groups }, { headers: { "cache-control": "no-store" } });
}

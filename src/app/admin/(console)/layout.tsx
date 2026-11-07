import Link from "next/link";
import { requireAdmin } from "@/lib/server/auth";
import { logout } from "../login/actions";
import { Logo } from "@/components/Logo";
export const dynamic = "force-dynamic";
export const metadata = { title: "Vinify Admin", robots: { index: false, follow: false } };
const sections = ["customers", "reports", "orders", "subscriptions", "api-center", "analytics", "activity", "support", "settings"];
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <div className="min-h-screen bg-surface"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-white p-6"><Logo/><span>{user.email} · {user.role.replaceAll("_", " ")}</span><div className="flex items-center gap-5"><Link href="/admin/account" className="text-blue-600">Change password</Link><form action={logout}><button className="text-blue-600">Sign out</button></form></div></header>
    <div className="mx-auto grid max-w-7xl gap-8 p-6 md:grid-cols-[180px_1fr]"><nav aria-label="Administration" className="flex flex-wrap gap-3 md:flex-col"><Link href="/admin">Overview</Link>{sections.map(s => <Link key={s} href={`/admin/${s}`} className="capitalize text-navy-700">{s === "api-center" ? "API Center" : s}</Link>)}</nav><main id="main" className="min-w-0">{children}</main></div></div>;
}

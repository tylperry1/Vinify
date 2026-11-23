import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/server/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vinify Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const jar = await cookies();
  const theme = jar.get("vinify-theme")?.value === "dark" ? "dark" : "light";
  const collapsed = jar.get("vinify-sidebar")?.value === "collapsed";
  return (
    <AdminShell user={{ email: user.email, role: user.role }} initialTheme={theme} initialCollapsed={collapsed}>
      {children}
    </AdminShell>
  );
}

"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { logout } from "@/app/login/actions";
import { AdminIcon } from "./icons";
import { CommandPalette } from "./CommandPalette";
import { adminNav, labelForPath } from "./nav";

type Theme = "light" | "dark";

const year = 60 * 60 * 24 * 365;
function remember(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${year}; samesite=lax`;
}

export function AdminShell({
  user, initialTheme, initialCollapsed, children,
}: {
  user: { email: string; role: string };
  initialTheme: Theme;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const crumbs = labelForPath(pathname);
  const roleLabel = user.role.replaceAll("_", " ");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return adminNav;
    return adminNav
      .map(group => ({ ...group, items: group.items.filter(item => item.label.toLowerCase().includes(needle)) }))
      .filter(group => group.items.length > 0);
  }, [query]);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    remember("vinify-theme", next);
  }

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    remember("vinify-sidebar", next ? "collapsed" : "open");
  }

  return (
    <div className="admin-shell" data-theme={theme}>
      {mobileOpen && (
        <button className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm lg:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
      )}
      <div className="flex min-h-screen">
        <aside
          id="admin-nav"
          data-open={mobileOpen}
          className={`admin-sidebar admin-grid-bg flex shrink-0 flex-col text-white transition-[width] duration-200 ${collapsed ? "w-[76px]" : "w-[248px]"} lg:sticky lg:top-0 lg:h-screen`}
        >
          <div className="flex h-16 items-center justify-between gap-2 px-4">
            <Link href="/admin" className="flex items-center gap-2 text-white" aria-label="Vinify admin home">
              {collapsed ? <Logo tone="light" size={26} /> : <Logo tone="light" size={26} />}
            </Link>
            <button onClick={toggleCollapsed} className="hidden rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white lg:block" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!collapsed} aria-controls="admin-nav">
              <AdminIcon name="collapse" className={`size-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            </button>
            <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden" aria-label="Close navigation">
              <AdminIcon name="signout" className="size-4" />
            </button>
          </div>

          {!collapsed && (
            <div className="px-3 pb-3">
              <label className="relative block">
                <span className="sr-only">Filter navigation</span>
                <AdminIcon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Jump to…"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-2 text-sm text-white placeholder:text-white/35 focus:border-sky-400/60 focus:outline-none"
                  type="search"
                />
              </label>
            </div>
          )}

          <nav aria-label="Administration" className="flex-1 overflow-y-auto px-2 pb-6">
            {groups.length === 0 && !collapsed && <p className="px-3 py-2 text-sm text-white/40">No matching section.</p>}
            {groups.map(group => (
              <div key={group.label} className="mb-4">
                {!collapsed && <p className="admin-nav-group-label px-3 pb-1.5 pt-3">{group.label}</p>}
                <ul className="grid gap-0.5">
                  {group.items.map(item => {
                    const active = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          aria-current={active ? "page" : undefined}
                          title={collapsed ? item.label : undefined}
                          className={`admin-nav-link ${collapsed ? "justify-center px-2" : ""}`}
                        >
                          <AdminIcon name={item.icon} className="size-[18px] shrink-0" />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {!collapsed && (
            <div className="mx-3 mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-white/55">
              <p className="font-semibold text-white/80">{roleLabel}</p>
              <p className="truncate">{user.email}</p>
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-md sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setMobileOpen(true)} className="rounded-lg border border-line p-2 text-muted transition hover:text-ink lg:hidden" aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="admin-nav">
                <AdminIcon name="menu" className="size-4" />
              </button>
              <nav aria-label="Breadcrumb" className="min-w-0">
                <ol className="flex items-center gap-2 text-sm">
                  <li><Link href="/admin" className="admin-muted-link">Admin</Link></li>
                  {crumbs.map((crumb, i) => (
                    <li key={crumb} className="flex min-w-0 items-center gap-2">
                      <AdminIcon name="chevron" className="size-3 shrink-0 text-faint" />
                      <span aria-current={i === crumbs.length - 1 ? "page" : undefined} className={`truncate ${i === crumbs.length - 1 ? "font-semibold text-ink" : "text-muted"}`}>{crumb}</span>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <CommandPalette />
              <button onClick={toggleTheme} className="rounded-lg border border-line p-2 text-muted transition hover:text-ink" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
                <AdminIcon name={theme === "dark" ? "sun" : "moon"} className="size-4" />
              </button>
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm transition hover:border-blue-400/60">
                  <span className="grid size-7 place-items-center rounded-full bg-brand text-xs font-bold text-white">{user.email.slice(0, 1).toUpperCase()}</span>
                  <span className="hidden max-w-[160px] truncate sm:block">{user.email}</span>
                  <AdminIcon name="chevron" className="size-3 rotate-90 text-faint" />
                </summary>
                <div className="absolute right-0 mt-2 w-60 rounded-xl border border-line bg-white p-2 shadow-lift">
                  <p className="px-2 py-1 text-xs uppercase tracking-wider text-faint">{roleLabel}</p>
                  <Link href="/admin/account" className="block rounded-lg px-2 py-2 text-sm hover:bg-surface">Your account</Link>
                  <Link href="/admin/activity" className="block rounded-lg px-2 py-2 text-sm hover:bg-surface">Activity log</Link>
                  <form action={logout}><button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-bad hover:bg-surface"><AdminIcon name="signout" className="size-4" /> Sign out</button></form>
                </div>
              </details>
            </div>
          </header>

          <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-7 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

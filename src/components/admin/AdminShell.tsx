"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, VMark } from "@/components/Logo";
import { logout } from "@/app/login/actions";
import { AdminIcon } from "./icons";
import { CommandPalette } from "./CommandPalette";
import { isActive, labelForPath, navForRole } from "./nav";

type Theme = "light" | "dark";
type Attention = { label: string; count: number; href: string; hint: string };

const year = 60 * 60 * 24 * 365;
function remember(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${year}; samesite=lax`;
}

export function AdminShell({
  user, initialTheme, initialCollapsed, attention, children,
}: {
  user: { email: string; role: string };
  initialTheme: Theme;
  initialCollapsed: boolean;
  attention: Attention[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null);
  const [menu, setMenu] = useState<"account" | "notifications" | "quick" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => navForRole(user.role), [user.role]);
  const [closedGroups, setClosedGroups] = useState<string[]>([]);
  const crumbs = labelForPath(pathname);
  const roleLabel = user.role.replaceAll("_", " ");
  const isSuper = user.role === "SUPER_ADMIN";
  const attentionItems = attention.filter(item => item.count > 0);
  const totalAttention = attentionItems.reduce((sum, item) => sum + item.count, 0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map(group => ({ ...group, items: group.items.filter(item => `${item.label} ${item.hint ?? ""}`.toLowerCase().includes(needle)) }))
      .filter(group => group.items.length > 0);
  }, [groups, query]);

  // Close popovers on outside click or Escape.
  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setMobileOpen(false); setMenu(null); }, [pathname]);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    remember("vinify-theme", next);
  }

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    remember("vinify-sidebar", next ? "collapsed" : "open");
    if (next) setTip(null);
  }

  function toggleGroup(id: string) {
    setClosedGroups(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  return (
    <div className="admin-shell" data-theme={theme}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink">
        Skip to content
      </a>

      {mobileOpen && (
        <button className="fixed inset-0 z-40 bg-navy-950/65 backdrop-blur-sm lg:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex min-h-screen">
        <aside
          id="admin-nav"
          data-open={mobileOpen}
          className={`admin-sidebar flex shrink-0 flex-col text-white transition-[width] duration-200 ${collapsed ? "w-[76px]" : "w-[264px]"} lg:sticky lg:top-0 lg:h-screen`}
        >
          <div className={`flex h-16 items-center border-b border-white/10 ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
            <Link href="/admin" className="flex items-center gap-2.5 text-white" aria-label="Vinify admin home">
              {collapsed ? <VMark size={26} /> : <Logo tone="light" size={26} />}
              {!collapsed && (
                <span className="rounded border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-sky-200">Admin</span>
              )}
            </Link>
            {!collapsed && (
              <>
                <button onClick={toggleCollapsed} className="hidden rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white lg:block" aria-label="Collapse navigation" aria-expanded={!collapsed} aria-controls="admin-nav">
                  <AdminIcon name="collapse" className="size-4" />
                </button>
                <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden" aria-label="Close navigation">
                  <AdminIcon name="signout" className="size-4" />
                </button>
              </>
            )}
          </div>

          {!collapsed && (
            <div className="px-3 pb-2 pt-3">
              <label className="relative block">
                <span className="sr-only">Filter navigation</span>
                <AdminIcon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Jump to…"
                  className="w-full rounded-lg border border-white/12 bg-white/6 py-2 pl-8 pr-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                  type="search"
                />
              </label>
            </div>
          )}

          {collapsed && (
            <div className="flex justify-center py-3">
              <button onClick={toggleCollapsed} className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Expand navigation" aria-expanded={!collapsed} aria-controls="admin-nav">
                <AdminIcon name="collapse" className="size-4 rotate-180" />
              </button>
            </div>
          )}

          <nav aria-label="Administration" className="admin-nav flex-1 overflow-y-auto px-2 pb-4">
            {filtered.length === 0 && !collapsed && <p className="px-3 py-3 text-sm text-white/50">No matching section.</p>}
            {filtered.map((group, groupIndex) => {
              const open = !closedGroups.includes(group.id) || !!query.trim();
              return (
                <div key={group.id} className={collapsed ? "mb-1.5" : "mb-1"}>
                  {!collapsed && (
                    <button
                      onClick={() => toggleGroup(group.id)}
                      aria-expanded={open}
                      className="admin-nav-group-label flex w-full items-center justify-between rounded-md px-3 pb-1.5 pt-3 text-left transition hover:text-sky-200"
                    >
                      <span>{group.label}</span>
                      <AdminIcon name="chevronDown" className={`size-3 transition-transform ${open ? "" : "-rotate-90"}`} />
                    </button>
                  )}
                  {collapsed && groupIndex > 0 && <div className="mx-3 my-2 h-px bg-white/10" />}
                  {open && (
                    <ul className="grid gap-0.5">
                      {group.items.map(item => {
                        const active = isActive(pathname, item.href);
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              aria-current={active ? "page" : undefined}
                              data-tip={collapsed ? item.label : undefined}
                              onMouseEnter={event => {
                                if (!collapsed) return;
                                const rect = event.currentTarget.getBoundingClientRect();
                                setTip({ label: item.label, top: rect.top + rect.height / 2 });
                              }}
                              onMouseLeave={() => setTip(null)}
                              onFocus={() => {
                                if (collapsed) setTip(null);
                              }}
                              onClick={() => { setMobileOpen(false); setTip(null); }}
                              className={`admin-nav-link ${collapsed ? "justify-center px-2" : ""}`}
                            >
                              <AdminIcon name={item.icon} className="size-[18px] shrink-0" />
                              {!collapsed && <span className="truncate">{item.label}</span>}
                              {!collapsed && item.superOnly && (
                                <span className="ml-auto rounded border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-200">Master</span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>

          <div className={`border-t border-white/10 ${collapsed ? "px-2 py-3" : "p-3"}`}>
            {collapsed ? (
              <div className="grid place-items-center" title={`${user.email} · ${roleLabel}`}>
                <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-sm font-bold text-white">
                  {user.email.slice(0, 1).toUpperCase()}
                </span>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-xs font-bold text-white">
                    {user.email.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white/90">{user.email}</p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300/80">{roleLabel}</p>
                  </div>
                </div>
                <p className="mt-2.5 border-t border-white/10 pt-2 text-[11px] leading-relaxed text-white/45">
                  {isSuper ? "Master admin — full authorised access." : "Admin — operational access, no role changes."}
                </p>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 xl:px-10">
              <div className="flex min-w-0 items-center gap-2.5">
                <button onClick={() => setMobileOpen(true)} className="rounded-lg border border-line p-2 text-muted transition hover:text-ink lg:hidden" aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="admin-nav">
                  <AdminIcon name="menu" className="size-4" />
                </button>
                <nav aria-label="Breadcrumb" className="min-w-0">
                  <ol className="flex min-w-0 items-center gap-1.5 text-sm">
                    <li className="hidden sm:block"><Link href="/admin" className="admin-muted-link">Admin</Link></li>
                    {crumbs.map((crumb, i) => (
                      <li key={`${crumb}-${i}`} className="flex min-w-0 items-center gap-1.5">
                        <AdminIcon name="chevron" className={`size-3 shrink-0 text-faint ${i === 0 ? "hidden sm:block" : ""}`} />
                        <span aria-current={i === crumbs.length - 1 ? "page" : undefined} className={`truncate ${i === crumbs.length - 1 ? "font-semibold text-ink" : "text-muted"}`}>{crumb}</span>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>

              <div ref={menuRef} className="flex items-center gap-1.5 sm:gap-2">
                <CommandPalette />

                {/* Quick actions */}
                <div className="relative hidden xl:block">
                  <button
                    onClick={() => setMenu(menu === "quick" ? null : "quick")}
                    aria-expanded={menu === "quick"}
                    aria-haspopup="menu"
                    className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm font-medium text-muted transition hover:border-blue-400/60 hover:text-ink"
                  >
                    <AdminIcon name="plus" className="size-4" />
                    Quick actions
                  </button>
                  {menu === "quick" && (
                    <div role="menu" className="admin-fade absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-lift">
                      {[
                        { label: "Order queue", href: "/admin/orders", icon: "orders" as const },
                        { label: "Report queue", href: "/admin/reports", icon: "reports" as const },
                        { label: "Customer lookup", href: "/admin/customers", icon: "customers" as const },
                        { label: "Provider health", href: "/admin/health", icon: "health" as const },
                      ].map(item => (
                        <Link key={item.href} href={item.href} role="menuitem" onClick={() => setMenu(null)}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-surface hover:text-ink">
                          <AdminIcon name={item.icon} className="size-4 text-faint" />
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notifications — real records that need a human */}
                <div className="relative">
                  <button
                    onClick={() => setMenu(menu === "notifications" ? null : "notifications")}
                    aria-expanded={menu === "notifications"}
                    aria-haspopup="dialog"
                    aria-label={`Needs attention: ${totalAttention} item${totalAttention === 1 ? "" : "s"}`}
                    className="relative rounded-lg border border-line p-2 text-muted transition hover:border-blue-400/60 hover:text-ink"
                  >
                    <AdminIcon name="bell" className="size-4" />
                    {totalAttention > 0 && (
                      <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-bold leading-4 text-white">{totalAttention > 99 ? "99+" : totalAttention}</span>
                    )}
                  </button>
                  {menu === "notifications" && (
                    <div role="dialog" aria-label="Needs attention" className="admin-fade absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,20rem)] overflow-hidden rounded-xl border border-line bg-white shadow-lift">
                      <div className="border-b border-line px-4 py-3">
                        <p className="text-sm font-semibold text-ink">Needs attention</p>
                        <p className="mt-0.5 text-xs text-faint">From real records only — no synthetic alerts.</p>
                      </div>
                      {totalAttention === 0 ? (
                        <p className="px-4 py-6 text-sm text-muted">Nothing needs attention right now.</p>
                      ) : (
                        <ul className="divide-y divide-[color:var(--color-line)]">
                          {attentionItems.map(item => (
                            <li key={item.label}>
                              <Link href={item.href} onClick={() => setMenu(null)} className="flex items-start justify-between gap-3 px-4 py-3 transition hover:bg-surface">
                                <span className="min-w-0">
                                  <span className="block text-sm font-medium text-ink">{item.label}</span>
                                  <span className="mt-0.5 block text-xs text-faint">{item.hint}</span>
                                </span>
                                <span className="admin-badge" data-tone="warn">{item.count}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Link href="/admin/security" onClick={() => setMenu(null)} className="block border-t border-line px-4 py-2.5 text-xs font-semibold text-blue-600 hover:bg-surface">
                        Open security center
                      </Link>
                    </div>
                  )}
                </div>

                <button onClick={toggleTheme} className="rounded-lg border border-line p-2 text-muted transition hover:border-blue-400/60 hover:text-ink" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
                  <AdminIcon name={theme === "dark" ? "sun" : "moon"} className="size-4" />
                </button>

                {/* Account menu */}
                <div className="relative">
                  <button
                    onClick={() => setMenu(menu === "account" ? null : "account")}
                    aria-expanded={menu === "account"}
                    aria-haspopup="menu"
                    className="flex items-center gap-2 rounded-lg border border-line py-1 pl-1 pr-2 text-sm transition hover:border-blue-400/60"
                  >
                    <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-sky-400 text-xs font-bold text-white">{user.email.slice(0, 1).toUpperCase()}</span>
                    <span className="hidden max-w-[150px] truncate text-ink md:block">{user.email}</span>
                    <AdminIcon name="chevronDown" className="size-3 text-faint" />
                  </button>
                  {menu === "account" && (
                    <div role="menu" className="admin-fade absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,17rem)] overflow-hidden rounded-xl border border-line bg-white shadow-lift">
                      <div className="border-b border-line px-4 py-3">
                        <p className="truncate text-sm font-semibold text-ink">{user.email}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600">
                          {roleLabel}
                          {isSuper && <span className="admin-badge" data-tone="info">Master</span>}
                        </p>
                      </div>
                      <div className="p-1.5">
                        <Link href="/admin/account" role="menuitem" onClick={() => setMenu(null)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-surface hover:text-ink">
                          <AdminIcon name="account" className="size-4 text-faint" /> Your account
                        </Link>
                        <Link href="/admin/security" role="menuitem" onClick={() => setMenu(null)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-surface hover:text-ink">
                          <AdminIcon name="security" className="size-4 text-faint" /> Security center
                        </Link>
                        <Link href="/admin/activity" role="menuitem" onClick={() => setMenu(null)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-surface hover:text-ink">
                          <AdminIcon name="activity" className="size-4 text-faint" /> Activity log
                        </Link>
                      </div>
                      <form action={logout} className="border-t border-line p-1.5">
                        <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-bad transition hover:bg-bad-bg">
                          <AdminIcon name="signout" className="size-4" /> Sign out
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main id="main" className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
            <div className="mx-auto w-full max-w-[1760px] admin-fade">{children}</div>
          </main>

          <footer className="border-t border-line px-4 py-4 text-xs text-faint sm:px-6 lg:px-8 xl:px-10">
            <div className="mx-auto flex w-full max-w-[1760px] flex-wrap items-center justify-between gap-2">
              <span>Vinify Admin 2.0 · every figure aggregated from live records</span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-good" aria-hidden="true" />
                {isSuper ? "Master admin session" : "Admin session"}
              </span>
            </div>
          </footer>
        </div>
      </div>

      {collapsed && tip && (
        <span className="admin-tooltip" style={{ top: tip.top }} role="tooltip">{tip.label}</span>
      )}
    </div>
  );
}

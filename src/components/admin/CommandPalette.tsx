"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminIcon } from "./icons";

type Item = { title: string; hint: string; href: string };
type Group = { label: string; items: Item[] };

/** Shown before the operator types, so the palette is useful on its own. */
const shortcuts: Group[] = [{
  label: "Go to",
  items: [
    { title: "Overview", hint: "Command center", href: "/admin" },
    { title: "Analytics", hint: "Trends and funnel", href: "/admin/analytics" },
    { title: "Orders", hint: "Every order", href: "/admin/orders" },
    { title: "Customers", hint: "Accounts", href: "/admin/customers" },
    { title: "Reports", hint: "Report engine", href: "/admin/reports" },
    { title: "Support center", hint: "Ticket queue", href: "/admin/support" },
    { title: "API center", hint: "Providers", href: "/admin/api-center" },
    { title: "System health", hint: "Live checks", href: "/admin/health" },
  ],
}];

/** ⌘K / Ctrl+K palette backed by the authorised /api/admin/search endpoint. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const searching = query.trim().length >= 2;
  const visible = searching ? groups : shortcuts;
  const flat = visible.flatMap(group => group.items);

  const close = useCallback(() => {
    setOpen(false);
    restoreFocus.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        restoreFocus.current = document.activeElement as HTMLElement;
        setOpen(true);
      } else if (event.key === "Escape" && open) {
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) { setGroups([]); setActive(0); return; }
    const controller = new AbortController();
    setBusy(true);
    const timer = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then(response => response.ok ? response.json() : { groups: [] })
        .then((data: { groups?: Group[] }) => { setGroups(data.groups ?? []); setActive(0); })
        .catch(() => undefined)
        .finally(() => setBusy(false));
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, open]);

  function move(delta: number) {
    if (!flat.length) return;
    setActive(current => (current + delta + flat.length) % flat.length);
  }

  function go(item: Item | undefined) {
    if (!item) return;
    close();
    setQuery("");
    router.push(item.href);
  }

  if (!open) {
    return (
      <button onClick={() => { restoreFocus.current = document.activeElement as HTMLElement; setOpen(true); }}
                  className="flex items-center gap-2 rounded-lg border border-line px-2 py-2 text-sm text-muted transition hover:border-blue-400/60 hover:text-ink sm:px-3 sm:py-1.5"
        aria-keyshortcuts="Meta+K Control+K">
        <AdminIcon name="search" className="size-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-faint sm:inline">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-navy-950/50 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <div role="dialog" aria-modal="true" aria-label="Search customers, VINs, orders, reports and tickets"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <AdminIcon name="search" className="size-4 shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
              else if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
              else if (event.key === "Enter") { event.preventDefault(); go(flat[active]); }
            }}
            placeholder="Search customers, VINs, orders, reports, tickets…"
            className="w-full bg-transparent py-3.5 text-sm text-ink outline-none placeholder:text-faint"
            aria-label="Search"
            autoComplete="off"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-faint">esc</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {busy && searching && !groups.length && <p className="px-3 py-6 text-center text-sm text-faint">Searching…</p>}
          {searching && !busy && !groups.length && <p className="px-3 py-6 text-center text-sm text-faint">No matches for “{query.trim()}”.</p>}
          {visible.map(group => (
            <div key={group.label} className="mb-1">
              <p className="admin-nav-group-label px-3 pb-1 pt-2 !text-faint">{group.label}</p>
              <ul>
                {group.items.map(item => {
                  const index = flat.indexOf(item);
                  return (
                    <li key={item.href + item.title}>
                      <button onMouseEnter={() => setActive(index)} onClick={() => go(item)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${index === active ? "bg-surface text-ink" : "text-muted"}`}>
                        <span className="truncate font-medium">{item.title}</span>
                        <span className="shrink-0 text-xs text-faint">{item.hint}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-faint">
          <span>↑ ↓ to move · Enter to open</span>
          <span>Authorised results only</span>
        </div>
      </div>
    </div>
  );
}

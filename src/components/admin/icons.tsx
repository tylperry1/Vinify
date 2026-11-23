/**
 * Line icons for the admin shell. 24px grid, 1.6 stroke, currentColor.
 * Single-path outlines keep the payload tiny — no icon dependency.
 */
export type IconName =
  | "overview" | "analytics" | "health" | "customers" | "staff" | "orders" | "payments"
  | "refunds" | "subscriptions" | "products" | "reports" | "vin" | "api" | "providers"
  | "financials" | "costs" | "promotions" | "support" | "activity" | "security"
  | "permissions" | "settings" | "account" | "chevron" | "chevronDown" | "menu"
  | "search" | "sun" | "moon" | "signout" | "collapse" | "bell" | "sparkle"
  | "plus" | "arrowUpRight" | "filter" | "alert" | "inbox" | "refresh" | "check"
  | "clock" | "external" | "mail" | "database" | "lock";

const paths: Record<IconName, string> = {
  overview: "M4 13h5v7H4zM10 4h4v16h-4zM16 9h4v11h-4z",
  analytics: "M4 19V5m0 14h16M8 15l3-4 3 2 4-6",
  health: "M3 12h3l2.5-6 4 12L15 12h6",
  customers: "M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M17 11a2.5 2.5 0 1 0 0-5M21 19v-1a3 3 0 0 0-2-2.8",
  staff: "M12 3l7 3v5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6zM9 12l2 2 4-4",
  orders: "M4 7h16l-1.4 11.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8zM8 7V5a4 4 0 0 1 8 0v2",
  payments: "M3 7h18v10H3zM3 11h18M7 15h3",
  refunds: "M4 12a8 8 0 1 0 2.6-5.9M4 4v4h4",
  subscriptions: "M7 7h10a4 4 0 0 1 0 8H7m0 0 3-3m-3 3 3 3M17 17H7a4 4 0 0 1 0-8",
  products: "M4 8l8-4 8 4-8 4zM4 8v8l8 4 8-4V8M12 12v8",
  reports: "M7 3h7l4 4v14H7zM14 3v5h4M10 13h6M10 17h6",
  vin: "M5 11l1.6-4.4A2 2 0 0 1 8.5 5h7a2 2 0 0 1 1.9 1.6L19 11v6h-2.5v-2h-9v2H5zM7.5 11h9M8 14h.01M16 14h.01",
  api: "M10 8 6 12l4 4M14 8l4 4-4 4M13 5l-2 14",
  providers: "M4 5h16v5H4zM4 14h16v5H4zM7 7.5h.01M7 16.5h.01",
  financials: "M3 8h16v10H3zM16 13h2M3 11h16M6 5h10",
  costs: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3",
  promotions: "M4 10 10 4h8l2 2v8l-6 6zM15 8.5h.01",
  support: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01",
  activity: "M3 12h4l2.5-6 4 12L16 12h5",
  security: "M12 3l7 3v5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6zM12 9v4M12 16h.01",
  permissions: "M15 8a4 4 0 1 1-3.5 6H9v2H7v2H4v-3l6-6A4 4 0 0 1 15 8M16 8h.01",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M4.5 9.5l1.8-1M17.7 15.5l1.8-1M12 4v2M12 18v2M5.2 16.8l1.5-1.5M17.3 8.7l1.5-1.5",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1",
  chevron: "M9 6l6 6-6 6",
  chevronDown: "M6 9l6 6 6-6",
  menu: "M4 7h16M4 12h16M4 17h16",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 2v2M12 20v2M3.5 6.5l1.5 1.5M19 18l1.5 1.5M2 12h2M20 12h2M6.5 19 5 20.5M18 6l1.5-1.5",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5",
  signout: "M15 12H4m4-4-4 4 4 4M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4",
  collapse: "M4 4v16M9 12h11M16 8l4 4-4 4",
  bell: "M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M10.5 20a2 2 0 0 0 3 0",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z",
  plus: "M12 5v14M5 12h14",
  arrowUpRight: "M7 17 17 7M9 7h8v8",
  filter: "M4 5h16l-6 7v6l-4 2v-8z",
  alert: "M12 3 2.5 20h19zM12 10v4M12 17h.01",
  inbox: "M4 4h16v16H4zM4 14h5l1 2h4l1-2h5",
  refresh: "M20 11a8 8 0 0 0-14-4M4 5v4h4M4 13a8 8 0 0 0 14 4M20 19v-4h-4",
  check: "M5 13l4 4L19 7",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2",
  external: "M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  database: "M12 8c4.4 0 8-1.1 8-2.5S16.4 3 12 3 4 4.1 4 5.5 7.6 8 12 8M4 5.5v13C4 19.9 7.6 21 12 21s8-1.1 8-2.5v-13M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5",
  lock: "M6 10h12v10H6zM8.5 10V7a3.5 3.5 0 0 1 7 0v3M12 14v2",
};

export function AdminIcon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={paths[name]} />
    </svg>
  );
}

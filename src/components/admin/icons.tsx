/** Line icons for the admin shell. 20px grid, 1.6 stroke, currentColor. */
export type IconName =
  | "overview" | "analytics" | "customers" | "orders" | "subscriptions"
  | "reports" | "api" | "support" | "activity" | "settings" | "account"
  | "chevron" | "menu" | "search" | "sun" | "moon" | "signout" | "collapse";

const paths: Record<IconName, string> = {
  overview: "M4 13h5v7H4zM10 4h4v16h-4zM16 9h4v11h-4z",
  analytics: "M4 19V5m0 14h16M8 15l3-4 3 2 4-6",
  customers: "M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M17 11a2.5 2.5 0 1 0 0-5M21 19v-1a3 3 0 0 0-2-2.8",
  orders: "M4 7h16l-1.4 11.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8zM8 7V5a4 4 0 0 1 8 0v2",
  subscriptions: "M7 7h10a4 4 0 0 1 0 8H7m0 0 3-3m-3 3 3 3M17 17H7a4 4 0 0 1 0-8",
  reports: "M7 3h7l4 4v14H7zM14 3v5h4M10 13h6M10 17h6",
  api: "M10 8 6 12l4 4M14 8l4 4-4 4M13 5l-2 14",
  support: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01",
  activity: "M3 12h4l2.5-6 4 12L16 12h5",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M4.5 9.5l1.8-1M17.7 15.5l1.8-1M12 4v2M12 18v2M5.2 16.8l1.5-1.5M17.3 8.7l1.5-1.5",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1",
  chevron: "M9 6l6 6-6 6",
  menu: "M4 7h16M4 12h16M4 17h16",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 2v2M12 20v2M3.5 6.5l1.5 1.5M19 18l1.5 1.5M2 12h2M20 12h2M6.5 19 5 20.5M18 6l1.5-1.5",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5",
  signout: "M15 12H4m4-4-4 4 4 4M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4",
  collapse: "M4 4v16M9 12h11M16 8l4 4-4 4",
};

export function AdminIcon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={paths[name]} />
    </svg>
  );
}

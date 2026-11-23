import type { IconName } from "./icons";

export type NavItem = { href: string; label: string; icon: IconName };
export type NavGroup = { label: string; items: NavItem[] };

/**
 * Every entry points at a route that renders real records. Sections the platform
 * does not have yet (packages, permissions, MFA, system health) are deliberately
 * absent rather than shown as dead navigation.
 */
export const adminNav: NavGroup[] = [
  {
    label: "Command",
    items: [
      { href: "/admin", label: "Overview", icon: "overview" },
      { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
    ],
  },
  {
    label: "Revenue",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "orders" },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: "subscriptions" },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/admin/customers", label: "Customers", icon: "customers" },
      { href: "/admin/support", label: "Support", icon: "support" },
    ],
  },
  {
    label: "Report engine",
    items: [
      { href: "/admin/reports", label: "Reports", icon: "reports" },
      { href: "/admin/api-center", label: "API Center", icon: "api" },
    ],
  },
  {
    label: "Security",
    items: [
      { href: "/admin/activity", label: "Activity log", icon: "activity" },
      { href: "/admin/settings", label: "Settings", icon: "settings" },
      { href: "/admin/account", label: "Your account", icon: "account" },
    ],
  },
];

export function labelForPath(pathname: string): string[] {
  const found = adminNav.flatMap(group => group.items).find(item => item.href === pathname);
  if (pathname === "/admin") return ["Overview"];
  if (found) return [found.label];
  const last = pathname.split("/").filter(Boolean).pop() ?? "Admin";
  return [last.replaceAll("-", " ").replace(/^\w/, c => c.toUpperCase())];
}

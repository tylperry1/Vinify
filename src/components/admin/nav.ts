import type { IconName } from "./icons";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Routes that only render for SUPER_ADMIN (server-enforced by requireAdmin(true)). */
  superOnly?: boolean;
  /** Short hint used by the collapsed tooltip and the command palette. */
  hint?: string;
};

export type NavGroup = { id: string; label: string; items: NavItem[] };

/**
 * Navigation only lists sections that render real records — every href below is
 * backed by a route in this console. Sections the schema cannot support yet
 * (expenses, campaigns, SEO, communications) are absent rather than dead links.
 */
export const adminNav: NavGroup[] = [
  {
    id: "command",
    label: "Command center",
    items: [
      { href: "/admin", label: "Overview", icon: "overview", hint: "Executive dashboard" },
      { href: "/admin/analytics", label: "Analytics", icon: "analytics", hint: "Trends and funnel" },
      { href: "/admin/health", label: "System health", icon: "health", hint: "Live connection checks" },
    ],
  },
  {
    id: "revenue",
    label: "Revenue",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "orders", hint: "Every order" },
      { href: "/admin/payments", label: "Payments", icon: "payments", hint: "Paid orders" },
      { href: "/admin/refunds", label: "Refunds", icon: "refunds", hint: "Refunded orders" },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: "subscriptions", hint: "Recurring plans" },
      { href: "/admin/products", label: "Products & pricing", icon: "products", hint: "Plans and sales" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    items: [
      { href: "/admin/customers", label: "Customers", icon: "customers", hint: "Accounts and activity" },
      { href: "/admin/staff", label: "Staff", icon: "staff", superOnly: true, hint: "Admin roles" },
      { href: "/admin/support", label: "Support center", icon: "support", hint: "Ticket queue" },
    ],
  },
  {
    id: "reports",
    label: "Report engine",
    items: [
      { href: "/admin/reports", label: "Reports", icon: "reports", hint: "Requests and retries" },
      { href: "/admin/vin-searches", label: "VIN searches", icon: "vin", hint: "Decode activity" },
      { href: "/admin/api-center", label: "API center", icon: "api", hint: "Providers and usage" },
      { href: "/admin/providers", label: "Providers", icon: "providers", hint: "Supplier calls" },
    ],
  },
  {
    id: "financials",
    label: "Financials",
    items: [
      { href: "/admin/financials", label: "Financial overview", icon: "financials", hint: "Revenue and profit" },
      { href: "/admin/provider-costs", label: "Provider costs", icon: "costs", hint: "Unit economics" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { href: "/admin/promotions", label: "Promotions", icon: "promotions", hint: "Promo code usage" },
    ],
  },
  {
    id: "security",
    label: "Security",
    items: [
      { href: "/admin/activity", label: "Activity log", icon: "activity", hint: "Audit trail" },
      { href: "/admin/security", label: "Security center", icon: "security", hint: "Sessions and access" },
      { href: "/admin/permissions", label: "Permissions", icon: "permissions", hint: "Enforced role rules" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: "settings", hint: "Staff and integrations" },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { href: "/admin/account", label: "Your account", icon: "account", hint: "Password and email" },
    ],
  },
];

/** Drop entries the signed-in role may not use, then drop empty groups. */
export function navForRole(role: string): NavGroup[] {
  const superAdmin = role === "SUPER_ADMIN";
  return adminNav
    .map(group => ({ ...group, items: group.items.filter(item => !item.superOnly || superAdmin) }))
    .filter(group => group.items.length > 0);
}

export function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A breadcrumb trail for any console path, including the detail routes. */
export function labelForPath(pathname: string): string[] {
  if (pathname === "/admin") return ["Overview"];
  const parts = pathname.split("/").filter(Boolean); // ["admin", ...]
  const rest = parts.slice(1);
  const root = `/${parts[0]}/${rest[0] ?? ""}`;
  const group = adminNav.flatMap(g => g.items).find(item => item.href === root);
  const base = group?.label ?? (rest[0] ? rest[0].replaceAll("-", " ").replace(/^\w/, c => c.toUpperCase()) : "Admin");
  const child = rest[1];
  if (!child) return [base];
  if (child === "new") return [base, "New"];
  if (rest[0] === "customers") return [base, "Customer profile"];
  if (rest[0] === "orders") return [base, "Order detail"];
  return [base, child.replaceAll("-", " ").replace(/^\w/, c => c.toUpperCase())];
}

export type SectionMeta = { title: string; eyebrow: string; description: string };

export const sectionMeta: Record<string, SectionMeta> = {
  analytics: {
    title: "Analytics",
    eyebrow: "Command center",
    description: "Revenue, order, customer, search and report activity from live rows. Switch the window to compare like-for-like periods.",
  },
  health: {
    title: "System health",
    eyebrow: "Command center",
    description: "Each check below ran against the real database, provider log or environment when this page rendered.",
  },
  orders: {
    title: "Orders",
    eyebrow: "Revenue",
    description: "Every order row, with the customer, package and payment status recorded by the billing webhook.",
  },
  payments: {
    title: "Payments",
    eyebrow: "Revenue",
    description: "Orders that Stripe has marked PAID. Payment intents open directly in the Stripe dashboard.",
  },
  refunds: {
    title: "Refunds",
    eyebrow: "Revenue",
    description: "Orders recorded as refunded or partially refunded. Refunds are issued in Stripe; this view is read-only.",
  },
  subscriptions: {
    title: "Subscriptions",
    eyebrow: "Revenue",
    description: "Recurring plans stored on the account. Recurring billing is not enabled yet, so this list is normally empty.",
  },
  products: {
    title: "Products & pricing",
    eyebrow: "Revenue",
    description: "The plan catalogue plus real order volume per plan. Catalogue prices are the proposed list, not a live checkout configuration.",
  },
  customers: {
    title: "Customers",
    eyebrow: "Customers",
    description: "Customer accounts and their recorded activity. Open a profile for searches, orders, reports and support.",
  },
  staff: {
    title: "Staff",
    eyebrow: "Customers",
    description: "Admin accounts and their roles. A role change revokes that staff member's sessions immediately.",
  },
  support: {
    title: "Support center",
    eyebrow: "Customers",
    description: "Tickets submitted by customers, with the status saved on each row.",
  },
  reports: {
    title: "Reports",
    eyebrow: "Report engine",
    description: "Report requests, their supplier attempts and the generated report. Retries go through the licensed adapter, or refuse honestly when it is absent.",
  },
  "vin-searches": {
    title: "VIN searches",
    eyebrow: "Report engine",
    description: "Every VIN decoded through the public decoder, newest first.",
  },
  "api-center": {
    title: "API center",
    eyebrow: "Report engine",
    description: "Provider configuration and recorded usage. Stored credentials are encrypted and never displayed.",
  },
  providers: {
    title: "Providers",
    eyebrow: "Report engine",
    description: "Real supplier calls per report request, including HTTP status, latency and billed cost.",
  },
  financials: {
    title: "Financial overview",
    eyebrow: "Financials",
    description: "Revenue, refunds, provider cost and an explicit estimate of gross profit. Nothing here is an accounting record.",
  },
  "provider-costs": {
    title: "Provider costs",
    eyebrow: "Financials",
    description: "Recorded API usage by provider, with estimated cost, success rate and latency.",
  },
  promotions: {
    title: "Promotions",
    eyebrow: "Marketing",
    description: "Promo codes captured on orders, grouped by code. Codes are created in Stripe; this view reports what was actually redeemed.",
  },
  activity: {
    title: "Activity log",
    eyebrow: "Security",
    description: "Append-only audit rows written by admin actions, sign-ins and billing events.",
  },
  security: {
    title: "Security center",
    eyebrow: "Security",
    description: "Active sessions, admin access and authentication events read from the session and audit tables.",
  },
  permissions: {
    title: "Permissions",
    eyebrow: "Security",
    description: "The role rules this console actually enforces in server actions and route guards.",
  },
  settings: {
    title: "Settings",
    eyebrow: "System",
    description: "Staff roles and the integration state reported by the running application.",
  },
};

/**
 * Vinify plans.
 *
 * STATUS: PROPOSED — subject to supplier cost validation (Roadmap Phase 6).
 * Do not treat these as committed launch prices until supplier contracts are signed
 * and full-redemption unit economics are approved.
 */

export type PlanId = "single" | "bundle3" | "plus" | "pro" | "dealer";

export interface Plan {
  id: PlanId;
  name: string;
  priceCents: number | null; // null = custom
  interval: "one_time" | "month" | "custom";
  reports: number | null;
  blurb: string;
  features: string[];
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "single",
    name: "Single Report",
    priceCents: 999,
    interval: "one_time",
    reports: 1,
    blurb: "One vehicle you’re serious about.",
    features: ["1 vehicle history report", "Web report + PDF download", "Saved to your account"],
  },
  {
    id: "bundle3",
    name: "3-Report Bundle",
    priceCents: 2499,
    interval: "one_time",
    reports: 3,
    blurb: "Compare your shortlist.",
    features: ["3 report credits", "Use on any VINs", "Web report + PDF download"],
    highlight: true,
  },
  {
    id: "plus",
    name: "Vinify Plus",
    priceCents: 1999,
    interval: "month",
    reports: 3,
    blurb: "For active shoppers.",
    features: ["3 reports every month", "Saved vehicles & search history", "Cancel anytime"],
  },
  {
    id: "pro",
    name: "Vinify Pro",
    priceCents: 4999,
    interval: "month",
    reports: 10,
    blurb: "For flippers and frequent buyers.",
    features: ["10 reports every month", "Priority support", "Cancel anytime"],
  },
];

export const DEALER_PLAN: Plan = {
  id: "dealer",
  name: "Dealership",
  priceCents: null,
  interval: "custom",
  reports: null,
  blurb: "Volume pricing for lots and automotive businesses.",
  features: ["Volume-based report pricing", "Team accounts (planned)", "Bulk VIN lookup (planned)"],
};

export function formatPrice(cents: number | null): string {
  if (cents === null) return "Custom";
  return `$${(cents / 100).toFixed(2)}`;
}

export interface FeeAssumptions {
  /** Card processing percentage, e.g. 0.029 */
  cardPct: number;
  /** Fixed per-transaction fee in cents, e.g. 30 */
  cardFixedCents: number;
  /** Additional billing fee for subscriptions, e.g. 0.007 */
  billingPct: number;
}

/** Stripe standard US domestic card + pay-as-you-go Billing, as published Nov 2026. Verify before use. */
export const DEFAULT_FEES: FeeAssumptions = { cardPct: 0.029, cardFixedCents: 30, billingPct: 0.007 };

/**
 * Contribution per report at FULL redemption (every included report used).
 * Excludes tax, refunds, disputes, infrastructure, support and acquisition cost.
 */
export function contributionPerReport(
  plan: Plan,
  supplierCostCents: number,
  fees: FeeAssumptions = DEFAULT_FEES,
): number | null {
  if (plan.priceCents === null || !plan.reports) return null;
  const pct = fees.cardPct + (plan.interval === "month" ? fees.billingPct : 0);
  const net = plan.priceCents - (plan.priceCents * pct + fees.cardFixedCents);
  return net / plan.reports - supplierCostCents;
}

/** Effective supplier cost when a fixed monthly platform fee is spread over volume. */
export function effectiveSupplierCost(monthlyFeeCents: number, perQueryCents: number, queries: number): number {
  if (queries <= 0) return Infinity;
  return monthlyFeeCents / queries + perQueryCents;
}

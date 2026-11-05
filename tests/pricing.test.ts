import { describe, expect, it } from "vitest";
import { PLANS, contributionPerReport, effectiveSupplierCost } from "../src/lib/pricing";

const plan = (id: string) => PLANS.find((p) => p.id === id)!;

describe("contributionPerReport (full redemption, Stripe fees only)", () => {
  it("single report at $0 supplier cost ≈ $9.40", () => {
    expect(contributionPerReport(plan("single"), 0)! / 100).toBeCloseTo(9.40, 1);
  });
  it("Pro at $0 supplier cost ≈ $4.79 per report", () => {
    expect(contributionPerReport(plan("pro"), 0)! / 100).toBeCloseTo(4.79, 1);
  });
  it("Pro goes negative when effective supplier cost is $5", () => {
    expect(contributionPerReport(plan("pro"), 500)!).toBeLessThan(0);
  });
});

describe("effectiveSupplierCost", () => {
  it("$100/mo + $1/query at 25 queries = $5", () => {
    expect(effectiveSupplierCost(10000, 100, 25)).toBe(500);
  });
  it("at 500 queries = $1.20", () => {
    expect(effectiveSupplierCost(10000, 100, 500)).toBe(120);
  });
});

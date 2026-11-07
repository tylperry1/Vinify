import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
const mocks = vi.hoisted(() => ({ provider: vi.fn(), retrieve: vi.fn() }));
vi.mock("../src/lib/server/stripe", () => ({ stripeClient: () => ({ paymentIntents: { retrieve: mocks.retrieve } }) }));
vi.mock("../src/lib/server/providers", () => ({ historyProvider: mocks.provider }));
import { db } from "../src/lib/server/db";
import { processStripeEvent } from "../src/lib/server/billing";
import { generateReport } from "../src/lib/server/reports";
import { rateLimit } from "../src/lib/server/auth";
const run = process.env.TEST_DATABASE_URL ? describe : describe.skip;
run("PostgreSQL migration and transactional workflows", () => {
  const userId = "integration-customer", orderId = "integration-order";
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    await db.user.create({ data: { id: userId, email: "integration@example.test" } });
    await db.order.create({ data: { id: orderId, userId, planId: "bundle3", product: "REPORT_BUNDLE", amountCents: 2499 } });
    mocks.retrieve.mockResolvedValue({ metadata: { orderId } });
  });
  afterAll(async () => { await db.$disconnect(); });
  const paid = (id: string, amount = 2499) => ({ id, type: "checkout.session.completed", livemode: false, data: { object: { id: "cs_integration", mode: "payment", payment_status: "paid", currency: "usd", amount_total: amount, metadata: { orderId }, payment_intent: "pi_test" } } }) as unknown as Stripe.Event;
  const refund = (id: string, amount: number) => ({ id, type: "charge.refunded", livemode: false, data: { object: { payment_intent: "pi_test", amount: 2499, amount_refunded: amount } } }) as unknown as Stripe.Event;
  it("rolls back a mismatched payment without granting credits", async () => {
    await expect(processStripeEvent(paid("evt_bad", 1))).rejects.toThrow("match");
    expect(await db.webhookEvent.count()).toBe(0);
    expect(await db.creditLedger.count()).toBe(0);
  });
  it("grants a purchase once across duplicate deliveries and distinct completion events", async () => {
    await processStripeEvent(paid("evt_paid")); await processStripeEvent(paid("evt_paid")); await processStripeEvent(paid("evt_paid_again"));
    expect((await db.creditLedger.aggregate({ _sum: { delta: true } }))._sum.delta).toBe(3);
    expect(await db.creditLedger.count()).toBe(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("PAID");
  });
  it("reconciles cumulative refunds once and tolerates out-of-order deliveries", async () => {
    await processStripeEvent(refund("evt_partial", 1000));
    expect((await db.creditLedger.aggregate({ _sum: { delta: true } }))._sum.delta).toBe(2);
    await processStripeEvent(refund("evt_full", 2499)); await processStripeEvent(refund("evt_full", 2499));
    await processStripeEvent(refund("evt_old_partial", 1000)); await processStripeEvent(paid("evt_delayed_paid"));
    expect((await db.creditLedger.aggregate({ _sum: { delta: true } }))._sum.delta).toBe(0);
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("REFUNDED");
  });
  it("refuses unlicensed reports without reserving credits", async () => {
    mocks.provider.mockResolvedValue(null);
    expect((await generateReport(userId, "1HGCM82633A004352", "not-licensed-key")).status).toBe(503);
    expect(await db.reportRequest.count()).toBe(0);
  });
  it("returns credits on supplier failure without repeating a paid call", async () => {
    await db.creditLedger.create({ data: { userId, reason: "ADMIN_ADJUSTMENT", delta: 2, idempotencyKey: "test:grant" } });
    const fetchReport = vi.fn().mockRejectedValue(new Error("supplier down"));
    mocks.provider.mockResolvedValue({ id: "test-only", costCents: 200, fetchReport });
    const first = await generateReport(userId, "1HGCM82633A004352", "failure-key-0001");
    expect(first.status).toBe(502);
    expect((await generateReport(userId, "1HGCM82633A004352", "failure-key-0001")).status).toBe(409);
    expect(fetchReport).toHaveBeenCalledTimes(1);
    expect((await db.creditLedger.aggregate({ _sum: { delta: true } }))._sum.delta).toBe(2);
  });
  it("stores a successful report and consumes exactly one credit", async () => {
    const fetchReport = vi.fn().mockResolvedValue({ vin: "1HGCM82633A004352", provider: "test-only", providerReportId: "test-id", sourceAsOf: null, sections: [] });
    mocks.provider.mockResolvedValue({ id: "test-only", costCents: 200, fetchReport });
    const first = await generateReport(userId, "1HGCM82633A004352", "success-key-0001");
    expect(first.status).toBe(200);
    expect(await generateReport(userId, "1HGCM82633A004352", "success-key-0001")).toEqual(first);
    expect(fetchReport).toHaveBeenCalledTimes(1);
    expect((await db.creditLedger.aggregate({ _sum: { delta: true } }))._sum.delta).toBe(1);
    expect(await db.report.count()).toBe(1);
  });
  it("persists rate limits across independent calls", async () => {
    expect(await rateLimit("integration-rate", 2, 60000)).toBe(true);
    expect(await rateLimit("integration-rate", 2, 60000)).toBe(true);
    expect(await rateLimit("integration-rate", 2, 60000)).toBe(false);
  });
});

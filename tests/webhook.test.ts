import { beforeEach, it, expect, vi } from "vitest";
import Stripe from "stripe";
const processEvent = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/server/billing", () => ({ processStripeEvent: processEvent }));
import { POST } from "../src/app/api/stripe/webhook/route";
const secret = "whsec_test_only";
beforeEach(() => { vi.clearAllMocks(); process.env.DATABASE_URL = "postgresql://test"; process.env.STRIPE_SECRET_KEY = "sk_test_local"; process.env.STRIPE_WEBHOOK_SECRET = secret; delete process.env.STRIPE_LIVE_MODE; });
function request(payload: string, signature: string) { return new Request("http://local/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": signature } }); }
it("rejects invalid and stale Stripe signatures", async () => {
  const payload = JSON.stringify({ id: "evt_test", type: "test", livemode: false });
  expect((await POST(request(payload, "invalid"))).status).toBe(400);
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp: 1 });
  expect((await POST(request(payload, signature))).status).toBe(400);
  expect(processEvent).not.toHaveBeenCalled();
});
it("accepts signed test events and retries failed transactions", async () => {
  const payload = JSON.stringify({ id: "evt_test", type: "test", livemode: false });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  processEvent.mockResolvedValue(undefined);
  expect((await POST(request(payload, signature))).status).toBe(200);
  processEvent.mockRejectedValue(new Error("database down"));
  expect((await POST(request(payload, signature))).status).toBe(500);
});
it("rejects a live event in the test environment", async () => {
  const payload = JSON.stringify({ id: "evt_live", type: "test", livemode: true });
  expect((await POST(request(payload, Stripe.webhooks.generateTestHeaderString({ payload, secret })))).status).toBe(400);
  expect(processEvent).not.toHaveBeenCalled();
});

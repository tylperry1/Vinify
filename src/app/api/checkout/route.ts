import { currentUser, rateLimit } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { stripeClient } from "@/lib/server/stripe";
import { historyProvider } from "@/lib/server/providers";
import { readJson, sameOrigin } from "@/lib/server/http";
import { PLANS } from "@/lib/pricing";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (process.env.COMMERCE_ENABLED !== "true" || !await historyProvider()) return Response.json({ error: "Paid reports are not available yet" }, { status: 503 });
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!process.env.STRIPE_WEBHOOK_SECRET || !secret?.startsWith(process.env.STRIPE_LIVE_MODE === "true" ? "sk_live_" : "sk_test_")) return Response.json({ error: "Checkout is not configured" }, { status: 503 });
  if (!await rateLimit(`checkout:${user.id}`, 10, 60000)) return Response.json({ error: "Too many requests" }, { status: 429 });
  let body; try { body = await readJson(request); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const plan = PLANS.find(p => p.id === body.plan && p.interval === "one_time");
  const key = request.headers.get("idempotency-key") ?? "";
  if (!plan?.priceCents || !plan.reports || !/^[a-zA-Z0-9-]{16,100}$/.test(key)) return Response.json({ error: "Invalid plan or idempotency key" }, { status: 400 });
  const order = await db.order.upsert({ where: { id: `checkout:${user.id}:${key}` }, update: {}, create: { id: `checkout:${user.id}:${key}`, userId: user.id, planId: plan.id, product: plan.id === "single" ? "SINGLE_REPORT" : "REPORT_BUNDLE", amountCents: plan.priceCents } });
  if (order.planId !== plan.id || order.status !== "PENDING") return Response.json({ error: "Use a new idempotency key" }, { status: 409 });
  try {
    const stripe = stripeClient();
    if (order.stripeCheckoutSession) {
      const previous = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSession);
      return previous.status === "open" && previous.url ? Response.json({ url: previous.url }) : Response.json({ error: "This checkout session has ended. Try again to start a new one." }, { status: 409 });
    }
    if (Date.now() - order.createdAt.getTime() > 23 * 3600000) return Response.json({ error: "This checkout request has expired. Try again to start a new one." }, { status: 409 });
    const session = await stripe.checkout.sessions.create({ mode: "payment", customer_email: user.email,
      client_reference_id: order.id, metadata: { orderId: order.id }, payment_intent_data: { metadata: { orderId: order.id } },
      line_items: [{ price_data: { currency: "usd", unit_amount: order.amountCents, product_data: { name: plan.name } }, quantity: 1 }],
      success_url: `${new URL(process.env.NEXT_PUBLIC_SITE_URL!).origin}/account?checkout=success`, cancel_url: `${new URL(process.env.NEXT_PUBLIC_SITE_URL!).origin}/account`,
    }, { idempotencyKey: order.id });
    await db.order.update({ where: { id: order.id }, data: { stripeCheckoutSession: session.id } });
    return Response.json({ url: session.url });
  } catch { return Response.json({ error: "Checkout unavailable" }, { status: 503 }); }
}

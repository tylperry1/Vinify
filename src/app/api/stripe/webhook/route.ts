import { stripeClient } from "@/lib/server/stripe";
import { processStripeEvent } from "@/lib/server/billing";
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) return Response.json({ error: "Billing is not configured" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });
  const raw = await request.text();
  if (raw.length > 262144) return Response.json({ error: "Event too large" }, { status: 413 });
  let event;
  try { event = stripeClient().webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET); }
  catch { return Response.json({ error: "Invalid signature" }, { status: 400 }); }
  if (event.livemode !== (process.env.STRIPE_LIVE_MODE === "true")) return Response.json({ error: "Wrong payment environment" }, { status: 400 });
  try { await processStripeEvent(event); return Response.json({ received: true }); }
  catch { return Response.json({ error: "Event processing failed; retry required" }, { status: 500 }); }
}

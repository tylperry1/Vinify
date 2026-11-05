import "server-only";
import type Stripe from "stripe";
import { db } from "./db";
import { stripeClient } from "./stripe";
import { PLANS } from "../pricing";
export async function processStripeEvent(event: Stripe.Event) {
  let refund: { orderId: string; amount: number; total: number } | undefined;
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (intentId) {
      const intent = await stripeClient().paymentIntents.retrieve(intentId);
      if (intent.metadata.orderId) refund = { orderId: intent.metadata.orderId, amount: charge.amount_refunded, total: charge.amount };
    }
  }
  await db.$transaction(async tx => {
    if (await tx.webhookEvent.findUnique({ where: { id: event.id } })) return;
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (!orderId) throw new Error("Missing Vinify order reference");
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (session.payment_status === "paid") {
        if (session.currency !== order.currency || session.amount_total !== order.amountCents || session.mode !== "payment" || (order.stripeCheckoutSession && session.id !== order.stripeCheckoutSession)) throw new Error("Payment does not match order");
        const grant = PLANS.find(p => p.id === order.planId && p.interval === "one_time")?.reports;
        if (!grant) throw new Error("Unknown purchased plan");
        const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        await tx.order.update({ where: { id: order.id }, data: { stripeCheckoutSession: session.id, stripePaymentIntent: intent, ...(["PENDING", "FAILED"].includes(order.status) ? { status: "PAID" as const } : {}) } });
        await tx.creditLedger.upsert({ where: { idempotencyKey: `purchase:${order.id}` }, update: {}, create: { userId: order.userId, orderId: order.id, reason: "PURCHASE", delta: grant, idempotencyKey: `purchase:${order.id}` } });
      }
    } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.orderId) await tx.order.updateMany({ where: { id: session.metadata.orderId, status: "PENDING" }, data: { status: "FAILED" } });
    } else if (refund) {
      const order = await tx.order.findUniqueOrThrow({ where: { id: refund.orderId } });
      const grant = PLANS.find(p => p.id === order.planId)?.reports;
      if (!grant || refund.total !== order.amountCents) throw new Error("Refund does not match order");
      const previous = await tx.creditLedger.aggregate({ where: { orderId: order.id, reason: "REFUND_REVERSAL" }, _sum: { delta: true } });
      const target = Math.floor(grant * refund.amount / refund.total), already = -(previous._sum.delta ?? 0);
      if (target > already) await tx.creditLedger.create({ data: { userId: order.userId, orderId: order.id, delta: -(target - already), reason: "REFUND_REVERSAL", idempotencyKey: `refund:${event.id}` } });
      const fullyRefunded = target === grant || order.status === "REFUNDED";
      await tx.order.update({ where: { id: order.id }, data: { status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
    }
    // Keep only non-sensitive event metadata. Unknown event types are acknowledged without side effects.
    await tx.webhookEvent.create({ data: { id: event.id, type: event.type, payload: { livemode: event.livemode }, processedAt: new Date() } });
  }, { isolationLevel: "Serializable" });
}

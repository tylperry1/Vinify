#!/usr/bin/env node
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  CUSTOMERS,
  CUSTOMER_PASSWORD,
  DEV_ADMIN,
  ORDERS,
  SAVED_VEHICLES,
  SEED_VERSION,
  SUBSCRIPTIONS,
  TICKETS,
  VEHICLES,
  fictionalReport,
} from "./fixtures.mjs";
import { assertLocalDatabase, ensureLocalEnvFile, loadEnvironment, text } from "./load-env.mjs";

/**
 * Idempotent development seeder.
 *
 * Every record has a deterministic `seed_*` id or unique key, so re-running
 * `npm run db:seed` updates the same rows instead of creating duplicates.
 * Refuses to run unless DATABASE_URL is loopback (see load-env.mjs).
 */

const hashPassword = (password, salt) => `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
const pad = (n) => String(n).padStart(2, "0");
const daysAgo = (days) => new Date(Date.now() - days * 86_400_000);

const PRODUCT = { single: "SINGLE_REPORT", bundle3: "REPORT_BUNDLE", plus: "SUBSCRIPTION", pro: "SUBSCRIPTION" };

const REPORT_VARIANTS = {
  model3: { accidents: 1, recalls: 2 },
  rav4: { accidents: 0, recalls: 0 },
  "370z": { accidents: 1, recalls: 0, rollback: true },
  cherokee: { accidents: 2, recalls: 1 },
  accord: { accidents: 1, recalls: 0 },
  f150: { accidents: 0, recalls: 1 },
  malibu: { accidents: 2, recalls: 1 },
};

async function seed(db) {
  const now = new Date();

  /* ---------------------------------------------------------------- staff */
  await db.user.upsert({
    where: { id: DEV_ADMIN.id },
    create: {
      id: DEV_ADMIN.id,
      email: DEV_ADMIN.email,
      name: DEV_ADMIN.name,
      role: DEV_ADMIN.role,
      passwordHash: hashPassword(DEV_ADMIN.password, randomBytes(16).toString("hex")),
      emailVerified: now,
      createdAt: daysAgo(180),
    },
    update: { name: DEV_ADMIN.name, role: DEV_ADMIN.role },
  });

  /* ------------------------------------------------------------ customers */
  const customers = [];
  for (const customer of CUSTOMERS) {
    const id = `seed_customer_${pad(customer.n)}`;
    const shared = {
      email: customer.email,
      name: customer.name,
      emailVerified: customer.verified ? new Date(customer.createdAt) : null,
      marketingOptIn: customer.marketing,
      deletedAt: customer.suspendedAt ? new Date(customer.suspendedAt) : null,
      stripeCustomer: `cus_test_seed_${pad(customer.n)}`,
    };
    const user = await db.user.upsert({
      where: { id },
      create: {
        id,
        ...shared,
        role: "CUSTOMER",
        passwordHash: hashPassword(CUSTOMER_PASSWORD, randomBytes(16).toString("hex")),
        createdAt: new Date(customer.createdAt),
      },
      // Passwords are set on create only, so a rerun never resets a changed dev password.
      update: shared,
    });
    customers.push(user);
  }

  /* -------------------------------------------------------- provider rows */
  await db.apiProvider.upsert({
    where: { id: "nhtsa" },
    create: { id: "nhtsa", enabled: true, costCents: 0 },
    update: { enabled: true, costCents: 0 },
  });

  /* ---------------------------------------------- vehicles as VIN searches */
  for (const [index, vehicle] of VEHICLES.entries()) {
    const data = {
      userId: customers[index % customers.length].id,
      vin: vehicle.vin,
      year: String(vehicle.year),
      make: vehicle.make,
      model: vehicle.model,
      createdAt: daysAgo(140 - index * 7),
    };
    await db.vinSearch.upsert({ where: { id: `seed_search_${pad(index + 1)}` }, create: { id: `seed_search_${pad(index + 1)}`, ...data }, update: data });
  }

  for (const [index, saved] of SAVED_VEHICLES.entries()) {
    const vehicle = VEHICLES[saved.vehicle];
    const userId = customers[saved.customer - 1].id;
    const data = { nickname: saved.nickname, createdAt: daysAgo(80 - index * 4) };
    await db.savedVehicle.upsert({
      where: { userId_vin: { userId, vin: vehicle.vin } },
      create: { id: `seed_saved_${pad(index + 1)}`, userId, vin: vehicle.vin, ...data },
      update: data,
    });
  }

  /* --------------------------------------------- orders, requests, reports */
  for (const order of ORDERS) {
    const user = customers[order.customer - 1];
    const vehicle = VEHICLES[order.vehicle];
    const createdAt = daysAgo(order.daysAgo);
    const paid = ["completed", "processing", "refunded", "partial_refund"].includes(order.scenario);
    const orderId = `seed_order_${pad(order.n)}`;
    const orderData = {
      userId: user.id,
      product: PRODUCT[order.plan],
      planId: order.plan,
      amountCents: order.amountCents,
      currency: "usd",
      status: order.status,
      stripeCheckoutSession: `cs_test_seed_${pad(order.n)}`,
      stripePaymentIntent: paid ? `pi_test_seed_${pad(order.n)}` : null,
      promoCode: order.n === 2 ? "DEVSEED" : null,
      createdAt,
      updatedAt: daysAgo(Math.max(0, order.daysAgo - 1)),
    };
    await db.order.upsert({ where: { id: orderId }, create: { id: orderId, ...orderData }, update: orderData });

    if (paid && order.credits) {
      const grant = {
        userId: user.id,
        orderId,
        delta: order.credits,
        reason: order.plan === "plus" || order.plan === "pro" ? "SUBSCRIPTION_GRANT" : "PURCHASE",
        note: "Fictional development seed grant",
        createdAt,
      };
      await db.creditLedger.upsert({ where: { idempotencyKey: `seed:grant:${pad(order.n)}` }, create: { id: `seed_ledger_grant_${pad(order.n)}`, idempotencyKey: `seed:grant:${pad(order.n)}`, ...grant }, update: grant });
    }

    if (order.reportStatus) {
      const requestId = `seed_request_${pad(order.n)}`;
      const failed = order.reportStatus === "FAILED" || order.reportStatus === "REFUNDED";
      const requestData = {
        userId: user.id,
        vin: vehicle.vin,
        status: order.reportStatus,
        attempts: order.reportStatus === "QUEUED" ? 0 : failed ? 3 : 1,
        lastError: failed ? "Fictional test failure: supplier did not return a report" : null,
        createdAt: new Date(createdAt.getTime() + 60_000),
        updatedAt: new Date(createdAt.getTime() + 300_000),
      };
      await db.reportRequest.upsert({
        where: { id: requestId },
        create: { id: requestId, idempotencyKey: `seed:request:${pad(order.n)}`, ...requestData },
        update: requestData,
      });

      const reserved = {
        userId: user.id,
        reportRequestId: requestId,
        delta: -1,
        reason: "RESERVE",
        note: "Fictional development seed reservation",
        createdAt: new Date(createdAt.getTime() + 61_000),
      };
      await db.creditLedger.upsert({ where: { idempotencyKey: `seed:reserve:${pad(order.n)}` }, create: { id: `seed_ledger_reserve_${pad(order.n)}`, idempotencyKey: `seed:reserve:${pad(order.n)}`, ...reserved }, update: reserved });

      if (order.reportStatus === "SUCCEEDED") {
        const consumed = { userId: user.id, reportRequestId: requestId, delta: 0, reason: "CONSUME", note: "Fictional development seed settlement", createdAt: new Date(createdAt.getTime() + 90_000) };
        await db.creditLedger.upsert({ where: { idempotencyKey: `seed:consume:${pad(order.n)}` }, create: { id: `seed_ledger_consume_${pad(order.n)}`, idempotencyKey: `seed:consume:${pad(order.n)}`, ...consumed }, update: consumed });

        const report = fictionalReport(vehicle, REPORT_VARIANTS[vehicle.key] ?? { accidents: 0, recalls: 0 });
        const reportData = {
          publicId: `VNF-DEMO-${pad(order.n)}`,
          userId: user.id,
          reportRequestId: requestId,
          vin: vehicle.vin,
          provider: "sample",
          providerReportId: report.providerReportId,
          sourceAsOf: new Date(`${report.sourceAsOf}T00:00:00Z`),
          generatedAt: new Date(createdAt.getTime() + 120_000),
          version: 1,
          data: report,
        };
        await db.report.upsert({ where: { id: `seed_report_${pad(order.n)}` }, create: { id: `seed_report_${pad(order.n)}`, ...reportData }, update: reportData });
      }

      if (failed) {
        const released = { userId: user.id, reportRequestId: requestId, delta: 1, reason: "RELEASE", note: "Fictional development seed release", createdAt: new Date(createdAt.getTime() + 120_000) };
        await db.creditLedger.upsert({ where: { idempotencyKey: `seed:release:${pad(order.n)}` }, create: { id: `seed_ledger_release_${pad(order.n)}`, idempotencyKey: `seed:release:${pad(order.n)}`, ...released }, update: released });
      }

      const supplier = {
        reportRequestId: requestId,
        provider: "sample",
        attempt: failed ? 3 : 1,
        httpStatus: failed ? 504 : 200,
        latencyMs: failed ? 30_000 : 640 + order.n * 23,
        success: !failed,
        billable: true,
        costCents: 0,
        error: failed ? "Fictional supplier timeout" : null,
        createdAt: new Date(createdAt.getTime() + 95_000),
      };
      await db.supplierRequest.upsert({ where: { id: `seed_supplier_${pad(order.n)}` }, create: { id: `seed_supplier_${pad(order.n)}`, ...supplier }, update: supplier });
    }

    if (order.status === "REFUNDED") {
      const reversal = { userId: user.id, orderId, delta: -order.credits, reason: "REFUND_REVERSAL", note: "Fictional development seed refund", createdAt: daysAgo(Math.max(0, order.daysAgo - 2)) };
      await db.creditLedger.upsert({ where: { idempotencyKey: `seed:refund:${pad(order.n)}` }, create: { id: `seed_ledger_refund_${pad(order.n)}`, idempotencyKey: `seed:refund:${pad(order.n)}`, ...reversal }, update: reversal });
    }

    if (order.status !== "PENDING") {
      const eventType =
        order.status === "REFUNDED" || order.status === "PARTIALLY_REFUNDED"
          ? "charge.refunded"
          : order.status === "PAID"
            ? "checkout.session.completed"
            : "checkout.session.async_payment_failed";
      const event = {
        type: eventType,
        payload: {
          id: `evt_test_seed_${pad(order.n)}`,
          type: eventType,
          livemode: false,
          data: {
            object: {
              id: `cs_test_seed_${pad(order.n)}`,
              amount_total: order.amountCents,
              amount_refunded: order.status === "REFUNDED" ? order.amountCents : order.status === "PARTIALLY_REFUNDED" ? 499 : 0,
              currency: "usd",
              payment_status: order.status === "PAID" ? "paid" : order.status === "FAILED" ? "unpaid" : "refunded",
            },
          },
        },
        receivedAt: daysAgo(Math.max(0, order.daysAgo - 1)),
        processedAt: daysAgo(Math.max(0, order.daysAgo - 1)),
      };
      await db.webhookEvent.upsert({ where: { id: `evt_test_seed_${pad(order.n)}` }, create: { id: `evt_test_seed_${pad(order.n)}`, ...event }, update: event });
    }
  }

  /* ------------------------------------------------------- subscriptions */
  for (const subscription of SUBSCRIPTIONS) {
    const user = customers[subscription.customer - 1];
    const data = {
      userId: user.id,
      planId: subscription.plan,
      status: subscription.status,
      reportsPerPeriod: subscription.reports,
      currentPeriodStart: daysAgo(subscription.startedDaysAgo),
      currentPeriodEnd: daysAgo(-subscription.endsInDays),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      createdAt: daysAgo(subscription.startedDaysAgo),
    };
    await db.subscription.upsert({
      where: { stripeSubscription: `sub_test_seed_${pad(subscription.n)}` },
      create: { id: `seed_subscription_${pad(subscription.n)}`, stripeSubscription: `sub_test_seed_${pad(subscription.n)}`, ...data },
      update: data,
    });
  }

  /* --------------------------------------------------- support + activity */
  for (const ticket of TICKETS) {
    const user = customers[ticket.customer - 1];
    const data = {
      userId: user.id,
      email: user.email,
      category: ticket.category,
      subject: ticket.subject,
      body: `[FICTIONAL TEST DATA] ${ticket.subject}. This ticket was created by the development seeder and contains no real customer information.`,
      status: ticket.status,
      createdAt: daysAgo(ticket.daysAgo),
      updatedAt: daysAgo(Math.max(0, ticket.daysAgo - 1)),
    };
    await db.supportTicket.upsert({ where: { id: `seed_ticket_${pad(ticket.n)}` }, create: { id: `seed_ticket_${pad(ticket.n)}`, ...data }, update: data });
  }

  for (let index = 0; index < 20; index++) {
    const data = {
      provider: "nhtsa",
      operation: "decode",
      success: index % 7 !== 0,
      status: index % 7 === 0 ? 503 : 200,
      latencyMs: 180 + index * 13,
      costCents: 0,
      createdAt: daysAgo(29 - index),
    };
    await db.apiUsage.upsert({ where: { id: `seed_usage_${pad(index + 1)}` }, create: { id: `seed_usage_${pad(index + 1)}`, ...data }, update: data });
  }

  const adminAdjustment = {
    userId: customers[2].id,
    delta: 1,
    reason: "ADMIN_ADJUSTMENT",
    actorId: DEV_ADMIN.id,
    note: "Fictional development credit adjustment",
    createdAt: daysAgo(4),
  };
  await db.creditLedger.upsert({
    where: { idempotencyKey: "seed:adjustment:01" },
    create: { id: "seed_ledger_adjustment_01", idempotencyKey: "seed:adjustment:01", ...adminAdjustment },
    update: adminAdjustment,
  });

  const audit = {
    actorId: DEV_ADMIN.id,
    action: "SEED_RUN",
    target: "development",
    meta: { version: SEED_VERSION, fictional: true, customers: CUSTOMERS.length, vehicles: VEHICLES.length, orders: ORDERS.length },
    ip: "127.0.0.1",
    createdAt: now,
  };
  await db.auditLog.upsert({ where: { id: "seed_audit_run" }, create: { id: "seed_audit_run", ...audit }, update: audit });
}

async function counts(db) {
  const [customers, orders, reports, requests, searches, saved, ledger, tickets, subscriptions, webhooks, usage] = await Promise.all([
    db.user.count({ where: { id: { startsWith: "seed_customer_" } } }),
    db.order.count({ where: { id: { startsWith: "seed_order_" } } }),
    db.report.count({ where: { id: { startsWith: "seed_report_" } } }),
    db.reportRequest.count({ where: { id: { startsWith: "seed_request_" } } }),
    db.vinSearch.count({ where: { id: { startsWith: "seed_search_" } } }),
    db.savedVehicle.count({ where: { id: { startsWith: "seed_saved_" } } }),
    db.creditLedger.count({ where: { id: { startsWith: "seed_ledger_" } } }),
    db.supportTicket.count({ where: { id: { startsWith: "seed_ticket_" } } }),
    db.subscription.count({ where: { id: { startsWith: "seed_subscription_" } } }),
    db.webhookEvent.count({ where: { id: { startsWith: "evt_test_seed_" } } }),
    db.apiUsage.count({ where: { id: { startsWith: "seed_usage_" } } }),
  ]);
  return { customers, orders, reports, reportRequests: requests, vinSearches: searches, savedVehicles: saved, ledgerEntries: ledger, tickets, subscriptions, webhookEvents: webhooks, apiUsage: usage };
}

async function main() {
  const created = ensureLocalEnvFile();
  loadEnvironment();
  if (created) console.log(`${text.green("✔")} Created ${created} with local development defaults`);
  const target = assertLocalDatabase("seed test data");
  console.log(`Seeding fictional development data into ${text.bold(target.masked)}`);
  const db = new PrismaClient();
  try {
    await seed(db);
    const summary = await counts(db);
    console.log(`\n${text.green("✔")} Development seed complete (idempotent) — fictional data only\n`);
    for (const [label, value] of Object.entries(summary)) console.log(`  ${label.padEnd(16)} ${value}`);
    console.log(`\n  Staff sign-in : ${DEV_ADMIN.email} / ${DEV_ADMIN.password}`);
    console.log(`  Customer      : ${CUSTOMERS[0].email} / ${CUSTOMER_PASSWORD}`);
    console.log(`  ${text.dim("Credentials exist only in this local database. Never reuse them in production.")}\n`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(`\n✖ Seed failed: ${error.message}\n`);
  process.exit(1);
});

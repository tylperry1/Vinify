#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, assertLocalDatabase, describeDatabase, loadEnvironment, text } from "./load-env.mjs";

/**
 * npm run db:status — connection, migration state and row counts.
 * Read-only: it never writes to the database.
 */

async function main() {
  loadEnvironment();
  const target = describeDatabase();

  console.log(`\n${text.bold("Vinify database status")}`);
  if (!target.configured) {
    console.log(`  ${text.red("✖ DATABASE_URL is not set")}`);
    console.log(`  Copy .env.example to .env.local or run npm run dev:db to create local defaults.\n`);
    process.exit(1);
  }
  console.log(`  ${text.dim("Target     ")} ${target.masked}`);
  console.log(`  ${text.dim("Environment")} ${target.local ? text.green("LOCAL DEVELOPMENT") : text.yellow("REMOTE — not touched by dev scripts")}`);

  const db = new PrismaClient({ log: [] });
  try {
    const started = Date.now();
    const [{ version }] = await db.$queryRawUnsafe("SELECT version()");
    const [{ now }] = await db.$queryRawUnsafe("SELECT now() AS now");
    console.log(`  ${text.dim("Connection ")} ${text.green("ok")} ${text.dim(`(${Date.now() - started} ms, ${String(version).split(",")[0]})`)}`);
    console.log(`  ${text.dim("Server time")} ${now.toISOString()}`);

    let applied = [];
    try {
      applied = await db.$queryRawUnsafe('SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at');
    } catch {
      console.log(`  ${text.dim("Migrations ")} ${text.yellow("no migration history — run npm run dev:db or npm run db:reset:local")}`);
    }
    const onDisk = readdirSync(path.join(PROJECT_ROOT, "prisma", "migrations"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const appliedNames = new Set(applied.map((row) => row.migration_name));
    const pending = onDisk.filter((name) => !appliedNames.has(name));
    console.log(`  ${text.dim("Migrations ")} ${applied.length}/${onDisk.length} applied${pending.length ? text.yellow(` · pending: ${pending.join(", ")}`) : text.green(" · up to date")}`);

    const [users, customers, orders, reports, requests, searches, ledger, tickets, webhooks] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: "CUSTOMER" } }),
      db.order.count(),
      db.report.count(),
      db.reportRequest.count(),
      db.vinSearch.count(),
      db.creditLedger.count(),
      db.supportTicket.count(),
      db.webhookEvent.count(),
    ]);
    const seeds = {
      customers: await db.user.count({ where: { id: { startsWith: "seed_customer_" } } }),
      orders: await db.order.count({ where: { id: { startsWith: "seed_order_" } } }),
      reports: await db.report.count({ where: { id: { startsWith: "seed_report_" } } }),
    };
    const seedRun = await db.auditLog.findFirst({ where: { action: "SEED_RUN" }, orderBy: { createdAt: "desc" } });

    console.log(`\n  ${text.bold("Rows")}`);
    console.log(`    users ${users} · customers ${customers} · orders ${orders} · reports ${reports} · requests ${requests}`);
    console.log(`    vin searches ${searches} · ledger ${ledger} · tickets ${tickets} · webhook events ${webhooks}`);
    console.log(
      `\n  ${text.dim("Seed data  ")} ${seedRun ? `${seeds.customers} seeded customers · ${seeds.orders} seeded orders · ${seeds.reports} seeded reports ${text.dim(`(last run ${seedRun.createdAt.toISOString()})`)}` : "none — run npm run db:seed"}`,
    );

    if (!target.local) {
      console.log(`\n  ${text.yellow("This is not a local database. npm run db:seed and npm run db:reset:local will refuse to run against it.")}\n`);
      return;
    }
    try {
      assertLocalDatabase("report status");
      console.log(`  ${text.dim("Guard      ")} destructive dev commands are restricted to loopback\n`);
    } catch (error) {
      console.log(`\n  ${text.red(error.message)}\n`);
    }
  } catch (error) {
    console.log(`  ${text.dim("Connection ")} ${text.red("failed")}`);
    console.log(`\n  ${error.message}\n`);
    console.log(`  ${text.dim("Is the database running? Start it with npm run dev:db, then rerun npm run db:status.")}\n`);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(`\n✖ ${error.message}\n`);
  process.exit(1);
});

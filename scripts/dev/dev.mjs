#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { startDatabase, waitForDatabase, isPortOpen } from "./db.mjs";
import { PROJECT_ROOT, assertLocalDatabase, ensureLocalEnvFile, loadEnvironment, describeDatabase, text } from "./load-env.mjs";

/**
 * npm run dev:db — one command for the whole local stack.
 *
 *   1. create .env.local with local defaults if none exists
 *   2. refuse to run against anything but loopback
 *   3. start embedded PostgreSQL (skip if already listening)
 *   4. wait for a real query to succeed
 *   5. apply Prisma migrations
 *   6. start Next.js on 0.0.0.0:3001 (skip if the port is already serving)
 */

const APP_PORT = 3001;
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function step(message) {
  console.log(`${text.bold("›")} ${message}`);
}

function ensurePrismaClient() {
  const client = path.join(PROJECT_ROOT, "node_modules", ".prisma", "client", "index.js");
  if (existsSync(client)) return;
  step("Generating Prisma Client (first run after an install)");
  const result = spawnSync(npx, ["prisma", "generate"], { cwd: PROJECT_ROOT, stdio: "inherit", env: process.env });
  if (result.status !== 0) throw new Error("prisma generate failed. Run `npm ci --ignore-scripts` then `npx prisma generate`.");
}

function migrate() {
  step("Applying database migrations");
  const result = spawnSync(npx, ["prisma", "migrate", "deploy"], { cwd: PROJECT_ROOT, stdio: "inherit", env: process.env });
  if (result.status !== 0) throw new Error("Migrations failed. The database was not modified beyond the failing migration; check the output above.");
}

async function main() {
  const created = ensureLocalEnvFile();
  loadEnvironment();
  if (created) console.log(`${text.green("✔")} Created ${created} with local development defaults`);

  let target;
  try {
    target = assertLocalDatabase("start the development stack");
  } catch (error) {
    console.error(`\n✖ ${error.message}\n`);
    process.exit(1);
  }

  console.log(`\n${text.bold("Vinify development stack")}`);
  console.log(`  ${text.dim("Database")} ${target.masked} ${text.green("(local)")}`);

  try {
    ensurePrismaClient();
    await startDatabase();
    await waitForDatabase();
    migrate();
  } catch (error) {
    console.error(`\n✖ ${error.message}\n`);
    console.error(`${text.dim("Troubleshooting: docs/DEVELOPMENT.md#troubleshooting")}\n`);
    process.exit(1);
  }

  if (await isPortOpen("127.0.0.1", APP_PORT)) {
    console.log(`\n${text.yellow("•")} Port ${APP_PORT} is already in use — Next.js appears to be running already.`);
    console.log(`  Open http://localhost:${APP_PORT} (sign in at /login).`);
    console.log(`  ${text.dim("Not starting a second server. Stop the existing one with Ctrl+C in its terminal, then rerun npm run dev:db.")}\n`);
    return;
  }

  console.log(`\n${text.green("✔")} Ready`);
  console.log(`  ${text.dim("App      ")} http://localhost:${APP_PORT}`);
  console.log(`  ${text.dim("Sign in  ")} http://localhost:${APP_PORT}/login ${text.dim("(staff land on /admin, customers on /account)")}`);
  console.log(`  ${text.dim("Database ")} ${describeDatabase().masked}`);
  console.log(`  ${text.dim("Seed data")} npm run db:seed ${text.dim("· status: npm run db:status · reset: npm run db:reset:local")}\n`);

  step("Starting Next.js on 0.0.0.0:3001");
  const child = spawn(npx, ["next", "dev", "-H", "0.0.0.0", "-p", String(APP_PORT)], {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: process.env,
  });
  child.on("error", (error) => {
    console.error(`\n✖ Could not start Next.js: ${error.message}\n`);
    process.exit(1);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  console.error(`\n✖ ${error.message}\n`);
  process.exit(1);
});

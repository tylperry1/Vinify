#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { startDatabase, waitForDatabase } from "./db.mjs";
import { PROJECT_ROOT, assertLocalDatabase, loadEnvironment, text } from "./load-env.mjs";

/**
 * npm run db:reset:local — wipe and rebuild ONLY the local development database.
 *
 * Guarded twice: the script refuses non-loopback DATABASE_URLs and NODE_ENV=production.
 * Production (Neon) is never reachable from here. Migrations are reapplied and the
 * fictional seed is loaded again unless --no-seed is passed.
 */

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

async function main() {
  loadEnvironment();
  let target;
  try {
    target = assertLocalDatabase("reset the local database");
  } catch (error) {
    console.error(`\n✖ ${error.message}\n`);
    process.exit(1);
  }

  console.log(`\n${text.yellow("⚠")} Resetting the ${text.bold("local development")} database at ${target.masked}`);
  console.log(`  ${text.dim("Every row in this local database is dropped and rebuilt. Production is not touched.")}\n`);

  await startDatabase();
  await waitForDatabase({ quiet: true });

  const migrate = spawnSync(npx, ["prisma", "migrate", "reset", "--force", "--skip-generate"], {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (migrate.status !== 0) {
    console.error(`\n✖ prisma migrate reset failed.\n`);
    process.exit(migrate.status ?? 1);
  }

  if (!process.argv.includes("--no-seed")) {
    console.log(`${text.bold("›")} Loading fictional test data`);
    const seeded = spawnSync(process.execPath, ["scripts/dev/seed.mjs"], { cwd: PROJECT_ROOT, stdio: "inherit", env: process.env });
    if (seeded.status !== 0) process.exit(seeded.status ?? 1);
  }

  console.log(`${text.green("✔")} Local database reset complete. Start the app with npm run dev:db\n`);
}

main().catch((error) => {
  console.error(`\n✖ ${error.message}\n`);
  process.exit(1);
});

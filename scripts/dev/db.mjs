import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { PROJECT_ROOT, databaseUrl, describeDatabase, ensureLocalEnvFile, loadEnvironment, SafetyError, assertLocalDatabase, text } from "./load-env.mjs";

/**
 * Local PostgreSQL lifecycle (embedded-postgres binaries, no root, no Docker).
 *
 * Data lives in .local-test/pgdata, which survives restarts of the workspace.
 * This module only ever starts/stops the database described by DATABASE_URL and
 * refuses anything that is not loopback.
 */

export const DATA_DIR = path.join(PROJECT_ROOT, ".local-test", "pgdata");
export const LOG_FILE = path.join(PROJECT_ROOT, ".local-test", "pg.log");

/** Locates the pg_ctl/initdb binaries inside the platform-specific package. */
export function postgresBinDir() {
  const scoped = path.join(PROJECT_ROOT, "node_modules", "@embedded-postgres");
  if (!existsSync(scoped)) return null;
  for (const entry of readdirSync(scoped)) {
    const bin = path.join(scoped, entry, "native", "bin");
    if (existsSync(path.join(bin, "pg_ctl"))) return bin;
  }
  return null;
}

export function databasePort() {
  const target = describeDatabase();
  return Number(target.port || 55432);
}

export function isPortOpen(host = "127.0.0.1", port = databasePort(), timeoutMs = 750) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

function run(bin, args, options = {}) {
  const result = spawnSync(bin, args, { cwd: PROJECT_ROOT, encoding: "utf8", ...options });
  if (result.status !== 0) {
    throw new Error(`${path.basename(bin)} ${args.join(" ")} failed:\n${(result.stderr || result.stdout || "").trim()}`);
  }
  return result.stdout ?? "";
}

export function isRunning() {
  return isPortOpen("127.0.0.1", databasePort());
}

/** Starts PostgreSQL if it is not already listening. Idempotent. */
export async function startDatabase({ quiet = false } = {}) {
  assertLocalDatabase("start the local database");
  const port = databasePort();
  if (await isRunning()) {
    if (!quiet) console.log(`${text.green("✔")} PostgreSQL already running on 127.0.0.1:${port}`);
    return { started: false, port };
  }
  const bin = postgresBinDir();
  if (!bin) {
    throw new SafetyError(
      "Local PostgreSQL binaries are missing.\n  Run: npm install --no-save embedded-postgres\n  Then: npm run dev:db",
    );
  }
  mkdirSync(path.join(PROJECT_ROOT, ".local-test"), { recursive: true });
  if (!existsSync(path.join(DATA_DIR, "base"))) {
    if (!quiet) console.log(`  initialising local database in .local-test/pgdata`);
    run(path.join(bin, "initdb"), ["-D", DATA_DIR, "-U", "postgres", "--auth=trust", "-E", "UTF8", "--locale=C"]);
  }
  const socketArgs = process.platform === "win32" ? [] : ["-k", "/tmp"];
  if (!quiet) console.log(`  starting PostgreSQL on 127.0.0.1:${port}`);
  run(path.join(bin, "pg_ctl"), [
    "-D",
    DATA_DIR,
    "-l",
    LOG_FILE,
    "-o",
    ["-p", String(port), ...socketArgs, "-c", "listen_addresses=127.0.0.1"].join(" "),
    "-w",
    "start",
  ]);
  if (!(await isRunning())) throw new Error(`PostgreSQL did not start. See .local-test/pg.log`);
  return { started: true, port };
}

/** Stops the local database if it is running. Leaves other processes alone. */
export async function stopDatabase() {
  assertLocalDatabase("stop the local database");
  const bin = postgresBinDir();
  if (!bin) throw new SafetyError("Local PostgreSQL binaries are missing. Run: npm install --no-save embedded-postgres");
  if (!(await isRunning())) {
    console.log(`${text.yellow("•")} PostgreSQL is not running (127.0.0.1:${databasePort()})`);
    return { stopped: false };
  }
  run(path.join(bin, "pg_ctl"), ["-D", DATA_DIR, "-m", "fast", "stop"]);
  console.log(`${text.green("✔")} PostgreSQL stopped`);
  return { stopped: true };
}

/** Waits until a real query succeeds, not just until the port opens. */
export async function waitForDatabase({ timeoutMs = 30_000, quiet = false } = {}) {
  assertLocalDatabase("verify the local database");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ log: [] });
  const deadline = Date.now() + timeoutMs;
  try {
    for (;;) {
      try {
        await db.$queryRawUnsafe("SELECT 1");
        if (!quiet) console.log(`${text.green("✔")} Database accepts queries (${describeDatabase().masked})`);
        return true;
      } catch (error) {
        if (Date.now() > deadline) {
          throw new Error(`Database did not accept queries within ${timeoutMs / 1000}s: ${error.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } finally {
    await db.$disconnect();
  }
}

// CLI: node scripts/dev/db.mjs [up|stop|status]
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] ?? "up";
  try {
    ensureLocalEnvFile();
    loadEnvironment();
    if (command === "up") {
      const { started, port } = await startDatabase();
      await waitForDatabase();
      console.log(`${started ? "Started" : "Using"} PostgreSQL at ${databaseUrl() ? describeDatabase().masked : `127.0.0.1:${port}`}`);
    } else if (command === "stop") {
      await stopDatabase();
    } else if (command === "status") {
      const target = describeDatabase();
      console.log(`Database : ${target.masked ?? "(not configured)"}`);
      console.log(`Running  : ${(await isRunning()) ? "yes" : "no"}`);
    } else {
      console.error(`Unknown command "${command}". Use up, stop or status.`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n✖ ${error.message}\n`);
    process.exit(1);
  }
}

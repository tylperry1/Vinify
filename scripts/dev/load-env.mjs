import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Shared environment handling for the local development scripts.
 *
 * Safety model: every destructive or mutating script calls assertLocalDatabase(),
 * which refuses to run unless DATABASE_URL points at loopback. The production
 * database lives on Neon, so it can never be reached by these tools.
 */

export const PROJECT_ROOT = path.resolve(import.meta.dirname, "../..");
export const LOCAL_DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/vinify?schema=public";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Loads .env.local (preferred) or .env into process.env. Never overrides existing variables. */
export function loadEnvironment() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(PROJECT_ROOT, file);
    if (!existsSync(full)) continue;
    process.loadEnvFile(full);
    return file;
  }
  return null;
}

/**
 * Creates .env.local with local-only defaults when no env file exists yet.
 * Never overwrites an existing file, so production values cannot be clobbered.
 */
export function ensureLocalEnvFile() {
  if (existsSync(path.join(PROJECT_ROOT, ".env.local")) || existsSync(path.join(PROJECT_ROOT, ".env"))) return null;
  const contents = [
    "# Created by npm run dev:db — local development only. Never use production values here.",
    "NEXT_PUBLIC_SITE_URL=http://localhost:3001",
    "VINIFY_INDEXABLE=false",
    "",
    "# Local embedded PostgreSQL started by `npm run dev:db`.",
    `DATABASE_URL=${LOCAL_DATABASE_URL}`,
    "",
    "# 32 random bytes, base64. Only used to encrypt provider secrets in the local database.",
    `API_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`,
    "",
    "# Commerce stays off in development. Test keys only, never live Stripe keys.",
    "COMMERCE_ENABLED=false",
    "STRIPE_LIVE_MODE=false",
    "",
  ].join("\n");
  writeFileSync(path.join(PROJECT_ROOT, ".env.local"), contents, { mode: 0o600 });
  return ".env.local";
}

export function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

/** Parsed, password-masked view of DATABASE_URL. */
export function describeDatabase(url = databaseUrl()) {
  if (!url) return { configured: false, local: false };
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^\[|\]$/g, "");
    const port = parsed.port || "5432";
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, "")) || "postgres";
    const local = LOCAL_HOSTS.has(host);
    return {
      configured: true,
      local,
      protocol: parsed.protocol.replace(/:$/, ""),
      host,
      port,
      database,
      masked: `${parsed.protocol}//${parsed.username || "user"}:***@${host}:${port}/${database}`,
    };
  } catch {
    return { configured: true, local: false, malformed: true };
  }
}

export class SafetyError extends Error {}

/** Throws unless the configured database is loopback Postgres and we are not in production. */
export function assertLocalDatabase(action) {
  if (process.env.NODE_ENV === "production") {
    throw new SafetyError(`Refusing to ${action} with NODE_ENV=production. Development scripts never run against production.`);
  }
  const target = describeDatabase();
  if (!target.configured) {
    throw new SafetyError(`DATABASE_URL is not set. Add a local connection string to .env.local, e.g.\n  DATABASE_URL=${LOCAL_DATABASE_URL}`);
  }
  if (target.malformed) {
    throw new SafetyError("DATABASE_URL is not a valid URL. Expected postgresql://user@127.0.0.1:55432/vinify");
  }
  if (!target.local) {
    throw new SafetyError(
      `Refusing to ${action}: DATABASE_URL points at "${target.host}:${target.port}/${target.database}", which is not local.\n` +
        "Development scripts only touch local PostgreSQL. Production (Neon) credentials belong to the deployment, never to these commands.",
    );
  }
  return target;
}

export function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

export const text = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
};

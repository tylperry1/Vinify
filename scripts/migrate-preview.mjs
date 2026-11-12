import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

if (process.env.VERCEL_ENV === "preview" && process.env.VINIFY_MIGRATE_PREVIEW === "true") {
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
  if (!databaseUrl) throw new Error("Preview migrations require DATABASE_URL_UNPOOLED from the isolated database");

  const require = createRequire(import.meta.url);
  const prisma = require.resolve("prisma/build/index.js");
  const result = spawnSync(process.execPath, [prisma, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

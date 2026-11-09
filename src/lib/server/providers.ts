import "server-only";
import { db } from "./db";
import { decryptSecret } from "../security";
import type { HistoryProvider } from "../providers/types";
// Add only reviewed, contract-specific adapters here. Never register the sample provider.
const licensedAdapters = new Map<string, (secret: string) => HistoryProvider>();
export async function historyProvider(): Promise<HistoryProvider | null> {
  const id = process.env.HISTORY_PROVIDER;
  const factory = id && licensedAdapters.get(id);
  if (!factory) return null;
  const config = await db.apiProvider.findUnique({ where: { id: "licensed-history" } });
  if (!config?.enabled) return null;
  const secret = config.encryptedSecret ? decryptSecret(config.encryptedSecret, config.id) : process.env.HISTORY_PROVIDER_API_KEY;
  if (!secret) return null;
  const adapter = factory(secret);
  return { id: adapter.id, displayName: adapter.displayName, coverage: adapter.coverage, costCents: config.costCents, fetchReport: adapter.fetchReport.bind(adapter) };
}
export async function monitored<T>(provider: string, operation: string, run: () => Promise<T>, costCents = 0) {
  const started = Date.now(); let success = false;
  try { const result = await run(); success = true; return result; }
  finally {
    if (process.env.DATABASE_URL) {
      await db.apiUsage.create({ data: {
        provider, operation, success, latencyMs: Date.now() - started, costCents: success ? costCents : 0,
      } }).catch(() => console.warn("Could not record provider usage"));
    }
  }
}

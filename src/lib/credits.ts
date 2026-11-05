/**
 * Pure credit-ledger logic (no I/O) so it can be unit tested and reused by the
 * database layer. Balance is always derived from ledger entries.
 */

export type LedgerReason =
  | "PURCHASE"
  | "SUBSCRIPTION_GRANT"
  | "RESERVE"
  | "RELEASE"
  | "CONSUME"
  | "EXPIRE"
  | "ADMIN_ADJUSTMENT"
  | "REFUND_REVERSAL";

export interface LedgerEntry {
  delta: number;
  reason: LedgerReason;
  idempotencyKey: string;
  reportRequestId?: string | null;
  createdAt: Date;
}

/**
 * Accounting model:
 *   RESERVE  = -1 (credit is held, unavailable)
 *   RELEASE  = +1 (held credit returned)
 *   CONSUME  =  0 (marks a reservation as final; the -1 from RESERVE stands)
 */
export function availableCredits(entries: LedgerEntry[]): number {
  return entries.reduce((sum, e) => sum + e.delta, 0);
}

export function openReservations(entries: LedgerEntry[]): string[] {
  const open = new Set<string>();
  for (const e of entries) {
    if (!e.reportRequestId) continue;
    if (e.reason === "RESERVE") open.add(e.reportRequestId);
    if (e.reason === "RELEASE" || e.reason === "CONSUME") open.delete(e.reportRequestId);
  }
  return [...open];
}

export class LedgerError extends Error {}

/** Returns the new entries to append, or throws. Idempotent on idempotencyKey. */
export function planReserve(entries: LedgerEntry[], reportRequestId: string, now = new Date()): LedgerEntry[] {
  const key = `reserve:${reportRequestId}`;
  if (entries.some((e) => e.idempotencyKey === key)) return [];
  if (availableCredits(entries) < 1) throw new LedgerError("No report credits available");
  return [{ delta: -1, reason: "RESERVE", idempotencyKey: key, reportRequestId, createdAt: now }];
}

export function planSettle(
  entries: LedgerEntry[],
  reportRequestId: string,
  outcome: "success" | "failure",
  now = new Date(),
): LedgerEntry[] {
  if (!openReservations(entries).includes(reportRequestId)) return []; // already settled or never reserved
  return outcome === "success"
    ? [{ delta: 0, reason: "CONSUME", idempotencyKey: `consume:${reportRequestId}`, reportRequestId, createdAt: now }]
    : [{ delta: 1, reason: "RELEASE", idempotencyKey: `release:${reportRequestId}`, reportRequestId, createdAt: now }];
}

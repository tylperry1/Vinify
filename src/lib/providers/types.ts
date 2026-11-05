/**
 * Vehicle history provider adapter contract (Roadmap Phase 2 / 5).
 *
 * Every report section carries an explicit coverage status so the UI never implies
 * data exists when the supplier didn't provide it. No supplier is contracted yet —
 * the only implementation today is the clearly labelled SampleProvider.
 */

export type SectionKey =
  | "title"
  | "brands"
  | "odometer"
  | "totalLoss"
  | "theft"
  | "accidents"
  | "ownership"
  | "auctions"
  | "sales"
  | "service"
  | "recalls"
  | "specs";

export type CoverageStatus =
  /** Supplier returned data for this section. */
  | "reported"
  /** Supplier searched and found no records. Not proof that nothing happened. */
  | "no_records"
  /** Supplier does not provide this section under Vinify's contract. */
  | "not_covered"
  /** Supplier errored or timed out for this section. */
  | "unavailable";

export interface HistoryEvent {
  date: string | null; // ISO date as reported by the source
  type: SectionKey;
  title: string;
  detail?: string;
  location?: string;
  odometer?: number | null;
  source: string; // e.g. "NMVTIS via <supplier>"
}

export interface ReportSection {
  key: SectionKey;
  status: CoverageStatus;
  label: string;
  summary: string;
  events: HistoryEvent[];
}

export interface NormalizedReport {
  vin: string;
  provider: string;
  providerReportId: string | null;
  /** When the supplier says the data was compiled. Distinct from Vinify generation time. */
  sourceAsOf: string | null;
  sections: ReportSection[];
  raw?: unknown;
}

export interface ProviderError extends Error {
  retryable: boolean;
  /** Whether the supplier still charges for this failed request (from contract). */
  billable: boolean;
}

export interface HistoryProvider {
  readonly id: string;
  readonly displayName: string;
  /** Sections this provider is contractually allowed and able to supply. */
  readonly coverage: Readonly<Record<SectionKey, boolean>>;
  /** Wholesale cost per report in cents, used for margin tracking. */
  readonly costCents: number;
  fetchReport(vin: string, opts: { idempotencyKey: string; signal?: AbortSignal }): Promise<NormalizedReport>;
}

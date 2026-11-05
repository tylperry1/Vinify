import type { HistoryProvider, NormalizedReport, SectionKey } from "./types";

/**
 * SAMPLE PROVIDER — illustrative, fictional history data for the public sample report
 * and local development. It is NOT a real supplier and must never be used to fulfil
 * a paid order. Coverage flags intentionally mirror a typical NMVTIS-based supplier:
 * title, brands, odometer, total-loss and theft are covered; service history is not.
 */

const COVERAGE: Record<SectionKey, boolean> = {
  title: true,
  brands: true,
  odometer: true,
  totalLoss: true,
  theft: true,
  accidents: true,
  ownership: true,
  auctions: true,
  sales: true,
  service: false,
  recalls: true,
  specs: true,
};

export const SAMPLE_VIN = "1HGCM82633A004352";

export function sampleReport(vin = SAMPLE_VIN): NormalizedReport {
  const src = "Sample data";
  return {
    vin,
    provider: "sample",
    providerReportId: "SAMPLE-0001",
    sourceAsOf: "2026-10-28",
    sections: [
      {
        key: "title",
        status: "reported",
        label: "Title history",
        summary: "3 title records across 2 states",
        events: [
          { date: "2003-04-17", type: "title", title: "First title issued", location: "Ohio", odometer: 12, source: src },
          { date: "2011-08-02", type: "title", title: "Title transferred", location: "Ohio", odometer: 96410, source: src },
          { date: "2019-05-21", type: "title", title: "Title issued — new state", location: "Indiana", odometer: 158230, source: src },
        ],
      },
      { key: "brands", status: "no_records", label: "Title brands (salvage, rebuilt, flood, lemon)", summary: "No brand records found", events: [] },
      {
        key: "odometer",
        status: "reported",
        label: "Odometer readings",
        summary: "5 readings · no rollback indicators in reported data",
        events: [
          { date: "2003-04-17", type: "odometer", title: "Odometer reading", odometer: 12, source: src },
          { date: "2007-03-11", type: "odometer", title: "Odometer reading", odometer: 61880, source: src },
          { date: "2011-08-02", type: "odometer", title: "Odometer reading", odometer: 96410, source: src },
          { date: "2016-09-30", type: "odometer", title: "Odometer reading", odometer: 139020, source: src },
          { date: "2019-05-21", type: "odometer", title: "Odometer reading", odometer: 158230, source: src },
        ],
      },
      { key: "totalLoss", status: "no_records", label: "Insurance total loss", summary: "No total-loss records found", events: [] },
      { key: "theft", status: "no_records", label: "Theft records", summary: "No theft records found", events: [] },
      {
        key: "accidents",
        status: "reported",
        label: "Accident & damage records",
        summary: "1 reported damage event",
        events: [
          { date: "2014-01-09", type: "accidents", title: "Damage reported — front", detail: "Minor; vehicle drivable", location: "Ohio", source: src },
        ],
      },
      { key: "ownership", status: "reported", label: "Ownership events", summary: "Approximately 3 ownership periods", events: [] },
      {
        key: "auctions",
        status: "reported",
        label: "Auction & sale listings",
        summary: "1 auction record",
        events: [
          { date: "2019-04-02", type: "auctions", title: "Offered at wholesale auction", location: "Indiana", odometer: 158100, source: src },
        ],
      },
      { key: "service", status: "not_covered", label: "Service & maintenance", summary: "Not included in this report", events: [] },
    ],
  };
}

export const sampleProvider: HistoryProvider = {
  id: "sample",
  displayName: "Sample (non-production)",
  coverage: COVERAGE,
  costCents: 0,
  async fetchReport(vin) {
    if (process.env.NODE_ENV === "production" && process.env.VINIFY_ALLOW_SAMPLE_PROVIDER !== "true") {
      throw new Error("Sample provider cannot fulfil orders in production");
    }
    return sampleReport(vin);
  },
};

/**
 * NHTSA public data integrations (free, no API key).
 *
 * - vPIC VIN decoding: https://vpic.nhtsa.dot.gov/api/
 *   Intended primarily for model years 1981+ and vehicles sold or imported into the US.
 * - Recalls API: https://api.nhtsa.gov/recalls/recallsByVehicle
 *   Results are by year / make / model. They are NOT VIN-specific and must never be
 *   presented as proof that a particular vehicle has (or lacks) an open recall.
 */

const VPIC_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";
const RECALLS_BASE = "https://api.nhtsa.gov/recalls/recallsByVehicle";

export interface DecodedVehicle {
  vin: string;
  year: string | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  series: string | null;
  bodyClass: string | null;
  vehicleType: string | null;
  doors: string | null;
  driveType: string | null;
  engine: {
    cylinders: string | null;
    displacementL: string | null;
    horsepower: string | null;
    fuelType: string | null;
    configuration: string | null;
    model: string | null;
  };
  transmission: { style: string | null; speeds: string | null };
  manufacturer: string | null;
  plant: { city: string | null; state: string | null; country: string | null };
  gvwr: string | null;
  /** NHTSA error code string; "0" means clean decode. */
  errorCode: string;
  errorText: string | null;
  /** True when NHTSA returned enough to identify the vehicle (year + make + model). */
  identified: boolean;
  source: "NHTSA vPIC";
  retrievedAt: string;
}

export interface RecallCampaign {
  campaignNumber: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  reportDate: string | null;
  parkIt: boolean;
  parkOutside: boolean;
}

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === "Not Applicable") return null;
  return s;
}

export function mapVpicResult(vin: string, r: Record<string, unknown>): DecodedVehicle {
  const year = clean(r.ModelYear);
  const make = clean(r.Make);
  const model = clean(r.Model);
  const errorCode = String(r.ErrorCode ?? "");
  return {
    vin,
    year,
    make,
    model,
    trim: clean(r.Trim),
    series: clean(r.Series),
    bodyClass: clean(r.BodyClass),
    vehicleType: clean(r.VehicleType),
    doors: clean(r.Doors),
    driveType: clean(r.DriveType),
    engine: {
      cylinders: clean(r.EngineCylinders),
      displacementL: (() => {
        const d = clean(r.DisplacementL);
        return d ? String(Math.round(Number(d) * 10) / 10) : null;
      })(),
      horsepower: clean(r.EngineHP),
      fuelType: clean(r.FuelTypePrimary),
      configuration: clean(r.EngineConfiguration),
      model: clean(r.EngineModel),
    },
    transmission: { style: clean(r.TransmissionStyle), speeds: clean(r.TransmissionSpeeds) },
    manufacturer: clean(r.Manufacturer),
    plant: { city: clean(r.PlantCity), state: clean(r.PlantState), country: clean(r.PlantCountry) },
    gvwr: clean(r.GVWR),
    errorCode,
    errorText: clean(r.ErrorText),
    identified: Boolean(year && make && model),
    source: "NHTSA vPIC",
    retrievedAt: new Date().toISOString(),
  };
}

export async function decodeVin(vin: string, init?: RequestInit): Promise<DecodedVehicle> {
  const url = `${VPIC_BASE}/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`;
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`NHTSA decoder responded with ${res.status}`);
  const json = (await res.json()) as { Results?: Record<string, unknown>[] };
  const row = json.Results?.[0];
  if (!row) throw new Error("NHTSA decoder returned no results");
  return mapVpicResult(vin, row);
}

export async function fetchModelRecalls(
  make: string,
  model: string,
  year: string,
  init?: RequestInit,
): Promise<RecallCampaign[]> {
  const qs = new URLSearchParams({ make, model, modelYear: year });
  const res = await fetch(`${RECALLS_BASE}?${qs}`, init);
  if (!res.ok) throw new Error(`NHTSA recalls responded with ${res.status}`);
  const json = (await res.json()) as { results?: Record<string, unknown>[] };
  if (!Array.isArray(json.results)) throw new Error("NHTSA recalls returned an invalid response");
  return json.results.map((r) => ({
    campaignNumber: String(r.NHTSACampaignNumber ?? ""),
    component: String(r.Component ?? ""),
    summary: String(r.Summary ?? ""),
    consequence: String(r.Consequence ?? ""),
    remedy: String(r.Remedy ?? ""),
    reportDate: r.ReportReceivedDate ? String(r.ReportReceivedDate) : null,
    parkIt: Boolean(r.parkIt),
    parkOutside: Boolean(r.parkOutSide),
  }));
}

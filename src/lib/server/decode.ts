import "server-only";
import { unstable_cache } from "next/cache";
import { decodeVin, fetchModelRecalls } from "../nhtsa";
import { db } from "./db";

/**
 * Decoding is cached for a day per VIN, so refreshing a preview or sharing a
 * link does not hammer NHTSA. The public API route stays uncached so live
 * searches always reflect current data.
 */
const cachedDecode = unstable_cache(
  async (vin: string) => decodeVin(vin, { signal: AbortSignal.timeout(10_000) }),
  ["vin-decode"],
  { revalidate: 86_400, tags: ["vin-decode"] },
);

const cachedRecalls = unstable_cache(
  async (make: string, model: string, year: string) =>
    fetchModelRecalls(make, model, year, { signal: AbortSignal.timeout(10_000) }),
  ["vin-recalls"],
  { revalidate: 86_400, tags: ["vin-recalls"] },
);

export function decodeVehicle(vin: string) {
  return cachedDecode(vin);
}

export function modelRecalls(make: string, model: string, year: string) {
  return cachedRecalls(make, model, year);
}

/** Record one search per signed-in customer per VIN per day. */
export async function recordSearch(userId: string, vehicle: { vin: string; year: string | null; make: string | null; model: string | null }) {
  const since = new Date(Date.now() - 86_400_000);
  const recent = await db.vinSearch.findFirst({
    where: { userId, vin: vehicle.vin, createdAt: { gte: since } },
    select: { id: true },
  });
  if (recent) return;
  await db.vinSearch.create({
    data: { userId, vin: vehicle.vin, year: vehicle.year, make: vehicle.make, model: vehicle.model },
  });
}

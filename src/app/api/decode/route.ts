import { decodeVin } from "@/lib/nhtsa";
import { validateVin } from "@/lib/vin";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { nhtsaAccessError } from "@/lib/server/nhtsa-access";
import { monitored } from "@/lib/server/providers";
export async function GET(request: Request) {
  const vin = validateVin(new URL(request.url).searchParams.get("vin") ?? "");
  if (!vin.wellFormed) return Response.json({ error: "Enter a valid 17-character VIN" }, { status: 400 });
  try {
    const accessError = await nhtsaAccessError(request, "decode");
    if (accessError) return accessError;
    const vehicle = await monitored("nhtsa", "decode", () => decodeVin(vin.vin, { signal: AbortSignal.timeout(10000), cache: "no-store" }));
    if (process.env.DATABASE_URL) {
      try {
        const user = await currentUser();
        await db.vinSearch.create({ data: { vin: vin.vin, userId: user?.id, year: vehicle.year, make: vehicle.make, model: vehicle.model } });
      } catch {
        console.warn("Could not record VIN search");
      }
    }
    return Response.json(vehicle, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Decoder unavailable. Please try again later." }, { status: 503 }); }
}

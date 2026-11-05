import { decodeVin } from "@/lib/nhtsa";
import { validateVin } from "@/lib/vin";
import { db } from "@/lib/server/db";
import { currentUser, rateLimit } from "@/lib/server/auth";
import { monitored } from "@/lib/server/providers";
export async function GET(request: Request) {
  const vin = validateVin(new URL(request.url).searchParams.get("vin") ?? "");
  if (!vin.wellFormed) return Response.json({ error: "Enter a valid 17-character VIN" }, { status: 400 });
  try {
    if (process.env.DATABASE_URL) {
      const config = await db.apiProvider.findUnique({ where: { id: "nhtsa" } });
      if (config && !config.enabled) return Response.json({ error: "Decoder temporarily disabled" }, { status: 503 });
      // Vercel sets x-forwarded-for at its trusted ingress. Do not use this behind an untrusted proxy.
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
      if (!await rateLimit(`decode:${ip}`, 30, 60000)) return Response.json({ error: "Please try again in a minute" }, { status: 429 });
    }
    const vehicle = await monitored("nhtsa", "decode", () => decodeVin(vin.vin, { signal: AbortSignal.timeout(10000), cache: "no-store" }));
    if (process.env.DATABASE_URL) {
      const user = await currentUser();
      await db.vinSearch.create({ data: { vin: vin.vin, userId: user?.id, year: vehicle.year, make: vehicle.make, model: vehicle.model } });
    }
    return Response.json(vehicle, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Decoder unavailable. Please try again later." }, { status: 503 }); }
}

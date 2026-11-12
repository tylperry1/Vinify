import { fetchModelRecalls } from "@/lib/nhtsa";
import { nhtsaAccessError } from "@/lib/server/nhtsa-access";
import { monitored } from "@/lib/server/providers";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const make = params.get("make")?.trim();
  const model = params.get("model")?.trim();
  const year = params.get("year")?.trim();
  if (!make || make.length > 120 || !model || model.length > 120 || !year || !/^(19|20)\d{2}$/.test(year)) {
    return Response.json({ error: "Enter a valid model year, make and model" }, { status: 400 });
  }

  try {
    const accessError = await nhtsaAccessError(request, "recalls");
    if (accessError) return accessError;
    const campaigns = await monitored("nhtsa", "recalls", () =>
      fetchModelRecalls(make, model, year, { signal: AbortSignal.timeout(8000), cache: "no-store" }),
    );
    return Response.json(campaigns, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Recall data is temporarily unavailable" }, { status: 503 });
  }
}

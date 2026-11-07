import { currentUser, rateLimit } from "@/lib/server/auth";
import { sameOrigin, readJson } from "@/lib/server/http";
import { generateReport } from "@/lib/server/reports";
import { validateVin } from "@/lib/vin";
import { db } from "@/lib/server/db";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  let body; try { body = await readJson(request); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const vin = validateVin(String(body.vin ?? "")), key = request.headers.get("idempotency-key") ?? "";
  if (!vin.wellFormed || !/^[a-zA-Z0-9-]{16,100}$/.test(key)) return Response.json({ error: "Invalid VIN or idempotency key" }, { status: 400 });
  if (!await rateLimit(`report:${user.id}`, 10, 60000)) return Response.json({ error: "Too many requests" }, { status: 429 });
  try { const result = await generateReport(user.id, vin.vin, key); return Response.json(result, { status: result.status }); }
  catch { return Response.json({ error: "Report could not be requested. Check credits or retry with the same key." }, { status: 409 }); }
}
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  const reports = await db.report.findMany({ where: { userId: user.id }, select: { publicId: true, vin: true, generatedAt: true, provider: true }, orderBy: { generatedAt: "desc" }, take: 100 });
  return Response.json(reports, { headers: { "Cache-Control": "no-store" } });
}

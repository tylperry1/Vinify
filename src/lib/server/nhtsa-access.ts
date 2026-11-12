import "server-only";
import { rateLimit } from "./auth";
import { db } from "./db";

export async function nhtsaAccessError(request: Request, operation: "decode" | "recalls") {
  if (!process.env.DATABASE_URL) return null;

  const config = await db.apiProvider.findUnique({ where: { id: "nhtsa" } });
  if (config && !config.enabled) {
    return Response.json({ error: "NHTSA lookup temporarily disabled" }, { status: 503 });
  }

  // Only trust this header behind ingress that replaces client-supplied values.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!await rateLimit(`${operation}:${ip}`, 30, 60000)) {
    return Response.json({ error: "Please try again in a minute" }, { status: 429 });
  }
  return null;
}

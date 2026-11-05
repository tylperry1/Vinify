import { db } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/auth";
import { sameOrigin, readJson } from "@/lib/server/http";
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return Response.json({ error: "Support ticketing is not configured yet. Please try later." }, { status: 503 });
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  let body; try { body = await readJson(request); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const email = String(body.email ?? "").trim().toLowerCase(), message = String(body.message ?? "").trim();
  const category = String(body.topic ?? "general");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10 || message.length > 5000 || !["general", "report", "billing", "dealer", "privacy"].includes(category)) return Response.json({ error: "Enter a valid email and a message of 10–5000 characters" }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!await rateLimit(`support:${ip}`, 5, 3600000)) return Response.json({ error: "Please try again later" }, { status: 429 });
  await db.supportTicket.create({ data: { email, category, subject: `${category} inquiry`, body: message } });
  return Response.json({ received: true }, { status: 201 });
}

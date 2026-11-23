"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { createSession, rateLimit } from "@/lib/server/auth";
import { hashPassword } from "@/lib/security";
import { checkPassword, normalizeEmail, normalizeName, VERIFY_TTL_MS } from "@/lib/account";
import { issueToken } from "@/lib/server/tokens";
import { sendEmail, siteUrl, verificationEmail } from "@/lib/server/email";

export async function register(form: FormData) {
  if (!process.env.DATABASE_URL) redirect("/register?error=setup");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!await rateLimit(`register-ip:${ip}`, 10, 3600000)) redirect("/register?error=limited");

  const email = normalizeEmail(form.get("email"));
  if (!email) redirect("/register?error=email");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const problem = checkPassword(password, confirm, email);
  if (problem) redirect(`/register?error=${problem}&email=${encodeURIComponent(email)}`);
  if (form.get("terms") !== "on") redirect(`/register?error=terms&email=${encodeURIComponent(email)}`);
  if (!await rateLimit(`register:${email}`, 3, 3600000)) redirect("/register?error=limited");

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) redirect(`/register?error=taken&email=${encodeURIComponent(email)}`);

  const user = await db.user.create({
    data: {
      email,
      name: normalizeName(form.get("name")),
      passwordHash: hashPassword(password),
      role: "CUSTOMER",
      marketingOptIn: form.get("marketing") === "on",
    },
    select: { id: true, email: true },
  });
  await db.auditLog.create({ data: { actorId: user.id, action: "CUSTOMER_REGISTERED", target: user.id } });

  const token = await issueToken(`verify:${user.id}`, VERIFY_TTL_MS);
  const sent = await sendEmail({ to: user.email, ...verificationEmail(siteUrl(`/verify-email?token=${token}`)) });
  await db.auditLog.create({
    data: { actorId: user.id, action: "VERIFICATION_EMAIL_SENT", target: user.id, meta: { delivered: sent.delivered, provider: sent.provider } },
  });

  await createSession(user.id);
  redirect(`/account?welcome=1&verify=${sent.delivered ? "sent" : "pending"}`);
}

"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/server/db";
import { cookieName, rateLimit } from "@/lib/server/auth";
import { digest, verifyPassword } from "@/lib/security";
export async function customerLogin(form: FormData) {
  if (!process.env.DATABASE_URL) redirect("/account/login?error=setup");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!await rateLimit(`login-ip:${ip}`, 20, 900000)) redirect("/account/login?error=credentials");
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  if (!await rateLimit(`login:${email}`, 5, 900000)) redirect("/account/login?error=credentials");
  const user = await db.user.findUnique({ where: { email } });
  const valid = verifyPassword(String(form.get("password") ?? ""), user?.passwordHash ?? "00000000000000000000000000000000:" + "00".repeat(64));
  if (!user || !valid || user.deletedAt) {
    await db.auditLog.create({ data: { action: "LOGIN_FAILED" } });
    redirect("/account/login?error=credentials");
  }
  const token = randomBytes(32).toString("hex"), expires = new Date(Date.now() + 8 * 3600000);
  await db.$transaction([
    db.session.create({ data: { userId: user.id, sessionToken: digest(token), expires } }),
    db.auditLog.create({ data: { actorId: user.id, action: "CUSTOMER_LOGIN" } }),
  ]);
  (await cookies()).set(cookieName, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires });
  redirect("/account");
}

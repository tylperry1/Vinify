"use server";
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { cookieName, rateLimit } from "@/lib/server/auth";
import { digest, isAdmin, verifyPassword } from "@/lib/security";
export async function login(form: FormData) {
  if (!process.env.DATABASE_URL) redirect("/admin/login?error=setup");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!await rateLimit(`login-ip:${ip}`, 20, 900000)) redirect("/admin/login?error=credentials");
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(form.get("password") ?? "");
  if (!await rateLimit(`login:${email}`, 5, 15 * 60_000)) redirect("/admin/login?error=credentials");
  const user = await db.user.findUnique({ where: { email } });
  const valid = verifyPassword(password, user?.passwordHash ?? "00000000000000000000000000000000:" + "00".repeat(64));
  if (!user || !valid || !isAdmin(user.role) || user.deletedAt) {
    await db.auditLog.create({ data: { action: "LOGIN_FAILED" } });
    redirect("/admin/login?error=credentials");
  }
  const token = randomBytes(32).toString("hex"), expires = new Date(Date.now() + 8 * 3600_000);
  await db.$transaction([
    db.session.create({ data: { userId: user.id, sessionToken: digest(token), expires } }),
    db.auditLog.create({ data: { actorId: user.id, action: "LOGIN" } }),
  ]);
  (await cookies()).set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires });
  redirect("/admin");
}
export async function logout() {
  const jar = await cookies(), token = jar.get(cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { sessionToken: digest(token) } });
  jar.delete(cookieName); redirect("/admin/login");
}

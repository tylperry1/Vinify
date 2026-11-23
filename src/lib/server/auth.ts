import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { digest, isAdmin } from "../security";
export const cookieName = process.env.NODE_ENV === "production" ? "__Host-vinify" : "vinify";
export async function currentUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !process.env.DATABASE_URL) return null;
  const session = await db.session.findUnique({ where: { sessionToken: digest(token) }, include: { user: true } });
  if (!session || session.expires <= new Date() || session.user.deletedAt) return null;
  return session.user;
}
export async function requireAdmin(superOnly = false) {
  const user = await currentUser();
  if (!user || !isAdmin(user.role)) redirect("/login");
  if (superOnly && user.role !== "SUPER_ADMIN") throw new Error("Super Admin access required");
  return user;
}
/** Any signed-in, non-deleted account (customers and staff both have profiles). */
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  return user;
}
/**
 * Create a session row and set the signed cookie. Shared by sign-in and
 * registration so cookie policy can never drift between the two.
 */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex"), expires = new Date(Date.now() + 8 * 3600_000);
  await db.session.create({ data: { userId, sessionToken: digest(token), expires } });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}
export async function rateLimit(key: string, max: number, windowMs: number) {
  const bucket = Math.floor(Date.now() / windowMs), id = digest(`${key}:${bucket}`);
  const row = await db.rateLimit.upsert({ where: { key: id },
    create: { key: id, expiresAt: new Date((bucket + 1) * windowMs) }, update: { count: { increment: 1 } } });
  return row.count <= max;
}

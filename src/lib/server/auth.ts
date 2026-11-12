import "server-only";
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
  if (!user) redirect("/account/login");
  if (!isAdmin(user.role)) redirect("/account");
  if (superOnly && user.role !== "SUPER_ADMIN") throw new Error("Super Admin access required");
  return user;
}
export async function rateLimit(key: string, max: number, windowMs: number) {
  const bucket = Math.floor(Date.now() / windowMs), id = digest(`${key}:${bucket}`);
  const row = await db.rateLimit.upsert({ where: { key: id },
    create: { key: id, expiresAt: new Date((bucket + 1) * windowMs) }, update: { count: { increment: 1 } } });
  return row.count <= max;
}

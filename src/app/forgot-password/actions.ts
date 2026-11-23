"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/auth";
import { normalizeEmail, RESET_TTL_MS } from "@/lib/account";
import { issueToken } from "@/lib/server/tokens";
import { emailDeliverable, resetEmail, sendEmail, siteUrl } from "@/lib/server/email";

export async function requestPasswordReset(form: FormData) {
  if (!process.env.DATABASE_URL) redirect("/forgot-password?status=unavailable");
  // Without a mail provider in production nothing can be delivered, so say so
  // instead of showing "reset instructions are on the way".
  if (!emailDeliverable()) redirect("/forgot-password?status=unavailable");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!await rateLimit(`reset-ip:${ip}`, 10, 3600000)) redirect("/forgot-password?status=limited");
  const email = normalizeEmail(form.get("email"));
  if (!email) redirect("/forgot-password?status=sent");
  if (!await rateLimit(`reset:${email}`, 3, 3600000)) redirect("/forgot-password?status=sent");

  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, deletedAt: true, passwordHash: true } });
  // Always report the same outcome: never disclose whether an account exists.
  if (user && !user.deletedAt && user.passwordHash) {
    const token = await issueToken(`reset:${user.id}`, RESET_TTL_MS);
    const sent = await sendEmail({ to: user.email, ...resetEmail(siteUrl(`/reset-password?token=${token}`)) });
    await db.auditLog.create({
      data: { actorId: user.id, action: "PASSWORD_RESET_REQUESTED", target: user.id, meta: { delivered: sent.delivered, provider: sent.provider } },
    });
  }
  redirect("/forgot-password?status=sent");
}

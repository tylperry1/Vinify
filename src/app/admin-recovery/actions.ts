"use server";
import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { createSession, rateLimit } from "@/lib/server/auth";
import { hashPassword } from "@/lib/security";
import { checkPassword, normalizeEmail } from "@/lib/account";
import { ADMIN_RECOVERY_ACTION } from "@/lib/admin-recovery";

/**
 * One-time owner access recovery for a deployment with no shell access.
 *
 * Inert without ADMIN_RECOVERY_TOKEN. Sets a password on an existing staff
 * account (never creates one, never changes an email address), records a single
 * ADMIN_RECOVERY audit row that locks the page, and signs the owner in.
 */
export async function recoverAccess(form: FormData) {
  if (!process.env.ADMIN_RECOVERY_TOKEN) redirect("/admin-recovery?error=unavailable");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!await rateLimit(`admin-recovery:${ip}`, 10, 900000)) redirect("/admin-recovery?error=limited");

  if (!tokenMatches(String(form.get("token") ?? ""))) {
    await db.auditLog.create({ data: { action: "ADMIN_RECOVERY_REJECTED", ip } });
    redirect("/admin-recovery?error=token");
  }
  if (await db.auditLog.findFirst({ where: { action: ADMIN_RECOVERY_ACTION }, select: { id: true } })) {
    redirect("/admin-recovery?error=used");
  }

  const restoreId = String(form.get("accountId") ?? "");
  const email = normalizeEmail(form.get("email"));
  const password = String(form.get("password") ?? "");
  const policy = checkPassword(password, String(form.get("confirm") ?? ""), email ?? restoreId);
  if (policy) redirect(`/admin-recovery?error=${policy}`);

  let targetId: string;
  try {
    targetId = await db.$transaction(async tx => {
      if (await tx.auditLog.findFirst({ where: { action: ADMIN_RECOVERY_ACTION }, select: { id: true } })) throw new Error("used");
      const target = restoreId
        ? await tx.user.findUnique({ where: { id: restoreId }, select: { id: true, role: true } })
        : email
          ? await tx.user.findUnique({ where: { email }, select: { id: true, role: true } })
          : null;
      if (!target) throw new Error("missing");
      if (target.role !== "ADMIN" && target.role !== "SUPER_ADMIN") throw new Error("notstaff");
      await tx.user.update({
        where: { id: target.id },
        data: { passwordHash: hashPassword(password), emailVerified: new Date() },
      });
      await tx.auditLog.create({
        data: { actorId: target.id, action: ADMIN_RECOVERY_ACTION, target: target.id, ip, meta: { mode: restoreId ? "restore" : "email" } },
      });
      return target.id;
    });
  } catch (error) {
    const known = ["used", "missing", "notstaff"];
    const reason = error instanceof Error && known.includes(error.message) ? error.message : null;
    if (reason) redirect(`/admin-recovery?error=${reason}`);
    await db.auditLog.create({ data: { action: "ADMIN_RECOVERY_FAILED", ip } });
    redirect("/admin-recovery?error=failed");
  }

  await createSession(targetId);
  redirect("/admin/account?status=recovered");
}

function tokenMatches(supplied: string) {
  const expected = Buffer.from(process.env.ADMIN_RECOVERY_TOKEN ?? "");
  const given = Buffer.from(supplied);
  return expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
}

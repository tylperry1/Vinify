"use server";
import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { createSession, rateLimit } from "@/lib/server/auth";
import { hashPassword } from "@/lib/security";
import { checkPassword, normalizeEmail } from "@/lib/account";
import { ADMIN_SETUP_ACTION } from "@/lib/admin-setup";

/**
 * One-time SUPER_ADMIN provisioning for a deployment with no shell access.
 *
 * It is inert unless ADMIN_SETUP_TOKEN is set in the runtime environment, it
 * refuses to run twice (an ADMIN_SETUP audit row is the lock), and it never
 * writes the password anywhere. "create" never touches an existing account;
 * "reset" is the explicit opt-in that changes only the password, role and
 * verification state of the account already owning that email address.
 */
export async function provisionSuperAdmin(form: FormData) {
  if (!process.env.ADMIN_SETUP_TOKEN) redirect("/admin-setup?error=unavailable");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!await rateLimit(`admin-setup:${ip}`, 10, 900000)) redirect("/admin-setup?error=limited");

  const supplied = String(form.get("token") ?? "");
  if (!tokenMatches(supplied)) {
    await db.auditLog.create({ data: { action: "ADMIN_SETUP_REJECTED", ip } });
    redirect("/admin-setup?error=token");
  }
  if (await setupAlreadyUsed()) redirect("/admin-setup?error=used");

  const mode = String(form.get("mode") ?? "create") === "reset" ? "reset" : "create";
  const email = normalizeEmail(form.get("email"));
  if (!email) redirect("/admin-setup?error=email");
  const password = String(form.get("password") ?? "");
  const policy = checkPassword(password, String(form.get("confirm") ?? ""), email);
  if (policy) redirect(`/admin-setup?error=${policy}`);

  let createdId: string;
  try {
    createdId = await db.$transaction(async tx => {
      // Re-check inside the transaction so two concurrent submissions can't both win.
      if (await tx.auditLog.findFirst({ where: { action: ADMIN_SETUP_ACTION }, select: { id: true } })) throw new Error("used");
      const existing = await tx.user.findUnique({ where: { email }, select: { id: true, role: true } });
      if (mode === "create") {
        if (existing) throw new Error("exists");
        const created = await tx.user.create({
          data: { email, role: "SUPER_ADMIN", emailVerified: new Date(), passwordHash: hashPassword(password) },
          select: { id: true },
        });
        await tx.auditLog.create({ data: { actorId: created.id, action: ADMIN_SETUP_ACTION, target: created.id, ip, meta: { mode } } });
        return created.id;
      }
      // Reset mode: the account already belongs to this email, so only the
      // password, role and verification state change. Email and all other
      // account data are left exactly as they were.
      if (!existing) throw new Error("missing");
      await tx.user.update({
        where: { id: existing.id },
        data: { passwordHash: hashPassword(password), role: "SUPER_ADMIN", emailVerified: new Date() },
      });
      await tx.auditLog.create({
        data: { actorId: existing.id, action: ADMIN_SETUP_ACTION, target: existing.id, ip, meta: { mode, wasRole: existing.role } },
      });
      return existing.id;
    });
  } catch (error) {
    const reason = error instanceof Error && ["used", "exists", "missing"].includes(error.message) ? error.message : null;
    if (reason) redirect(`/admin-setup?error=${reason}`);
    await db.auditLog.create({ data: { action: "ADMIN_SETUP_FAILED", ip } });
    redirect("/admin-setup?error=failed");
  }

  await createSession(createdId);
  redirect("/admin");
}

function tokenMatches(supplied: string) {
  const expected = Buffer.from(process.env.ADMIN_SETUP_TOKEN ?? "");
  const given = Buffer.from(supplied);
  return expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
}

async function setupAlreadyUsed() {
  const row = await db.auditLog.findFirst({ where: { action: ADMIN_SETUP_ACTION }, select: { id: true } });
  return Boolean(row);
}

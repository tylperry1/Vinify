"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { cookieName, rateLimit, requireAdmin } from "@/lib/server/auth";
import { digest, hashPassword, verifyPassword } from "@/lib/security";
import { checkNewPassword } from "@/lib/password-policy";

/**
 * Password and email are deliberately separate submissions. The single form
 * this replaces rewrote the account email as a side effect of a password
 * change, so an autofilled or mistyped email silently moved the sign-in
 * address and locked the owner out of their own account.
 */
export async function changePassword(form: FormData) {
  const user = await requireAdmin();
  const back = (status: string) => redirect(`/admin/account?status=${status}`);
  if (!await rateLimit(`credentials:${user.id}`, 10, 15 * 60_000)) back("limited");
  const current = String(form.get("current") ?? "");
  if (!user.passwordHash || !verifyPassword(current, user.passwordHash)) {
    await db.auditLog.create({ data: { actorId: user.id, action: "CREDENTIALS_CHANGE_FAILED", target: user.id, meta: { field: "password" } } });
    back("current");
  }
  const next = String(form.get("next") ?? ""), confirm = String(form.get("confirm") ?? "");
  const problem = checkNewPassword(current, next, confirm, user.email);
  if (problem) back(problem);
  const token = (await cookies()).get(cookieName)?.value ?? "";
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } }),
    // Keep this session and revoke every other one. Without the current token
    // there is nothing to keep, so revoke nothing rather than sign the person
    // out of the session they are changing the password from.
    ...(token ? [db.session.deleteMany({ where: { userId: user.id, NOT: { sessionToken: digest(token) } } })] : []),
    db.auditLog.create({ data: { actorId: user.id, action: "CREDENTIALS_UPDATED", target: user.id, meta: { passwordChanged: true } } }),
  ]);
  // Read the row back: only report a save that the database actually holds.
  const saved = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!saved?.passwordHash || !verifyPassword(next, saved.passwordHash)) back("unsaved");
  back("done");
}

export async function changeEmail(form: FormData) {
  const user = await requireAdmin();
  const back = (status: string) => redirect(`/admin/account?status=${status}`);
  if (!await rateLimit(`email-change:${user.id}`, 5, 15 * 60_000)) back("limited");
  const current = String(form.get("current") ?? "");
  if (!user.passwordHash || !verifyPassword(current, user.passwordHash)) {
    await db.auditLog.create({ data: { actorId: user.id, action: "CREDENTIALS_CHANGE_FAILED", target: user.id, meta: { field: "email" } } });
    back("current");
  }
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("email");
  if (email === user.email) back("unchanged");
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) back("taken");
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { email } }),
    db.auditLog.create({ data: { actorId: user.id, action: "CREDENTIALS_UPDATED", target: user.id, meta: { emailChanged: true, from: user.email, to: email } } }),
  ]);
  back("email-done");
}

"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { cookieName, rateLimit, requireAdmin } from "@/lib/server/auth";
import { digest, hashPassword, verifyPassword } from "@/lib/security";
import { checkNewPassword } from "@/lib/password-policy";
export async function updateCredentials(form: FormData) {
  const user = await requireAdmin();
  const back = (status: string) => redirect(`/admin/account?status=${status}`);
  if (!await rateLimit(`credentials:${user.id}`, 5, 15 * 60_000)) back("limited");
  const current = String(form.get("current") ?? "");
  if (!user.passwordHash || !verifyPassword(current, user.passwordHash)) {
    await db.auditLog.create({ data: { actorId: user.id, action: "CREDENTIALS_CHANGE_FAILED", target: user.id } });
    back("current");
  }
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = String(form.get("next") ?? ""), confirm = String(form.get("confirm") ?? "");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("email");
  // A blank new password keeps the current one.
  if (next) { const problem = checkNewPassword(current, next, confirm, email); if (problem) back(problem); }
  const emailChanged = email !== user.email;
  if (!emailChanged && !next) back("unchanged");
  if (emailChanged && await db.user.findUnique({ where: { email } })) back("taken");
  const token = (await cookies()).get(cookieName)?.value ?? "";
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { email, ...(next ? { passwordHash: hashPassword(next) } : {}) } }),
    // Keep this session; revoke every other session for the account.
    db.session.deleteMany({ where: { userId: user.id, NOT: { sessionToken: digest(token) } } }),
    db.auditLog.create({ data: { actorId: user.id, action: "CREDENTIALS_UPDATED", target: user.id, meta: { emailChanged, passwordChanged: Boolean(next) } } }),
  ]);
  back("done");
}

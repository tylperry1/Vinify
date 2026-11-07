"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { cookieName, rateLimit, requireAdmin } from "@/lib/server/auth";
import { digest, hashPassword, verifyPassword } from "@/lib/security";
import { checkNewPassword } from "@/lib/password-policy";
export async function changePassword(form: FormData) {
  const user = await requireAdmin();
  const back = (status: string) => redirect(`/admin/account?status=${status}`);
  if (!await rateLimit(`password-change:${user.id}`, 5, 15 * 60_000)) back("limited");
  const current = String(form.get("current") ?? ""), next = String(form.get("next") ?? ""), confirm = String(form.get("confirm") ?? "");
  if (!user.passwordHash || !verifyPassword(current, user.passwordHash)) {
    await db.auditLog.create({ data: { actorId: user.id, action: "PASSWORD_CHANGE_FAILED", target: user.id } });
    back("current");
  }
  const problem = checkNewPassword(current, next, confirm, user.email);
  if (problem) back(problem);
  const token = (await cookies()).get(cookieName)?.value ?? "";
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } }),
    // Keep this session; revoke every other session for the account.
    db.session.deleteMany({ where: { userId: user.id, NOT: { sessionToken: digest(token) } } }),
    db.auditLog.create({ data: { actorId: user.id, action: "PASSWORD_CHANGED", target: user.id } }),
  ]);
  back("done");
}

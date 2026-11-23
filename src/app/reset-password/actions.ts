"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/auth";
import { hashPassword } from "@/lib/security";
import { checkPassword } from "@/lib/account";
import { resolveToken } from "@/lib/server/tokens";

export async function resetPassword(form: FormData) {
  const token = String(form.get("token") ?? "");
  const resolved = await resolveToken("reset:", token);
  if (!resolved) redirect("/reset-password?status=invalid");
  const user = await db.user.findUnique({
    where: { id: resolved.userId },
    select: { id: true, email: true, deletedAt: true },
  });
  if (!user || user.deletedAt) redirect("/reset-password?status=invalid");
  if (!await rateLimit(`reset-submit:${user.id}`, 5, 900000)) redirect(`/reset-password?token=${token}&error=limited`);

  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const problem = checkPassword(password, confirm, user.email);
  if (problem) redirect(`/reset-password?token=${token}&error=${problem}`);

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(password) } }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.verificationToken.deleteMany({ where: { token: resolved.stored } }),
    db.auditLog.create({ data: { actorId: user.id, action: "PASSWORD_RESET", target: user.id } }),
  ]);
  redirect("/login?status=reset");
}

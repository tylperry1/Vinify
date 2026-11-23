"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { cookieName, rateLimit, requireUser } from "@/lib/server/auth";
import { digest, hashPassword, verifyPassword } from "@/lib/security";
import { checkNewPassword } from "@/lib/password-policy";
import { normalizeName } from "@/lib/account";

export async function updateProfile(form: FormData) {
  const user = await requireUser();
  const name = normalizeName(form.get("name"));
  const marketingOptIn = form.get("marketingOptIn") === "on";
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { name, marketingOptIn } }),
    db.auditLog.create({ data: { actorId: user.id, action: "PROFILE_UPDATED", target: user.id, meta: { marketingOptIn } } }),
  ]);
  redirect("/account/profile?status=profile");
}

export async function changePassword(form: FormData) {
  const user = await requireUser();
  if (!await rateLimit(`password:${user.id}`, 5, 900000)) redirect("/account/profile?status=limited");
  const current = String(form.get("current") ?? "");
  if (!user.passwordHash || !verifyPassword(current, user.passwordHash)) {
    await db.auditLog.create({ data: { actorId: user.id, action: "PASSWORD_CHANGE_FAILED", target: user.id } });
    redirect("/account/profile?status=current");
  }
  const next = String(form.get("next") ?? ""), confirm = String(form.get("confirm") ?? "");
  const problem = checkNewPassword(current, next, confirm, user.email);
  if (problem) redirect(`/account/profile?status=${problem}`);

  const token = (await cookies()).get(cookieName)?.value ?? "";
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } }),
    // Keep this session and revoke every other one. Without the current token
    // there is nothing to keep, so revoke nothing rather than sign the person
    // out of the session they are changing the password from.
    ...(token ? [db.session.deleteMany({ where: { userId: user.id, NOT: { sessionToken: digest(token) } } })] : []),
    db.auditLog.create({ data: { actorId: user.id, action: "PASSWORD_CHANGED", target: user.id } }),
  ]);
  // Read the row back: only report a save that the database actually holds.
  const saved = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!saved?.passwordHash || !verifyPassword(next, saved.passwordHash)) redirect("/account/profile?status=unsaved");
  redirect("/account/profile?status=password");
}

export async function requestDeletion(form: FormData) {
  const user = await requireUser();
  if (user.role !== "CUSTOMER") redirect("/account/profile?status=staff");
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    redirect("/account/profile?status=confirm");
  }
  await db.$transaction([
    // Soft delete keeps orders and reports for accounting; sessions end immediately.
    db.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.auditLog.create({ data: { actorId: user.id, action: "ACCOUNT_DELETION_REQUESTED", target: user.id } }),
  ]);
  (await cookies()).delete(cookieName);
  redirect("/?deleted=1");
}

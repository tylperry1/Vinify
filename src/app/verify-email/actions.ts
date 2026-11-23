"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { currentUser, rateLimit } from "@/lib/server/auth";
import { VERIFY_TTL_MS } from "@/lib/account";
import { issueToken, resolveToken } from "@/lib/server/tokens";
import { sendEmail, siteUrl, verificationEmail } from "@/lib/server/email";

/**
 * Verification only happens on this POST from the explicit confirm button, so
 * link scanners and prefetchers that open the emailed URL can't consume it.
 */
export async function confirmVerification(form: FormData) {
  const token = String(form.get("token") ?? "");
  const resolved = await resolveToken("verify:", token);
  if (!resolved) redirect("/verify-email?status=invalid");
  const user = await db.user.findUnique({ where: { id: resolved.userId }, select: { id: true, emailVerified: true } });
  if (!user) redirect("/verify-email?status=invalid");
  if (!user.emailVerified) {
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }),
      db.verificationToken.deleteMany({ where: { token: resolved.stored } }),
      db.auditLog.create({ data: { actorId: user.id, action: "EMAIL_VERIFIED", target: user.id } }),
    ]);
  }
  redirect("/verify-email?status=ok");
}

export async function resendVerification() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.emailVerified) redirect("/verify-email?status=verified");
  if (!await rateLimit(`verify:${user.id}`, 3, 3600000)) redirect("/verify-email?status=limited");

  const token = await issueToken(`verify:${user.id}`, VERIFY_TTL_MS);
  const sent = await sendEmail({ to: user.email, ...verificationEmail(siteUrl(`/verify-email?token=${token}`)) });
  await db.auditLog.create({
    data: { actorId: user.id, action: "VERIFICATION_EMAIL_SENT", target: user.id, meta: { delivered: sent.delivered, provider: sent.provider } },
  });
  redirect(`/verify-email?status=${sent.delivered ? "sent" : "unavailable"}`);
}

"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { currentUser, rateLimit } from "@/lib/server/auth";
import { VERIFY_TTL_MS } from "@/lib/account";
import { issueToken } from "@/lib/server/tokens";
import { sendEmail, siteUrl, verificationEmail } from "@/lib/server/email";

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

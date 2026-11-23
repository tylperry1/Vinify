import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { resolveToken } from "@/lib/server/tokens";
import { PageShell } from "@/components/PageShell";
import { resendVerification } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify your email", robots: { index: false, follow: false } };

const NOTES: Record<string, string> = {
  pending: "Open the link in the verification email to confirm this address.",
  sent: "A new verification link has been sent.",
  verified: "This email address is already verified.",
  unavailable: "We couldn't send the verification email because email delivery isn't configured yet. Your account still works — contact support and we'll verify it for you.",
  limited: "Too many verification emails requested. Try again in an hour.",
  invalid: "That verification link is invalid or has expired. Request a new one below.",
};

export default async function VerifyEmail({ searchParams }: { searchParams: Promise<{ token?: string; status?: string }> }) {
  const { token, status } = await searchParams;
  const user = await currentUser();
  let outcome = typeof status === "string" ? status : "pending";

  if (typeof token === "string" && token) {
    const resolved = await resolveToken("verify:", token);
    const target = resolved ? await db.user.findUnique({ where: { id: resolved.userId }, select: { id: true } }) : null;
    if (!resolved || !target) outcome = "invalid";
    else {
      await db.$transaction([
        db.user.update({ where: { id: target.id }, data: { emailVerified: new Date() } }),
        db.verificationToken.deleteMany({ where: { token: resolved.stored } }),
        db.auditLog.create({ data: { actorId: target.id, action: "EMAIL_VERIFIED", target: target.id } }),
      ]);
      outcome = "ok";
    }
  }

  const verified = outcome === "ok" || outcome === "verified";
  return (
    <PageShell>
      <section aria-labelledby="verify-h" className="mx-auto max-w-md px-5 py-16 sm:px-8">
        <h1 id="verify-h" className="text-3xl font-bold">{verified ? "Email verified" : "Verify your email"}</h1>
        <p role="status" className={`my-5 rounded-xl p-4 ${verified ? "bg-good-bg text-good" : outcome === "invalid" || outcome === "unavailable" ? "bg-warn-bg text-warn" : "bg-surface text-muted"}`}>
          {verified ? "Thanks — your email address is confirmed." : NOTES[outcome] ?? NOTES.pending}
        </p>

        {user && !user.emailVerified && !verified && (
          <form action={resendVerification}>
            <button className="admin-button">Send a new verification link</button>
          </form>
        )}

        <p className="mt-6 text-sm text-muted">
          {user ? <Link href="/account" className="font-semibold text-blue-600 hover:underline">Go to your account</Link> : <Link href="/login" className="font-semibold text-blue-600 hover:underline">Sign in</Link>}
        </p>
      </section>
    </PageShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/server/auth";
import { resolveToken } from "@/lib/server/tokens";
import { PageShell } from "@/components/PageShell";
import { confirmVerification, resendVerification } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify your email", robots: { index: false, follow: false } };

const NOTES: Record<string, string> = {
  pending: "Open the link in the verification email to confirm this address.",
  confirm: "Click the button below to confirm this email address. Opening this page doesn't verify anything by itself.",
  sent: "A new verification link has been sent.",
  ok: "Thanks — your email address is confirmed.",
  verified: "This email address is already verified.",
  unavailable: "We couldn't send the verification email because email delivery isn't configured yet. Your account still works — contact support and we'll verify it for you.",
  limited: "Too many verification emails requested. Try again in an hour.",
  invalid: "That verification link is invalid or has expired. Request a new one below.",
};

export default async function VerifyEmail({ searchParams }: { searchParams: Promise<{ token?: string; status?: string }> }) {
  const { token, status } = await searchParams;
  const user = await currentUser();
  const linkToken = typeof token === "string" && token ? token : null;
  const resolved = linkToken ? await resolveToken("verify:", linkToken) : null;

  let outcome = typeof status === "string" ? status : "pending";
  if (linkToken) outcome = resolved ? "confirm" : "invalid";

  const verified = outcome === "ok" || outcome === "verified";
  const tone = verified ? "bg-good-bg text-good" : outcome === "invalid" || outcome === "unavailable" ? "bg-warn-bg text-warn" : "bg-surface text-muted";
  const heading = verified ? "Email verified" : outcome === "confirm" ? "Confirm your email" : "Verify your email";

  return (
    <PageShell>
      <section aria-labelledby="verify-h" className="mx-auto max-w-md px-5 py-16 sm:px-8">
        <h1 id="verify-h" className="text-3xl font-bold">{heading}</h1>
        <p role="status" className={`my-5 rounded-xl p-4 ${tone}`}>{verified ? NOTES.ok : NOTES[outcome] ?? NOTES.pending}</p>

        {outcome === "confirm" && linkToken && (
          <form action={confirmVerification}>
            <input type="hidden" name="token" value={linkToken} />
            <button className="admin-button">Confirm email address</button>
          </form>
        )}

        {user && !user.emailVerified && !verified && outcome !== "confirm" && (
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

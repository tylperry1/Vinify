import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { emailConfigured, emailDeliverable } from "@/lib/server/email";
import { requestPasswordReset } from "./actions";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false, follow: false } };

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const canEmail = emailDeliverable();
  return (
    <PageShell>
      <section aria-labelledby="forgot-h" className="mx-auto max-w-md px-5 py-16 sm:px-8">
        <h1 id="forgot-h" className="text-3xl font-bold">Reset your password</h1>
        <p className="my-4 text-muted">Enter the email on your account and we&apos;ll send a reset link. It expires in one hour.</p>
        {status === "sent" && (
          <p role="status" className="mb-5 rounded-xl bg-surface p-4 text-muted">
            If that email has a Vinify account, reset instructions were sent. Nothing after a few minutes? Check spam, or{" "}
            <Link href="/contact" className="text-blue-600 underline">contact support</Link>.
          </p>
        )}
        {status === "limited" && <p role="alert" className="mb-5 rounded-xl bg-warn-bg p-4 text-warn">Too many requests. Wait an hour and try again.</p>}
        {status === "unavailable" && (
          <p role="alert" className="mb-5 rounded-xl bg-warn-bg p-4 text-warn">
            Password reset by email isn&apos;t available yet, so we can&apos;t send a reset link.{" "}
            <Link href="/contact" className="font-semibold underline">Contact support</Link> and we&apos;ll help you back into your account.
          </p>
        )}
        {canEmail ? (
          <form action={requestPasswordReset} className="grid gap-4">
            <label>Email<input className="admin-input" name="email" type="email" autoComplete="email" required maxLength={254} /></label>
            <button className="admin-button">Send reset link</button>
          </form>
        ) : (
          <Link href="/contact" className="admin-button inline-block">Contact support</Link>
        )}
        {canEmail && !emailConfigured() && (
          <p className="mt-4 text-sm text-faint">
            Development: no email provider is configured, so reset links are written to <code>.local-test/mail.log</code>.
          </p>
        )}
        <p className="mt-6 text-sm text-muted">
          Remembered it? <Link href="/login" className="font-semibold text-blue-600 hover:underline">Sign in</Link>
        </p>
      </section>
    </PageShell>
  );
}

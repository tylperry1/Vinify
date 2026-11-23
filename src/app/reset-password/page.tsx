import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { resolveToken } from "@/lib/server/tokens";
import { resetPassword } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  mismatch: "The passwords don't match.",
  length: "Use 14 to 256 characters.",
  "contains-email": "Don't include your email name in the password.",
  limited: "Too many attempts. Wait 15 minutes and try again.",
};

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string; error?: string; status?: string }> }) {
  const { token, error, status } = await searchParams;
  const resolved = typeof token === "string" && token ? await resolveToken("reset:", token) : null;
  const invalid = status === "invalid" || !resolved;
  return (
    <PageShell>
      <section aria-labelledby="reset-h" className="mx-auto max-w-md px-5 py-16 sm:px-8">
        <h1 id="reset-h" className="text-3xl font-bold">Choose a new password</h1>
        {invalid ? (
          <>
            <p role="alert" className="my-5 rounded-xl bg-warn-bg p-4 text-warn">
              This reset link is invalid or has expired. Reset links work once and last one hour.
            </p>
            <Link href="/forgot-password" className="admin-button inline-block">Request a new link</Link>
          </>
        ) : (
          <>
            <p className="my-4 text-muted">Pick something you don&apos;t use anywhere else. All other sessions will be signed out.</p>
            {error && <p role="alert" className="mb-5 rounded-xl bg-bad-bg p-4 text-bad">{ERRORS[error] ?? "Check your new password and try again."}</p>}
            <form action={resetPassword} className="grid gap-4">
              <input type="hidden" name="token" value={token} />
              <label>New password
                <input className="admin-input" name="password" type="password" autoComplete="new-password" required minLength={14} maxLength={256} />
              </label>
              <label>Confirm new password
                <input className="admin-input" name="confirm" type="password" autoComplete="new-password" required minLength={14} maxLength={256} />
              </label>
              <button className="admin-button">Update password</button>
            </form>
          </>
        )}
      </section>
    </PageShell>
  );
}

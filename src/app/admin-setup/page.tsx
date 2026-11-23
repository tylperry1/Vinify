import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { db } from "@/lib/server/db";
import { passwordMessages } from "@/lib/password-policy";
import { ADMIN_SETUP_ACTION } from "@/lib/admin-setup";
import { provisionSuperAdmin } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administrator setup", robots: { index: false, follow: false } };

const notes: Record<string, string> = {
  token: "That setup token doesn't match. Copy it exactly and try again.",
  email: "Enter a valid email address.",
  used: "Setup has already been completed. This page no longer creates accounts.",
  exists: "An account with that email already exists, and the create form never touches an existing account. Use the reset form below to set its password and grant it Super Admin.",
  missing: "No account exists for that email yet. Use the create form instead.",
  unavailable: "Setup is not enabled on this deployment.",
  limited: "Too many attempts. Wait 15 minutes and try again.",
  failed: "The account could not be created. Nothing was changed.",
  ...passwordMessages,
};

export default async function AdminSetup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!process.env.ADMIN_SETUP_TOKEN) notFound();
  const { error } = await searchParams;
  const completed = await db.auditLog.findFirst({ where: { action: ADMIN_SETUP_ACTION }, select: { createdAt: true } });

  return (
    <PageShell>
      <section aria-labelledby="setup-h" className="mx-auto max-w-md px-5 py-16 sm:px-8">
        <h1 id="setup-h" className="text-3xl font-bold">Administrator setup</h1>
        {completed ? (
          <p role="status" className="my-6 rounded-xl bg-surface p-4 text-muted">
            The Super Admin account was created on {completed.createdAt.toISOString().slice(0, 10)}. This page is closed.{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">Sign in</Link>.
          </p>
        ) : (
          <>
            <p className="my-4 text-muted">
              One-time setup: this creates a single Super Admin account. It runs once, then closes itself permanently and
              never changes an existing account.
            </p>
            {error && notes[error] && <p role="alert" className="mb-5 rounded-xl bg-warn-bg p-4 text-warn">{notes[error]}</p>}
            <form action={provisionSuperAdmin} className="grid gap-4" autoComplete="off">
              <label>Setup token<input className="admin-input" name="token" type="password" required autoComplete="off" /></label>
              <label>Email<input className="admin-input" name="email" type="email" required maxLength={254} autoComplete="off" /></label>
              <label>Password<input className="admin-input" name="password" type="password" required minLength={14} maxLength={256} autoComplete="new-password" /></label>
              <label>Confirm password<input className="admin-input" name="confirm" type="password" required minLength={14} maxLength={256} autoComplete="new-password" /></label>
              <button className="admin-button">Create Super Admin</button>
            </form>
            <p className="mt-5 text-sm text-faint">14–256 characters, and it must not contain the email name.</p>

            <hr className="my-8 border-line" />
            <h2 className="text-xl font-bold">Already have this account?</h2>
            <p className="my-3 text-sm text-muted">
              If the email below is already registered, this sets a new password on that account and grants it Super Admin.
              Nothing else about the account changes — no new record, no other fields touched.
            </p>
            <form action={provisionSuperAdmin} className="grid gap-4" autoComplete="off">
              <input type="hidden" name="mode" value="reset" />
              <label>Setup token<input className="admin-input" name="token" type="password" required autoComplete="off" /></label>
              <label>Email<input className="admin-input" name="email" type="email" required maxLength={254} autoComplete="off" /></label>
              <label>New password<input className="admin-input" name="password" type="password" required minLength={14} maxLength={256} autoComplete="new-password" /></label>
              <label>Confirm new password<input className="admin-input" name="confirm" type="password" required minLength={14} maxLength={256} autoComplete="new-password" /></label>
              <button className="admin-button">Set password and grant Super Admin</button>
            </form>
          </>
        )}
      </section>
    </PageShell>
  );
}

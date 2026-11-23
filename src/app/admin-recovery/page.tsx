import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { db } from "@/lib/server/db";
import { passwordMessages } from "@/lib/password-policy";
import { ADMIN_RECOVERY_ACTION } from "@/lib/admin-recovery";
import { recoverAccess } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Access recovery", robots: { index: false, follow: false } };

const notes: Record<string, string> = {
  token: "That recovery token doesn't match.",
  limited: "Too many attempts. Wait 15 minutes and try again.",
  used: "Recovery has already been used. This page is closed.",
  missing: "No account exists for that email or selection.",
  notstaff: "That account is not a staff account, so its password was not changed.",
  unavailable: "Recovery is not enabled on this deployment.",
  failed: "Recovery failed. Nothing was changed.",
  recovered: "Access restored. Set a permanent password below.",
  ...passwordMessages,
};

export default async function AdminRecovery({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!process.env.ADMIN_RECOVERY_TOKEN) notFound();
  const { error } = await searchParams;
  const used = await db.auditLog.findFirst({ where: { action: ADMIN_RECOVERY_ACTION }, select: { createdAt: true } });
  const staff = used ? [] : await db.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true, email: true, role: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return (
    <PageShell>
      <section aria-labelledby="rec-h" className="mx-auto max-w-xl px-5 py-16 sm:px-8">
        <h1 id="rec-h" className="text-3xl font-bold">Access recovery</h1>
        {used ? (
          <p role="status" className="my-6 rounded-xl bg-surface p-4 text-muted">
            Recovery was used on {used.createdAt.toISOString().slice(0, 10)} and this page is closed.{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">Sign in</Link>.
          </p>
        ) : (
          <>
            <p className="my-4 text-muted">One-time: sets a password on an existing staff account. It never creates an account and never changes an email address.</p>
            {error && notes[error] && <p role="alert" className="mb-5 rounded-xl bg-warn-bg p-4 text-warn">{notes[error]}</p>}
            <form action={recoverAccess} className="grid gap-4" autoComplete="off">
              <label>Recovery token<input className="admin-input" name="token" type="password" required autoComplete="off" /></label>
              <label>Staff email<input className="admin-input" name="email" type="email" required maxLength={254} autoComplete="off" /></label>
              <label>New password<input className="admin-input" name="password" type="password" required minLength={14} maxLength={256} autoComplete="new-password" /></label>
              <label>Confirm new password<input className="admin-input" name="confirm" type="password" required minLength={14} maxLength={256} autoComplete="new-password" /></label>
              <button className="admin-button">Set password and sign in</button>
            </form>

            <h2 className="mt-10 text-lg font-bold">Staff accounts on this database</h2>
            <p className="mt-1 text-sm text-muted">Use this if the email above doesn&apos;t exist. Pick the account, then submit the token with the same password fields.</p>
            <ul className="mt-3 grid gap-2 text-sm">
              {staff.length === 0 && <li className="text-faint">No staff accounts found.</li>}
              {staff.map(account => (
                <li key={account.id} className="rounded-lg border border-line bg-white p-3">
                  <span className="font-mono">{mask(account.email)}</span> · {account.role.replaceAll("_", " ")} · updated {account.updatedAt.toISOString().slice(0, 10)}
                  <span className="ml-2 text-faint">id {account.id.slice(0, 8)}…</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </PageShell>
  );
}

/** Show only the shape of an address, enough to recognise your own account. */
function mask(email: string) {
  const [name, domain = ""] = email.split("@");
  return `${name.slice(0, 1)}${"•".repeat(Math.max(1, name.length - 1))}@${domain.slice(0, 1)}${"•".repeat(Math.max(1, domain.length - 1))}`;
}

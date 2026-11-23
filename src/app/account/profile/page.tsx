import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { requireUser } from "@/lib/server/auth";
import { resendVerification } from "@/app/verify-email/actions";
import { changePassword, requestDeletion, updateProfile } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account settings", robots: { index: false, follow: false } };

const MESSAGES: Record<string, { tone: "good" | "bad" | "warn"; text: string }> = {
  profile: { tone: "good", text: "Profile updated." },
  password: { tone: "good", text: "Password changed. Other signed-in sessions have been signed out." },
  current: { tone: "bad", text: "Your current password is incorrect. Use the password you set most recently." },
  unsaved: { tone: "bad", text: "We couldn't confirm your new password was saved. Try again; if it keeps happening, contact support." },
  mismatch: { tone: "bad", text: "The new passwords don't match." },
  length: { tone: "bad", text: "Use 14 to 256 characters." },
  same: { tone: "bad", text: "Choose a password different from your current one." },
  "contains-email": { tone: "bad", text: "Don't include your email name in the password." },
  limited: { tone: "warn", text: "Too many attempts. Wait 15 minutes and try again." },
  confirm: { tone: "warn", text: "Type DELETE to confirm account deletion." },
  staff: { tone: "warn", text: "Staff accounts can't be deleted from this screen." },
};

const TONES = { good: "bg-good-bg text-good", bad: "bg-bad-bg text-bad", warn: "bg-warn-bg text-warn" } as const;

export default async function Profile({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const { status } = await searchParams;
  const message = status ? MESSAGES[status] : undefined;
  return (
    <PageShell>
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted"><Link href="/account" className="text-blue-600 hover:underline">Account</Link> / Settings</nav>
        <h1 className="mt-3 text-3xl font-bold">Account settings</h1>
        <p className="mt-2 text-muted">Signed in as {user.email} · member since {user.createdAt.toISOString().slice(0, 10)}</p>

        {message && <p role={message.tone === "good" ? "status" : "alert"} className={`mt-6 rounded-xl p-4 ${TONES[message.tone]}`}>{message.text}</p>}

        <section aria-labelledby="profile-h" className="mt-8 rounded-2xl border border-line bg-white p-6">
          <h2 id="profile-h" className="text-xl font-bold">Profile</h2>
          <form action={updateProfile} className="mt-4 grid gap-4">
            <label>Name<input className="admin-input" name="name" defaultValue={user.name ?? ""} maxLength={80} autoComplete="name" /></label>
            <label className="flex items-start gap-2 text-sm text-muted">
              <input type="checkbox" name="marketingOptIn" defaultChecked={user.marketingOptIn} className="mt-1" />
              <span>Send me occasional product updates and report tips.</span>
            </label>
            <button className="admin-button">Save profile</button>
          </form>
        </section>

        <section aria-labelledby="email-h" className="mt-6 rounded-2xl border border-line bg-white p-6">
          <h2 id="email-h" className="text-xl font-bold">Email</h2>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-muted">
            {user.email}
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.emailVerified ? "bg-good-bg text-good" : "bg-warn-bg text-warn"}`}>
              {user.emailVerified ? "Verified" : "Not verified"}
            </span>
          </p>
          {!user.emailVerified && (
            <form action={resendVerification} className="mt-4">
              <button className="admin-button">Send verification email</button>
            </form>
          )}
        </section>

        <section aria-labelledby="password-h" className="mt-6 rounded-2xl border border-line bg-white p-6">
          <h2 id="password-h" className="text-xl font-bold">Password</h2>
          <form action={changePassword} className="mt-4 grid gap-4">
            <label>Current password<input className="admin-input" name="current" type="password" autoComplete="current-password" required maxLength={256} /></label>
            <label>New password<input className="admin-input" name="next" type="password" autoComplete="new-password" required minLength={14} maxLength={256} /></label>
            <label>Confirm new password<input className="admin-input" name="confirm" type="password" autoComplete="new-password" required minLength={14} maxLength={256} /></label>
            <button className="admin-button">Change password</button>
          </form>
        </section>

        {user.role === "CUSTOMER" && (
          <section aria-labelledby="delete-h" className="mt-6 rounded-2xl border border-bad/25 bg-bad-bg/40 p-6">
            <h2 id="delete-h" className="text-xl font-bold text-bad">Delete account</h2>
            <p className="mt-2 text-sm text-muted">
              This closes your account immediately and signs you out. Order and report records are retained for tax and
              dispute purposes. Type <strong>DELETE</strong> to confirm.
            </p>
            <form action={requestDeletion} className="mt-4 flex flex-wrap items-end gap-3">
              <label className="flex-1">Confirmation<input className="admin-input" name="confirm" required maxLength={10} autoComplete="off" /></label>
              <button className="rounded-lg bg-bad px-4 py-2.5 font-semibold text-white">Delete my account</button>
            </form>
          </section>
        )}

        <p className="mt-8 text-sm text-muted"><Link href="/account" className="text-blue-600 hover:underline">Back to account</Link></p>
      </main>
    </PageShell>
  );
}

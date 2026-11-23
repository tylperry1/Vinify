import { requireAdmin } from "@/lib/server/auth";
import { passwordMessages } from "@/lib/password-policy";
import { PasswordStrength } from "@/components/PasswordStrength";
import { changeEmail, changePassword } from "./actions";
export const dynamic = "force-dynamic";
export default async function AdminAccount({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireAdmin(), { status } = await searchParams;
  const message = status ? passwordMessages[status] : undefined, ok = status === "done" || status === "email-done";
  return <><h1 className="text-3xl font-bold">Your account</h1>
    <p className="my-3 text-muted">{user.email} · {user.role.replaceAll("_", " ")}</p>
    {message && <p role={ok ? "status" : "alert"} className={`mb-6 max-w-lg rounded-xl p-3 text-sm ${ok ? "bg-good-bg text-good" : "bg-bad-bg text-bad"}`}>{message}</p>}
    <section className="max-w-lg rounded-2xl border border-line bg-white p-6">
      <h2 className="text-xl font-bold">Change password</h2>
      <p className="mt-2 text-sm text-muted">Your current password confirms the change. A new password needs 14 or more characters and must not contain your email name. Saving signs out your other sessions.</p>
      <form action={changePassword} className="mt-5 grid gap-4">
        <label>Current password<input className="admin-input" name="current" type="password" autoComplete="current-password" required maxLength={256} /></label>
        <label>New password<PasswordStrength name="next" /></label>
        <label>Confirm new password<input className="admin-input" name="confirm" type="password" autoComplete="new-password" required minLength={14} maxLength={256} /></label>
        <button className="admin-button">Change password</button>
      </form>
    </section>
    <section className="mt-8 max-w-lg rounded-2xl border border-line bg-white p-6">
      <h2 className="text-xl font-bold">Sign-in email</h2>
      <p className="mt-2 text-sm text-muted">Separate from the password form on purpose: changing one never alters the other.</p>
      <form action={changeEmail} className="mt-5 grid gap-4">
        <label>New email<input className="admin-input" name="email" type="email" autoComplete="email" defaultValue={user.email} required maxLength={254} /></label>
        <label>Current password<input className="admin-input" name="current" type="password" autoComplete="current-password" required maxLength={256} /></label>
        <button className="admin-button">Update email</button>
      </form>
    </section>
  </>;
}

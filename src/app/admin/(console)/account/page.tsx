import { requireAdmin } from "@/lib/server/auth";
import { passwordMessages } from "@/lib/password-policy";
import { changePassword } from "./actions";
export const dynamic = "force-dynamic";
export default async function AdminAccount({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireAdmin(), { status } = await searchParams;
  const message = status ? passwordMessages[status] : undefined, ok = status === "done";
  return <><h1 className="text-3xl font-bold">Your account</h1>
    <p className="my-3 text-muted">{user.email} · {user.role.replaceAll("_", " ")}</p>
    <section className="mt-8 max-w-lg rounded-2xl border border-line bg-white p-6">
      <h2 className="text-xl font-bold">Change password</h2>
      <p className="mt-2 text-sm text-muted">Use 14 or more characters. Changing it signs out your other sessions.</p>
      {message && <p role={ok ? "status" : "alert"} className={`mt-4 rounded-xl p-3 text-sm ${ok ? "bg-good-bg text-good" : "bg-bad-bg text-bad"}`}>{message}</p>}
      <form action={changePassword} className="mt-5 grid gap-4">
        <input type="email" name="username" autoComplete="username" value={user.email} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
        <label>Current password<input className="admin-input" name="current" type="password" autoComplete="current-password" required maxLength={256} /></label>
        <label>New password<input className="admin-input" name="next" type="password" autoComplete="new-password" required minLength={14} maxLength={256} /></label>
        <label>Confirm new password<input className="admin-input" name="confirm" type="password" autoComplete="new-password" required minLength={14} maxLength={256} /></label>
        <button className="admin-button">Update password</button>
      </form>
    </section></>;
}

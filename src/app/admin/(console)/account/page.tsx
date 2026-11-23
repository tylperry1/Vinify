import { requireAdmin } from "@/lib/server/auth";
import { passwordMessages } from "@/lib/password-policy";
import { updateCredentials } from "./actions";
export const dynamic = "force-dynamic";
export default async function AdminAccount({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireAdmin(), { status } = await searchParams;
  const message = status ? passwordMessages[status] : undefined, ok = status === "done";
  return <><h1 className="text-3xl font-bold">Your account</h1>
    <p className="my-3 text-muted">{user.email} · {user.role.replaceAll("_", " ")}</p>
    <section className="mt-8 max-w-lg rounded-2xl border border-line bg-white p-6">
      <h2 className="text-xl font-bold">Login details</h2>
      <p className="mt-2 text-sm text-muted">Set the email address and password you sign in with. A new password needs 14 or more characters; leave it blank to keep the current one. Saving signs out your other sessions.</p>
      {message && <p role={ok ? "status" : "alert"} className={`mt-4 rounded-xl p-3 text-sm ${ok ? "bg-good-bg text-good" : "bg-bad-bg text-bad"}`}>{message}</p>}
      <form action={updateCredentials} className="mt-5 grid gap-4">
        <label>Email<input className="admin-input" name="email" type="email" autoComplete="username" defaultValue={user.email} required maxLength={254} /></label>
        <label>Current password<input className="admin-input" name="current" type="password" autoComplete="current-password" required maxLength={256} /></label>
        <label>New password<input className="admin-input" name="next" type="password" autoComplete="new-password" minLength={14} maxLength={256} /></label>
        <label>Confirm new password<input className="admin-input" name="confirm" type="password" autoComplete="new-password" minLength={14} maxLength={256} /></label>
        <button className="admin-button">Save login details</button>
      </form>
    </section></>;
}

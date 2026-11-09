import { customerLogin } from "./actions";
import { PageShell } from "@/components/PageShell";
export const dynamic = "force-dynamic";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; registered?: string }> }) {
  const { error, registered } = await searchParams;
  return (
    <PageShell>
      <section className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-3xl font-bold">Sign in</h1>
        <p className="my-4 text-muted">Access your report library. New accounts require an invitation.</p>
        {registered === "1" && <p role="status" className="mb-4">Account created. Sign in with the email address that received your invitation.</p>}
        {error && <p role="alert" className="mb-4 text-bad">{error === "setup" ? "Accounts are awaiting database setup." : "Sign-in unsuccessful. Check your details or try later."}</p>}
        <form action={customerLogin} className="grid gap-4">
          <label>Email<input className="admin-input" type="email" name="email" required autoComplete="username" maxLength={254} /></label>
          <label>Password<input className="admin-input" type="password" name="password" required autoComplete="current-password" maxLength={256} /></label>
          <button className="admin-button">Sign in</button>
        </form>
      </section>
    </PageShell>
  );
}

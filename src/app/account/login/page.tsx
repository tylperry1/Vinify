import { redirect } from "next/navigation";
import { signIn } from "./actions";
import { PageShell } from "@/components/PageShell";
import { currentUser } from "@/lib/server/auth";
import { isAdmin } from "@/lib/security";
export const dynamic = "force-dynamic";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; registered?: string }> }) {
  const { error, registered } = await searchParams;
  const user = await currentUser().catch(() => null);
  if (user) redirect(isAdmin(user.role) ? "/admin" : "/account");
  const configured = Boolean(process.env.DATABASE_URL);
  return (
    <PageShell>
      <section className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-3xl font-bold">Sign in</h1>
        <p className="my-4 text-muted">Use your Vinify email and password to access your account or staff dashboard.</p>
        {!configured && <p role="status" className="mb-4 rounded-xl bg-warn-bg p-4">Sign-in is unavailable on this deployment until its database is connected.</p>}
        {registered === "1" && <p role="status" className="mb-4">Account created. Sign in with the email address that received your invitation.</p>}
        {configured && error === "credentials" && <p role="alert" className="mb-4 text-bad">Sign-in unsuccessful. Check your details or try again in a few minutes.</p>}
        {configured && error === "unavailable" && <p role="alert" className="mb-4 text-bad">Sign-in is temporarily unavailable. Please try again later.</p>}
        <form action={signIn} className="grid gap-4">
          <label>Email<input className="admin-input" type="email" name="email" required autoComplete="username" maxLength={254} /></label>
          <label>Password<input className="admin-input" type="password" name="password" required autoComplete="current-password" maxLength={256} /></label>
          <button className="admin-button disabled:opacity-50" disabled={!configured}>Sign in</button>
        </form>
      </section>
    </PageShell>
  );
}

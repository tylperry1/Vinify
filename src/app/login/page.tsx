import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { login } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  const { error, status } = await searchParams;
  return (
    <PageShell>
      <section aria-labelledby="sign-in" className="mx-auto max-w-md px-5 py-16 sm:px-8">
        <h1 id="sign-in" className="text-3xl font-bold">Sign in</h1>
        <p className="my-4 text-muted">One sign-in for Vinify customers and staff. Sessions expire after eight hours.</p>
        {!process.env.DATABASE_URL && <p role="status" className="mb-5 rounded-xl bg-warn-bg p-4">Accounts are awaiting database setup. The free decoder remains available.</p>}
        {status === "reset" && <p role="status" className="mb-5 rounded-xl bg-good-bg p-4 text-good">Password updated. Sign in with your new password.</p>}
        {error === "setup" && <p role="alert" className="mb-5 rounded-xl bg-warn-bg p-4 text-warn">Database setup is required.</p>}
        {error && error !== "setup" && <p role="alert" className="mb-5 text-bad">Sign-in unsuccessful. Check your details or try again later.</p>}
        <form action={login} className="grid gap-4">
          <label>Email<input className="admin-input" name="email" type="email" autoComplete="username" required maxLength={254} /></label>
          <label>Password<input className="admin-input" name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>
          <button className="admin-button">Sign in</button>
        </form>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</Link>
          <Link href="/register" className="font-semibold text-blue-600 hover:underline">Create an account</Link>
        </div>
      </section>
    </PageShell>
  );
}

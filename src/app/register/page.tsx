import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { currentUser } from "@/lib/server/auth";
import { register } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create your account", robots: { index: false, follow: false } };

const MESSAGES: Record<string, string> = {
  email: "Enter a valid email address.",
  taken: "An account already exists for that email. Sign in instead.",
  mismatch: "The passwords don't match.",
  length: "Use 14 to 256 characters for your password.",
  "contains-email": "Don't include your email name in the password.",
  terms: "Please accept the Terms and Privacy Policy to continue.",
  limited: "Too many attempts. Wait a little while and try again.",
  setup: "Accounts are awaiting database setup.",
};

export default async function Register({ searchParams }: { searchParams: Promise<{ error?: string; email?: string }> }) {
  const user = await currentUser();
  if (user) redirect("/account");
  const { error, email } = await searchParams;
  const message = error ? MESSAGES[error] ?? "Couldn't create your account. Please try again." : null;
  return (
    <PageShell>
      <section aria-labelledby="register-h" className="mx-auto max-w-md px-5 py-16 sm:px-8">
        <h1 id="register-h" className="text-3xl font-bold">Create your account</h1>
        <p className="my-4 text-muted">
          Free to create. Your VIN searches and purchased reports stay in one place.
        </p>
        {message && <p role="alert" className="mb-5 rounded-xl bg-bad-bg p-4 text-bad">{message}</p>}
        <form action={register} className="grid gap-4">
          <label>Name <span className="text-faint">(optional)</span>
            <input className="admin-input" name="name" autoComplete="name" maxLength={80} />
          </label>
          <label>Email
            <input className="admin-input" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={typeof email === "string" ? email.slice(0, 254) : ""} />
          </label>
          <label>Password
            <input className="admin-input" name="password" type="password" autoComplete="new-password" required minLength={14} maxLength={256} aria-describedby="password-help" />
          </label>
          <p id="password-help" className="-mt-2 text-sm text-faint">14–256 characters. A passphrase of several words works well.</p>
          <label>Confirm password
            <input className="admin-input" name="confirm" type="password" autoComplete="new-password" required minLength={14} maxLength={256} />
          </label>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input type="checkbox" name="terms" required className="mt-1" />
            <span>I agree to the <Link href="/legal/terms" className="text-blue-600 underline">Terms of Service</Link> and <Link href="/legal/privacy" className="text-blue-600 underline">Privacy Policy</Link>.</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input type="checkbox" name="marketing" className="mt-1" />
            <span>Send me occasional product updates. You can change this anytime.</span>
          </label>
          <button className="admin-button">Create account</button>
        </form>
        <p className="mt-6 text-sm text-muted">
          Already have an account? <Link href="/login" className="font-semibold text-blue-600 hover:underline">Sign in</Link>
        </p>
        <p className="mt-2 text-sm text-muted">
          Need help? <Link href="/contact" className="text-blue-600 hover:underline">Contact support</Link>.
        </p>
      </section>
    </PageShell>
  );
}

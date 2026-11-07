import { customerLogin } from "./actions";
import { PageShell } from "@/components/PageShell";
export const dynamic = "force-dynamic";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <PageShell><main className="mx-auto max-w-md px-6 py-16"><h1 className="text-3xl font-bold">Sign in</h1><p className="my-4 text-muted">Access your report library. New accounts open with the paid launch.</p>{error && <p role="alert">{error === "setup" ? "Accounts are awaiting database setup." : "Sign-in unsuccessful. Check your details or try later."}</p>}<form action={customerLogin} className="grid gap-4"><label>Email<input className="admin-input" type="email" name="email" required autoComplete="username" maxLength={254}/></label><label>Password<input className="admin-input" type="password" name="password" required autoComplete="current-password" maxLength={256}/></label><button className="admin-button">Sign in</button></form></main></PageShell>;
}

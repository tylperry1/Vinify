import { login } from "./actions";
import { Logo } from "@/components/Logo";
export const dynamic = "force-dynamic";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="mx-auto max-w-md px-6 py-20"><Logo /><h1 className="mt-10 text-3xl font-bold">Admin sign in</h1>
    <p className="my-4 text-muted">Authorized Vinify staff only. Sessions expire after eight hours.</p>
    {!process.env.DATABASE_URL && <p role="status" className="mb-5 rounded-xl bg-warn-bg p-4">Administration is awaiting database setup. The free decoder remains available.</p>}
    {error && <p role="alert" className="text-bad">{error === "setup" ? "Database setup is required." : "Sign-in unsuccessful. Check your credentials or try again later."}</p>}
    <form action={login} className="grid gap-4"><label>Email<input className="admin-input" name="email" type="email" autoComplete="username" required maxLength={254}/></label>
    <label>Password<input className="admin-input" name="password" type="password" autoComplete="current-password" required maxLength={256}/></label><button className="admin-button">Sign in</button></form></main>;
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { registerCustomer } from "./actions";

export function RegisterForm() {
  const [token, setToken] = useState<string | null>(null);
  const [state, action, pending] = useActionState(registerCustomer, {});
  useEffect(() => {
    const syncToken = () => setToken(window.location.hash.slice(1));
    syncToken();
    window.addEventListener("hashchange", syncToken);
    return () => window.removeEventListener("hashchange", syncToken);
  }, []);

  if (token === null) return <p>Loading invitation…</p>;
  if (!/^[a-f0-9]{64}$/.test(token)) return <p>Open the invitation link from Vinify to create an account.</p>;

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <label>Password<input name="password" type="password" autoComplete="new-password" required minLength={14} maxLength={256} className="admin-input" /></label>
      <label>Confirm password<input name="confirmation" type="password" autoComplete="new-password" required minLength={14} maxLength={256} className="admin-input" /></label>
      {state.error && <p role="alert" className="text-bad">{state.error}</p>}
      <button className="admin-button" type="submit" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
    </form>
  );
}

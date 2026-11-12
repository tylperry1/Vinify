"use client";

import { useActionState, useEffect, useState } from "react";
import { createCustomerInvite } from "./actions";

export function CustomerInvite() {
  const [state, action, pending] = useActionState(createCustomerInvite, {});
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <details className="mb-5 rounded-xl border border-line bg-white p-4">
      <summary className="cursor-pointer font-semibold">Invite a customer</summary>
      <p className="my-3 text-sm text-muted">Share the one-time link privately with the intended customer. It expires after 24 hours.</p>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label>Customer email<input name="email" type="email" required maxLength={254} className="admin-input" /></label>
        <button type="submit" className="admin-button" disabled={pending}>{pending ? "Creating…" : "Create invite"}</button>
      </form>
      {state.error && <p role="alert" className="mt-3 text-bad">{state.error}</p>}
      {state.token && origin && (
        <label className="mt-4 block">Invitation link
          <input className="admin-input" readOnly value={origin + "/account/register#" + state.token} onFocus={(event) => event.currentTarget.select()} />
        </label>
      )}
    </details>
  );
}

"use client";
import { useMemo, useState } from "react";

/**
 * Advisory strength feedback for a new password. The hard rules live on the
 * server (14–256 characters, not the email name); this only helps the person
 * typing pick something better before they submit.
 */
export function PasswordStrength({ name }: { name: string }) {
  const [value, setValue] = useState("");
  const result = useMemo(() => score(value), [value]);
  return (
    <>
      <input
        className="admin-input"
        name={name}
        type="password"
        required
        minLength={14}
        maxLength={256}
        autoComplete="new-password"
        onChange={event => setValue(event.target.value)}
        aria-describedby="password-strength"
      />
      <span id="password-strength" className="mt-1 flex items-center gap-2" aria-live="polite">
        <span className="flex h-1.5 flex-1 gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map(i => (
            <span key={i} className={`h-full flex-1 rounded-full ${i < result.score ? result.bar : "bg-line"}`} />
          ))}
        </span>
        <span className={`text-xs ${result.tone}`}>{result.label}</span>
      </span>
    </>
  );
}

function score(password: string) {
  if (!password) return { score: 0, label: "At least 14 characters", bar: "", tone: "text-faint" };
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(password)).length;
  let score = classes + (password.length >= 20 ? 1 : password.length >= 14 ? 0 : -1);
  if (/^(password|vinify|letmein|qwerty|admin)/i.test(password) || /(.)\1{3,}/.test(password)) score -= 2;
  score = Math.max(0, Math.min(4, score));
  const table = [
    ["Too short or too simple", "text-bad", "bg-bad"],
    ["Weak", "text-bad", "bg-bad"],
    ["Fair", "text-warn", "bg-warn"],
    ["Strong", "text-good", "bg-good"],
    ["Very strong", "text-good", "bg-good"],
  ] as const;
  const [, tone, bar] = table[score];
  return { score, label: table[score][0], bar, tone };
}

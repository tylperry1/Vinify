import type { PasswordChangeError } from "./password-policy";

/** How long an email-verification and a password-reset link stay valid. */
export const VERIFY_TTL_MS = 24 * 60 * 60_000;
export const RESET_TTL_MS = 60 * 60_000;

/** Lowercase and trim an email, returning null when it cannot be a real address. */
export function normalizeEmail(input: unknown): string | null {
  const email = String(input ?? "").trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
}

/** Collapse whitespace and cap a display name. Empty becomes null. */
export function normalizeName(input: unknown): string | null {
  const name = String(input ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return name || null;
}

/**
 * Rules for setting a password without knowing the current one (registration,
 * password reset). Password changes that know the current password use
 * `checkNewPassword` so they can also reject reuse.
 */
export function checkPassword(next: string, confirm: string, email: string): PasswordChangeError | null {
  if (next !== confirm) return "mismatch";
  if (next.length < 14 || next.length > 256) return "length";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && next.toLowerCase().includes(local)) return "contains-email";
  return null;
}

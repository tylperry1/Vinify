import { checkNewPassword, type PasswordChangeError } from "./password-policy";

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
 * password reset). Reuses the shared policy so the rules can't drift; with no
 * current password the "same password" rule can never fire.
 */
export function checkPassword(next: string, confirm: string, email: string): PasswordChangeError | null {
  return checkNewPassword("", next, confirm, email);
}

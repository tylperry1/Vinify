export type PasswordChangeError = "mismatch" | "length" | "same" | "contains-email";
/** Server-side rules for a new staff password. Returns null when acceptable. */
export function checkNewPassword(current: string, next: string, confirm: string, email: string): PasswordChangeError | null {
  if (next !== confirm) return "mismatch";
  if (next.length < 14 || next.length > 256) return "length";
  if (next === current) return "same";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && next.toLowerCase().includes(local)) return "contains-email";
  return null;
}
export const passwordMessages: Record<string, string> = {
  done: "Password updated. Other signed-in sessions have been signed out.",
  current: "Your current password is incorrect.",
  mismatch: "The new passwords don't match.",
  length: "Use 14 to 256 characters.",
  same: "Choose a password different from your current one.",
  "contains-email": "Don't include your email name in the password.",
  limited: "Too many attempts. Wait 15 minutes and try again.",
};

import "server-only";
import { db } from "./db";

/**
 * When the account's password was last set, taken from the audit trail so the
 * account pages can show a real timestamp instead of implying a save.
 * Password changes are logged as PASSWORD_CHANGED (customer settings),
 * CREDENTIALS_UPDATED with passwordChanged (admin account) or PASSWORD_RESET.
 */
export async function lastPasswordChange(userId: string): Promise<Date | null> {
  const row = await db.auditLog.findFirst({
    where: {
      target: userId,
      OR: [
        { action: "PASSWORD_CHANGED" },
        { action: "PASSWORD_RESET" },
        { action: "CREDENTIALS_UPDATED", meta: { path: ["passwordChanged"], equals: true } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return row?.createdAt ?? null;
}

/** Fixed UTC stamp so server and client rendering never disagree. */
export function utcStamp(date: Date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

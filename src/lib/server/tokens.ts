import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { digest } from "../security";

/**
 * Single-use tokens for email verification and password reset.
 *
 * Only the SHA-256 digest is stored, so a database leak does not expose working
 * links. Issuing a new token for an identifier revokes any previous one.
 */
export async function issueToken(identifier: string, ttlMs: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.$transaction([
    db.verificationToken.deleteMany({ where: { identifier } }),
    db.verificationToken.create({
      data: { identifier, token: digest(token), expires: new Date(Date.now() + ttlMs) },
    }),
  ]);
  return token;
}

/** Resolve a token without consuming it, so validation errors don't burn the link. */
export async function resolveToken(prefix: string, token: string): Promise<{ userId: string; stored: string } | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const stored = digest(token);
  const row = await db.verificationToken.findUnique({ where: { token: stored } });
  if (!row || !row.identifier.startsWith(prefix) || row.expires <= new Date()) return null;
  return { userId: row.identifier.slice(prefix.length), stored };
}

export async function revokeToken(stored: string): Promise<void> {
  await db.verificationToken.deleteMany({ where: { token: stored } });
}

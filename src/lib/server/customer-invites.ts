import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { digest, hashPassword } from "../security";

const invitePrefix = "customer-invite:";
const oneDay = 24 * 60 * 60 * 1000;

export async function issueCustomerInvite(email: string, actorId: string) {
  const token = randomBytes(32).toString("hex");
  const identifier = invitePrefix + email;
  const issued = await db.$transaction(async (tx) => {
    if (await tx.user.findUnique({ where: { email }, select: { id: true } })) return false;
    await tx.verificationToken.deleteMany({ where: { identifier } });
    await tx.verificationToken.create({
      data: { identifier, token: digest(token), expires: new Date(Date.now() + oneDay) },
    });
    await tx.auditLog.create({ data: { actorId, action: "CUSTOMER_INVITED" } });
    return true;
  }, { isolationLevel: "Serializable" });
  return issued ? token : null;
}

export async function acceptCustomerInvite(token: string, password: string) {
  const tokenHash = digest(token);
  const invite = await db.verificationToken.findUnique({ where: { token: tokenHash } });
  if (!invite?.identifier.startsWith(invitePrefix) || invite.expires <= new Date()) return false;
  const email = invite.identifier.slice(invitePrefix.length);
  const passwordHash = hashPassword(password);

  return db.$transaction(async (tx) => {
    const claimed = await tx.verificationToken.deleteMany({
      where: { token: tokenHash, identifier: invite.identifier, expires: { gt: new Date() } },
    });
    if (!claimed.count) return false;
    const user = await tx.user.create({ data: { email, passwordHash, role: "CUSTOMER" } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "CUSTOMER_REGISTERED" } });
    return true;
  });
}

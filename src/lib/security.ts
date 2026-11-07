import { randomBytes, scryptSync, timingSafeEqual, createHash, createCipheriv, createDecipheriv } from "node:crypto";
export const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export function hashPassword(password: string) {
  if (password.length < 14 || password.length > 256) throw new Error("Use 14–256 characters");
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash || password.length > 256) return false;
  const expected = Buffer.from(hash, "hex"), actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
function key() {
  const k = Buffer.from(process.env.API_ENCRYPTION_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("API_ENCRYPTION_KEY must be 32 bytes in base64");
  return k;
}
export function encryptSecret(secret: string, provider: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(provider));
  const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b => b.toString("base64")).join(".");
}
export function decryptSecret(value: string, provider: string) {
  const [iv, tag, data] = value.split(".").map(v => Buffer.from(v, "base64"));
  const cipher = createDecipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(provider)); cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8");
}
export function isAdmin(role: string) { return role === "ADMIN" || role === "SUPER_ADMIN"; }

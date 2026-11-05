import { describe, it, expect, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword, encryptSecret, decryptSecret, isAdmin } from "../src/lib/security";
afterEach(() => { delete process.env.API_ENCRYPTION_KEY; });
describe("credential protection", () => {
  it("hashes with unique salts and rejects incorrect passwords", () => {
    const hash = hashPassword("a-long-password-for-tests");
    expect(hash).not.toBe(hashPassword("a-long-password-for-tests"));
    expect(verifyPassword("a-long-password-for-tests", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
    expect(verifyPassword("wrong", "malformed")).toBe(false);
    expect(() => hashPassword("short")).toThrow();
  });
  it("authenticates ciphertext and binds it to a provider", () => {
    process.env.API_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    const encrypted = encryptSecret("test-key", "supplier");
    expect(encrypted).not.toContain("test-key");
    expect(decryptSecret(encrypted, "supplier")).toBe("test-key");
    expect(() => decryptSecret(encrypted, "other")).toThrow();
    const parts = encrypted.split("."); parts[1] = Buffer.alloc(16).toString("base64");
    expect(() => decryptSecret(parts.join("."), "supplier")).toThrow();
    process.env.API_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(() => decryptSecret(encrypted, "supplier")).toThrow();
  });
  it("fails closed without an encryption key or admin role", () => {
    expect(() => encryptSecret("key", "supplier")).toThrow();
    for (const role of ["CUSTOMER", "SUPPORT", "", "admin"]) expect(isAdmin(role)).toBe(false);
    expect(isAdmin("ADMIN")).toBe(true); expect(isAdmin("SUPER_ADMIN")).toBe(true);
  });
});

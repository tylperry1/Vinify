import { describe, expect, it } from "vitest";
import { checkPassword, normalizeEmail, normalizeName } from "@/lib/account";

describe("normalizeEmail", () => {
  it("trims and lowercases a valid address", () => {
    expect(normalizeEmail("  Tyler@Example.COM ")).toBe("tyler@example.com");
  });
  it("rejects malformed addresses", () => {
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail("a@b")).toBeNull();
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });
  it("rejects addresses over 254 characters", () => {
    expect(normalizeEmail(`${"a".repeat(250)}@example.com`)).toBeNull();
  });
});

describe("normalizeName", () => {
  it("collapses whitespace and caps length", () => {
    expect(normalizeName("  Amelia   Rhodes ")).toBe("Amelia Rhodes");
    expect(normalizeName("x".repeat(200))).toHaveLength(80);
    expect(normalizeName("   ")).toBeNull();
  });
});

describe("checkPassword", () => {
  it("accepts a long passphrase without the email name", () => {
    expect(checkPassword("correct horse battery staple", "correct horse battery staple", "amelia@example.test")).toBeNull();
  });
  it("rejects mismatches, short passwords and email-derived passwords", () => {
    expect(checkPassword("a".repeat(14), "b".repeat(14), "amelia@example.test")).toBe("mismatch");
    expect(checkPassword("short", "short", "amelia@example.test")).toBe("length");
    expect(checkPassword("amelia-and-more-2026", "amelia-and-more-2026", "amelia@example.test")).toBe("contains-email");
  });
});

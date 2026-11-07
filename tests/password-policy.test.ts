import { describe, expect, it } from "vitest";
import { checkNewPassword } from "../src/lib/password-policy";
const email = "tperry09@gmail.com", current = "old-example-password-123";
describe("staff password change rules", () => {
  it("accepts a strong new password", () => expect(checkNewPassword(current, "correct horse battery", "correct horse battery", email)).toBeNull());
  it("requires matching confirmation", () => expect(checkNewPassword(current, "correct horse battery", "correct horse batterx", email)).toBe("mismatch"));
  it("enforces length", () => {
    expect(checkNewPassword(current, "short-pass", "short-pass", email)).toBe("length");
    const long = "a".repeat(257); expect(checkNewPassword(current, long, long, email)).toBe("length");
  });
  it("rejects reusing the current password", () => expect(checkNewPassword(current, current, current, email)).toBe("same"));
  it("rejects passwords containing the email name", () => expect(checkNewPassword(current, "my-TPERRY09-secret", "my-TPERRY09-secret", email)).toBe("contains-email"));
});

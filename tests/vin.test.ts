import { describe, expect, it } from "vitest";
import { computeCheckDigit, normalizeVin, validateVin, vinSegments } from "../src/lib/vin";

describe("normalizeVin", () => {
  it("uppercases and strips spaces/dashes", () => {
    expect(normalizeVin(" 1hgcm8-2633a 004352 ")).toBe("1HGCM82633A004352");
  });
});

describe("computeCheckDigit", () => {
  it.each([
    ["1HGCM82633A004352", "3"],
    ["1M8GDM9AXKP042788", "X"],
    ["5YJ3E1EA2KF317000", "2"],
    ["JH4KA7561PC008269", "1"],
    ["11111111111111111", "1"],
    ["5YJ3E1EA7KF317000", "2"], // NHTSA reports this VIN fails its check digit
  ])("%s → %s", (vin, digit) => {
    expect(computeCheckDigit(vin)).toBe(digit);
  });
});

describe("validateVin", () => {
  it("accepts a valid North American VIN", () => {
    const r = validateVin("1HGCM82633A004352");
    expect(r.wellFormed).toBe(true);
    expect(r.checkDigitValid).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  it("flags check digit mismatch as a warning, not an error", () => {
    const r = validateVin("1HGCM82643A004352");
    expect(r.wellFormed).toBe(true);
    expect(r.checkDigitValid).toBe(false);
    expect(r.warnings[0]).toMatchObject({ code: "check_digit", expected: "3", actual: "4" });
  });

  it("rejects I, O and Q with a helpful hint", () => {
    const r = validateVin("1HGCM82633AO04352");
    expect(r.wellFormed).toBe(false);
    expect(r.errors[0].code).toBe("characters");
    expect(r.errors[0].message).toMatch(/I, O or Q/);
  });

  it("rejects wrong length", () => {
    const r = validateVin("1HGCM82633A00435");
    expect(r.wellFormed).toBe(false);
    expect(r.errors.some((e) => e.code === "length")).toBe(true);
  });

  it("rejects empty input", () => {
    expect(validateVin("").errors[0].code).toBe("empty");
  });

  it("rejects symbols", () => {
    expect(validateVin("1HGCM82633A00435!").wellFormed).toBe(false);
  });
});

describe("vinSegments", () => {
  it("splits WMI / VDS / check / year / plant / serial", () => {
    expect(vinSegments("1HGCM82633A004352")).toEqual({
      wmi: "1HG", vds: "CM826", check: "3", year: "3", plant: "A", serial: "004352",
    });
  });
});

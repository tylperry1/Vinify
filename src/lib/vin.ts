/**
 * VIN validation utilities.
 *
 * - Format: 17 characters, A–Z and 0–9, excluding I, O and Q (ISO 3779 / 49 CFR 565).
 * - Check digit: position 9, computed with the 49 CFR 565.15 transliteration and weights.
 *   The check digit is mandatory for vehicles built for the North American market;
 *   some non‑North‑American VINs do not use it, so a mismatch is reported as a warning,
 *   not a hard failure.
 */

export const VIN_LENGTH = 17;
const ALLOWED = /^[A-HJ-NPR-Z0-9]+$/;

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export type VinIssue =
  | { code: "empty"; message: string }
  | { code: "length"; message: string }
  | { code: "characters"; message: string; invalid: string[] }
  | { code: "check_digit"; message: string; expected: string; actual: string };

export interface VinValidation {
  vin: string;
  /** Passes structural checks (length + allowed characters). Safe to send to a decoder. */
  wellFormed: boolean;
  /** Check digit matches. `null` when the VIN is not well formed. */
  checkDigitValid: boolean | null;
  errors: VinIssue[];
  warnings: VinIssue[];
}

/** Uppercase, strip whitespace and dashes. Does not "fix" I/O/Q — those are reported. */
export function normalizeVin(input: string): string {
  return (input ?? "").toUpperCase().replace(/[\s-]+/g, "");
}

function charValue(c: string): number {
  if (c >= "0" && c <= "9") return Number(c);
  const v = TRANSLITERATION[c];
  if (v === undefined) throw new Error(`Invalid VIN character: ${c}`);
  return v;
}

/** Computes the expected check digit ("0"–"9" or "X") for a 17‑character VIN. */
export function computeCheckDigit(vin: string): string {
  if (vin.length !== VIN_LENGTH) throw new Error("VIN must be 17 characters");
  let sum = 0;
  for (let i = 0; i < VIN_LENGTH; i++) sum += charValue(vin[i]) * WEIGHTS[i];
  const r = sum % 11;
  return r === 10 ? "X" : String(r);
}

export function validateVin(input: string): VinValidation {
  const vin = normalizeVin(input);
  const errors: VinIssue[] = [];
  const warnings: VinIssue[] = [];

  if (!vin) {
    errors.push({ code: "empty", message: "Enter a 17-character VIN." });
    return { vin, wellFormed: false, checkDigitValid: null, errors, warnings };
  }

  const invalid = Array.from(new Set(vin.split("").filter((c) => !/[A-HJ-NPR-Z0-9]/.test(c))));
  if (invalid.length) {
    const ioq = invalid.filter((c) => "IOQ".includes(c));
    errors.push({
      code: "characters",
      invalid,
      message: ioq.length
        ? `VINs never contain the letters I, O or Q (found ${ioq.join(", ")}). Check for 1 or 0 instead.`
        : `Unsupported character${invalid.length > 1 ? "s" : ""}: ${invalid.join(" ")}`,
    });
  }

  if (vin.length !== VIN_LENGTH) {
    errors.push({
      code: "length",
      message: `A VIN has 17 characters — this one has ${vin.length}.`,
    });
  }

  const wellFormed = errors.length === 0 && ALLOWED.test(vin);
  let checkDigitValid: boolean | null = null;

  if (wellFormed) {
    const expected = computeCheckDigit(vin);
    checkDigitValid = expected === vin[8];
    if (!checkDigitValid) {
      warnings.push({
        code: "check_digit",
        expected,
        actual: vin[8],
        message:
          "The check digit (9th character) doesn’t match. This usually means a typo. Vehicles built for markets outside North America may not use a check digit.",
      });
    }
  }

  return { vin, wellFormed, checkDigitValid, errors, warnings };
}

/** VIN anatomy for display. */
export function vinSegments(vin: string) {
  const v = normalizeVin(vin).padEnd(VIN_LENGTH, " ").slice(0, VIN_LENGTH);
  return {
    wmi: v.slice(0, 3), // World Manufacturer Identifier
    vds: v.slice(3, 8), // Vehicle Descriptor Section
    check: v.slice(8, 9),
    year: v.slice(9, 10),
    plant: v.slice(10, 11),
    serial: v.slice(11, 17),
  };
}

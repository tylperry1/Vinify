import { describe, expect, it } from "vitest";
import { LedgerEntry, LedgerError, availableCredits, openReservations, planReserve, planSettle } from "../src/lib/credits";

const grant = (n: number, key = "grant"): LedgerEntry => ({ delta: n, reason: "PURCHASE", idempotencyKey: key, createdAt: new Date() });

describe("credit ledger", () => {
  it("reserve then consume leaves balance reduced by one", () => {
    let l: LedgerEntry[] = [grant(3)];
    l = [...l, ...planReserve(l, "rr1")];
    expect(availableCredits(l)).toBe(2);
    l = [...l, ...planSettle(l, "rr1", "success")];
    expect(availableCredits(l)).toBe(2);
    expect(openReservations(l)).toEqual([]);
  });

  it("reserve then failure restores the credit", () => {
    let l: LedgerEntry[] = [grant(1)];
    l = [...l, ...planReserve(l, "rr1")];
    l = [...l, ...planSettle(l, "rr1", "failure")];
    expect(availableCredits(l)).toBe(1);
  });

  it("retrying reserve is idempotent (no double charge)", () => {
    let l: LedgerEntry[] = [grant(2)];
    l = [...l, ...planReserve(l, "rr1")];
    l = [...l, ...planReserve(l, "rr1")];
    expect(availableCredits(l)).toBe(1);
  });

  it("settling twice is a no-op", () => {
    let l: LedgerEntry[] = [grant(1)];
    l = [...l, ...planReserve(l, "rr1")];
    l = [...l, ...planSettle(l, "rr1", "failure")];
    l = [...l, ...planSettle(l, "rr1", "failure")];
    expect(availableCredits(l)).toBe(1);
  });

  it("refuses to reserve with zero balance", () => {
    expect(() => planReserve([], "rr1")).toThrow(LedgerError);
  });
});

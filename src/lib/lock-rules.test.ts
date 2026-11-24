import { describe, expect, it } from "vitest";
import { hashPin, lockoutUntil, newSalt, pinProblem, sameHash, shouldLockOnReturn } from "./lock-rules";

describe("pinProblem", () => {
  it("accepts six mixed digits", () => {
    expect(pinProblem("284716")).toBeNull();
    expect(pinProblem("112358")).toBeNull();
  });

  it("asks for exactly six digits", () => {
    expect(pinProblem("1234")).toBe("Use 6 digits.");
    expect(pinProblem("12a456")).toBe("Use 6 digits.");
  });

  it("rejects easy guesses", () => {
    expect(pinProblem("000000")).toBe("Avoid the same digit six times.");
    expect(pinProblem("123456")).toBe("Avoid a straight run like 123456.");
    expect(pinProblem("987654")).toBe("Avoid a straight run like 123456.");
  });
});

describe("shouldLockOnReturn", () => {
  it("locks once the app was away long enough", () => {
    expect(shouldLockOnReturn(1_000, 61_000, 60_000)).toBe(true);
    expect(shouldLockOnReturn(1_000, 30_000, 60_000)).toBe(false);
  });

  it("locks on any return when set to immediately", () => {
    expect(shouldLockOnReturn(1_000, 1_001, 0)).toBe(true);
  });

  it("does nothing if the app never went away", () => {
    expect(shouldLockOnReturn(null, 99_999, 0)).toBe(false);
  });
});

describe("lockoutUntil", () => {
  it("allows the first five tries", () => {
    expect(lockoutUntil(4, 1_000)).toBeNull();
  });

  it("waits 30 seconds after five misses, doubling after that, up to 15 minutes", () => {
    expect(lockoutUntil(5, 1_000)).toBe(31_000);
    expect(lockoutUntil(6, 1_000)).toBe(61_000);
    expect(lockoutUntil(20, 0)).toBe(15 * 60_000);
  });
});

describe("hashPin", () => {
  it("is stable for the same PIN and salt, and differs otherwise", async () => {
    const salt = newSalt();
    const a = await hashPin("284716", salt, 1_000);
    expect(await hashPin("284716", salt, 1_000)).toBe(a);
    expect(await hashPin("284717", salt, 1_000)).not.toBe(a);
    expect(await hashPin("284716", newSalt(), 1_000)).not.toBe(a);
  });

  it("compares hashes", () => {
    expect(sameHash("abc", "abc")).toBe(true);
    expect(sameHash("abc", "abd")).toBe(false);
    expect(sameHash("abc", "ab")).toBe(false);
  });
});

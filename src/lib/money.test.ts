import { describe, expect, it } from "vitest";
import { formatRupiah, groupThousands, maskAccountNumber, parseRupiahInput } from "./money";

describe("formatRupiah", () => {
  it("uses dot thousands and no decimals", () => {
    expect(formatRupiah(12480500)).toBe("Rp 12.480.500");
    expect(formatRupiah(35000)).toBe("Rp 35.000");
    expect(formatRupiah(999)).toBe("Rp 999");
    expect(formatRupiah(0)).toBe("Rp 0");
  });

  it("puts a minus sign before Rp for negatives", () => {
    expect(formatRupiah(-35000)).toBe("−Rp 35.000");
  });

  it("refuses fractions", () => {
    expect(() => formatRupiah(1000.5)).toThrow();
  });
});

describe("groupThousands", () => {
  it("groups large numbers", () => {
    expect(groupThousands(1000000000000)).toBe("1.000.000.000.000");
  });
});

describe("parseRupiahInput", () => {
  it("keeps digits only", () => {
    expect(parseRupiahInput("Rp 1.250.000")).toBe(1250000);
    expect(parseRupiahInput("35,000")).toBe(35000);
  });

  it("treats empty input as zero and drops leading zeros", () => {
    expect(parseRupiahInput("")).toBe(0);
    expect(parseRupiahInput("000123")).toBe(123);
  });

  it("caps at 13 digits", () => {
    expect(parseRupiahInput("12345678901234567")).toBe(1234567890123);
  });
});

describe("maskAccountNumber", () => {
  it("shows the last 4 digits", () => {
    expect(maskAccountNumber("1234567890")).toBe("•••• 7890");
  });

  it("hides short or missing numbers", () => {
    expect(maskAccountNumber("123")).toBeNull();
    expect(maskAccountNumber(null)).toBeNull();
  });
});

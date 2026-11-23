import { describe, expect, it } from "vitest";
import { inPeriod, periodFor, periodRangeLabel, periodStartIn, periodsBetween } from "./periods";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("periodStartIn", () => {
  it("is the 25th on a weekday", () => {
    expect(iso(periodStartIn(2026, 10))).toBe("2026-11-25"); // Wed 25 Nov 2026
  });

  it("moves a Saturday 25th to Monday the 27th", () => {
    expect(iso(periodStartIn(2026, 6))).toBe("2026-07-27"); // Sat 25 Jul 2026
  });

  it("moves a Sunday 25th to Monday the 26th", () => {
    expect(iso(periodStartIn(2026, 9))).toBe("2026-10-26"); // Sun 25 Oct 2026
  });

  it("handles month overflow into the next year", () => {
    expect(iso(periodStartIn(2026, 12))).toBe("2027-01-25"); // Mon 25 Jan 2027
  });
});

describe("periodFor", () => {
  it("names the period after the month it ends in", () => {
    expect(periodFor("2026-12-07", 2026)).toEqual({ start: "2026-11-25", end: "2026-12-24", name: "December" });
  });

  it("puts the start day in the new period and the day before in the old one", () => {
    expect(periodFor("2026-11-25", 2026).name).toBe("December");
    expect(periodFor("2026-11-24", 2026)).toEqual({ start: "2026-10-26", end: "2026-11-24", name: "November" });
  });

  it("ends the day before a shifted start", () => {
    // 25 Jul 2026 is a Saturday, so the July period ends on Sunday the 26th.
    expect(periodFor("2026-07-26", 2026)).toEqual({ start: "2026-06-25", end: "2026-07-26", name: "July" });
    expect(periodFor("2026-07-27", 2026).start).toBe("2026-07-27");
  });

  it("crosses the year and adds the year when it isn't the current one", () => {
    expect(periodFor("2026-12-28", 2026)).toEqual({ start: "2026-12-25", end: "2027-01-24", name: "January 2027" });
    expect(periodFor("2025-12-01", 2026).name).toBe("December 2025");
  });
});

describe("periodsBetween", () => {
  it("lists periods newest first", () => {
    expect(periodsBetween("2026-10-01", "2026-12-07", 2026).map((p) => p.name)).toEqual([
      "December",
      "November",
      "October",
    ]);
  });

  it("returns one period when both dates are in it", () => {
    expect(periodsBetween("2026-12-01", "2026-12-07", 2026)).toHaveLength(1);
  });
});

describe("labels and membership", () => {
  it("formats the range", () => {
    expect(periodRangeLabel({ start: "2026-11-25", end: "2026-12-24" })).toBe("25 Nov – 24 Dec");
  });

  it("includes both ends", () => {
    const p = { start: "2026-11-25", end: "2026-12-24" };
    expect(inPeriod("2026-11-25", p)).toBe(true);
    expect(inPeriod("2026-12-24", p)).toBe(true);
    expect(inPeriod("2026-12-25", p)).toBe(false);
  });
});

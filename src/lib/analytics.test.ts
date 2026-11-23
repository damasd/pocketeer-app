import { describe, expect, it } from "vitest";
import { OTHER_COLOUR, buckets, byCategory, segments, totalIn } from "./analytics";

const stored = [
  { start: "2026-10-26", end: "2026-11-24", name: "November" },
  { start: "2026-11-25", end: "2026-12-24", name: "December" },
];

describe("buckets", () => {
  it("gives the last 8 weeks, Monday to Sunday, ending with this week", () => {
    const b = buckets("week", "2026-12-07", stored, "2026-01-01"); // Monday 7 Dec 2026
    expect(b).toHaveLength(8);
    expect(b[7]).toMatchObject({ start: "2026-12-07", end: "2026-12-13", label: "7/12", name: "Week of 7 Dec" });
    expect(b[0].start).toBe("2026-10-19");
  });

  it("gives 12 pay periods, filling older ones by the 25th rule", () => {
    const b = buckets("month", "2026-12-07", stored, "2026-11-01");
    expect(b).toHaveLength(12);
    expect(b[11]).toMatchObject({ start: "2026-11-25", label: "D", name: "December" });
    expect(b[10].name).toBe("November");
    expect(b[9].end).toBe("2026-10-25"); // rule-built period ends the day before the stored one
  });

  it("gives one bar per year from the oldest transaction", () => {
    expect(buckets("year", "2026-12-07", stored, "2024-05-01").map((b) => b.label)).toEqual(["2024", "2025", "2026"]);
  });

  it("gives every pay period since the oldest transaction for all time", () => {
    const b = buckets("all", "2026-12-07", stored, "2026-09-30");
    expect(b.map((x) => x.name)).toEqual(["October", "November", "December"]);
  });

  it("leaves out future periods", () => {
    const withNext = [...stored, { start: "2026-12-25", end: "2027-01-24", name: "January 2027" }];
    expect(buckets("all", "2026-12-07", withNext, "2026-11-30").at(-1)?.name).toBe("December");
  });
});

const moves = [
  { type: "expense" as const, amount: 35000, date: "2026-12-01", categoryId: "food2" },
  { type: "expense" as const, amount: 45000, date: "2026-12-02", categoryId: "food" },
  { type: "expense" as const, amount: 15000, date: "2026-12-03", categoryId: "food2" },
  { type: "expense" as const, amount: 99000, date: "2026-11-20", categoryId: "food" },
  { type: "income" as const, amount: 8500000, date: "2026-11-25", categoryId: "salary" },
  { type: "saving_deposit" as const, amount: 500000, date: "2026-12-01", categoryId: "gold" },
  { type: "saving_withdraw" as const, amount: 200000, date: "2026-12-05", categoryId: "gold" },
  { type: "saving_withdraw" as const, amount: 100000, date: "2026-12-05", categoryId: "crypto" },
  { type: "transfer" as const, amount: 200000, date: "2026-12-01", categoryId: null },
];
const dec = { start: "2026-11-25", end: "2026-12-24" };

describe("totals and split", () => {
  it("adds up each view inside the bucket only", () => {
    expect(totalIn("expense", moves, dec)).toBe(95000);
    expect(totalIn("income", moves, dec)).toBe(8500000);
    expect(totalIn("saving", moves, dec)).toBe(200000); // 500k − 200k − 100k
  });

  it("splits by category, biggest first, dropping net withdrawals", () => {
    expect(byCategory("expense", moves, dec)).toEqual([
      { categoryId: "food2", amount: 50000 },
      { categoryId: "food", amount: 45000 },
    ]);
    expect(byCategory("saving", moves, dec)).toEqual([{ categoryId: "gold", amount: 300000 }]);
  });
});

describe("segments", () => {
  it("keeps the top 5 and groups the rest as Other", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g"].map((id, i) => ({ categoryId: id, amount: 700 - i * 100 }));
    const s = segments(items);
    expect(s).toHaveLength(6);
    expect(s[0]).toMatchObject({ key: "a", colour: "#D1FC00" });
    expect(s[5]).toMatchObject({ key: "other", categoryIds: ["f", "g"], amount: 300, colour: OTHER_COLOUR });
    expect(s.reduce((n, x) => n + x.amount, 0)).toBe(2800);
  });

  it("has no Other when there are five or fewer", () => {
    expect(segments([{ categoryId: "a", amount: 1 }])).toHaveLength(1);
  });
});

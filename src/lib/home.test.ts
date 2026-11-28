import { describe, expect, it } from "vitest";
import { netSaved, recentFrom, remainingBudget, savingChange, share, topTiles, type Tile } from "./home";

describe("remainingBudget", () => {
  it("is budget minus spent, with the share used", () => {
    expect(remainingBudget(8500000, 5260000)).toEqual({ remaining: 3240000, percent: 62, barPercent: 62, over: false });
  });

  it("goes negative and caps the bar when over", () => {
    expect(remainingBudget(1000000, 1250000)).toEqual({ remaining: -250000, percent: 125, barPercent: 100, over: true });
  });

  it("handles no budget", () => {
    expect(remainingBudget(0, 0)).toEqual({ remaining: 0, percent: 0, barPercent: 0, over: false });
  });
});

describe("topTiles", () => {
  const t = (id: string, percent: number, amount = 0, of = 100, kind: Tile["kind"] = "expense"): Tile => ({
    id,
    kind,
    amount,
    of,
    percent,
  });

  it("keeps the six with the most spent", () => {
    const tiles = [
      t("a", 10, 100),
      t("b", 20, 900),
      t("c", 90, 800),
      t("d", 5, 700),
      t("e", 70, 600),
      t("f", 60, 500),
      t("g", 99, 400),
    ];
    expect(topTiles(tiles).map((x) => x.id)).toEqual(["b", "c", "d", "e", "f", "g"]);
  });

  it("keeps spending with no budget, leaves out nothing spent and nothing planned", () => {
    expect(topTiles([t("empty", 0, 0, 0), t("noBudget", 0, 300, 0), t("planned", 0, 0, 100)]).map((x) => x.id)).toEqual([
      "noBudget",
      "planned",
    ]);
  });

  it("breaks ties by the higher share used", () => {
    expect(topTiles([t("low", 10, 500), t("high", 80, 500)]).map((x) => x.id)).toEqual(["high", "low"]);
  });
});

describe("share", () => {
  it("rounds and never goes below zero", () => {
    expect(share(500000, 1000000)).toBe(50);
    expect(share(-100, 1000)).toBe(0);
    expect(share(10, 0)).toBe(0);
  });
});

describe("recentFrom", () => {
  it("counts today as the first of the days", () => {
    expect(recentFrom("2026-12-07")).toBe("2026-12-05");
    expect(recentFrom("2026-03-01")).toBe("2026-02-27");
    expect(recentFrom("2026-12-07", 1)).toBe("2026-12-07");
  });
});

describe("netSaved", () => {
  const moves = [
    { type: "saving_deposit", amount: 500000, date: "2026-11-26" },
    { type: "saving_withdraw", amount: 100000, date: "2026-12-01" },
    { type: "expense", amount: 70000, date: "2026-12-01" },
    { type: "saving_deposit", amount: 300000, date: "2026-11-20" }, // last month
  ];
  it("adds deposits and takes off withdrawals inside the dates only", () => {
    expect(netSaved(moves, { start: "2026-11-25", end: "2026-12-24" })).toBe(400000);
    expect(netSaved(moves, { start: "2026-10-26", end: "2026-11-24" })).toBe(300000);
  });
});

describe("savingChange", () => {
  it("says up or down, by how much and by what share of last month", () => {
    expect(savingChange(400000, 300000)).toEqual({ trend: "up", diff: 100000, percent: 33 });
    expect(savingChange(150000, 300000)).toEqual({ trend: "down", diff: 150000, percent: 50 });
    expect(savingChange(200000, 200000)).toEqual({ trend: "same", diff: 0, percent: 0 });
  });
  it("gives no percentage when last month saved nothing", () => {
    expect(savingChange(250000, 0)).toEqual({ trend: "up", diff: 250000, percent: null });
  });
});

import { describe, expect, it } from "vitest";
import { recentFrom, remainingBudget, share, topTiles, type Tile } from "./home";

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

  it("keeps the six with the highest share used", () => {
    const tiles = [t("a", 10), t("b", 112), t("c", 95), t("d", 81), t("e", 76), t("f", 60), t("g", 50, 0, 100, "saving")];
    expect(topTiles(tiles).map((x) => x.id)).toEqual(["b", "c", "d", "e", "f", "g"]);
  });

  it("leaves out anything with nothing planned", () => {
    expect(topTiles([t("a", 0, 0, 0), t("b", 20)]).map((x) => x.id)).toEqual(["b"]);
  });

  it("breaks ties by the bigger amount", () => {
    expect(topTiles([t("small", 50, 100), t("big", 50, 900)]).map((x) => x.id)).toEqual(["big", "small"]);
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

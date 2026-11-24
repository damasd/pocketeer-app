import { describe, expect, it } from "vitest";
import { estimatedSlots, measuredSlots, saveSlots } from "./card-handoff";

describe("estimatedSlots", () => {
  it("matches the Accounts page measured at 390 px wide (2 spending, then a saving card)", () => {
    const slots = estimatedSlots([{ group: "spending" }, { group: "spending" }, { group: "saving" }], 2, 390, 8);
    expect(slots.map((s) => s.y)).toEqual([235, 467, 753]);
    expect(slots[0]).toMatchObject({ x: 20, width: 350 });
  });

  it("moves down with the safe area at the top", () => {
    const [first] = estimatedSlots([{ group: "spending" }], 1, 390, 59);
    expect(first.y).toBe(286);
  });

  it("centres the page on wide screens", () => {
    const [first] = estimatedSlots([{ group: "spending" }], 1, 1280, 8);
    expect(first).toMatchObject({ x: 420, width: 440 });
  });

  it("leaves room for the empty Spending note when there are only saving cards", () => {
    const [first] = estimatedSlots([{ group: "saving" }], 0, 390, 8);
    expect(first.y).toBe(235 + 60 + 32 + 38);
  });
});

describe("measuredSlots", () => {
  it("uses measurements only for the same window width and when every card was measured", () => {
    saveSlots(390, { a: { x: 20, y: 240, width: 350 }, b: { x: 20, y: 472, width: 350 } });
    expect(measuredSlots(["a", "b"], 390)?.map((s) => s.y)).toEqual([240, 472]);
    expect(measuredSlots(["a", "b"], 430)).toBeNull();
    expect(measuredSlots(["a", "c"], 390)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { budgetLine, goalPlan, leftToPlan } from "./plan";

describe("budgetLine", () => {
  it("shows what is left", () => {
    expect(budgetLine(800000, 650000)).toMatchObject({ percent: 81, barPercent: 81, over: false, remaining: 150000 });
  });

  it("marks over budget and caps the bar", () => {
    expect(budgetLine(750000, 840000)).toMatchObject({ percent: 112, barPercent: 100, over: true, remaining: 90000 });
  });

  it("treats exactly on budget as not over", () => {
    expect(budgetLine(350000, 350000)).toMatchObject({ over: false, remaining: 0, percent: 100 });
  });

  it("handles no budget", () => {
    expect(budgetLine(0, 0)).toMatchObject({ percent: 0, over: false, remaining: 0 });
    expect(budgetLine(0, 30000)).toMatchObject({ percent: 100, over: true, remaining: 30000 });
  });
});

describe("goalPlan", () => {
  const period = { start: "2026-11-25", end: "2026-12-24" };

  it("spreads what is missing over the periods left, this one included", () => {
    // December 2026 to December 2027 = 13 periods; 15M target, 3M saved before.
    const plan = goalPlan({
      target: 15000000,
      targetDate: "2027-12-20",
      period,
      moves: [
        { type: "saving_deposit", amount: 3000000, date: "2026-10-01" },
        { type: "saving_deposit", amount: 500000, date: "2026-12-01" },
      ],
    });
    expect(plan.periodsLeft).toBe(13);
    expect(plan.neededThisPeriod).toBe(Math.ceil(12000000 / 13));
    expect(plan.thisPeriod).toBe(500000);
    expect(plan.saved).toBe(3500000);
    expect(plan.done).toBe(false);
    expect(plan.percent).toBe(23);
  });

  it("counts withdrawals against the goal", () => {
    const plan = goalPlan({
      target: 1000000,
      targetDate: "2026-12-20",
      period,
      moves: [
        { type: "saving_deposit", amount: 600000, date: "2026-12-01" },
        { type: "saving_withdraw", amount: 100000, date: "2026-12-02" },
      ],
    });
    expect(plan.thisPeriod).toBe(500000);
    expect(plan.neededThisPeriod).toBe(1000000);
  });

  it("needs nothing once the target is reached, and is done", () => {
    const plan = goalPlan({
      target: 1000000,
      targetDate: "2027-06-01",
      period,
      moves: [{ type: "saving_deposit", amount: 1200000, date: "2026-01-01" }],
    });
    expect(plan.neededThisPeriod).toBe(0);
    expect(plan.done).toBe(true);
    expect(plan.percent).toBe(100);
  });

  it("asks for everything this period when the date has passed", () => {
    const plan = goalPlan({ target: 1000000, targetDate: "2026-01-01", period, moves: [] });
    expect(plan.periodsLeft).toBe(1);
    expect(plan.neededThisPeriod).toBe(1000000);
  });
});

describe("leftToPlan", () => {
  it("is income minus budgets minus goals", () => {
    expect(leftToPlan(8900000, 8500000, 2300000)).toBe(-1900000);
    expect(leftToPlan(10000000, 6000000, 2000000)).toBe(2000000);
  });
});

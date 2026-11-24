// Budget and goal maths for the Plan tab (brief: Core concepts, Plan). Whole rupiah only.

import type { TransactionType } from "@/lib/balances";
import { periodsUntil } from "@/lib/periods";

export type BudgetLine = {
  budget: number;
  spent: number;
  /** Share used, rounded percent (spending with no budget counts as 100). */
  percent: number;
  /** Width of the bar, 0–100. */
  barPercent: number;
  over: boolean;
  /** Left to spend, or how much over when `over`. */
  remaining: number;
};

export function budgetLine(budget: number, spent: number): BudgetLine {
  const percent = budget > 0 ? Math.round((spent / budget) * 100) : spent > 0 ? 100 : 0;
  const over = spent > budget;
  return {
    budget,
    spent,
    percent,
    barPercent: Math.min(100, percent),
    over,
    remaining: over ? spent - budget : budget - spent,
  };
}

type SavingMove = { type: TransactionType; amount: number; date: string };

export type GoalPlan = {
  /** Saved toward the goal so far (deposits − withdrawals, all time). */
  saved: number;
  /** Needed in the given period to reach the target on time (rounded up to a whole rupiah). */
  neededThisPeriod: number;
  /** Set aside in the given period (deposits − withdrawals). */
  thisPeriod: number;
  done: boolean;
  /** Progress toward the target, 0–100. */
  percent: number;
  periodsLeft: number;
};

/**
 * What a goal needs this period: the amount still missing at the start of the period,
 * spread evenly over the periods left until the target date (this one included).
 */
export function goalPlan(input: {
  target: number;
  targetDate: string;
  period: { start: string; end: string };
  moves: readonly SavingMove[]; // this category's saving transactions
}): GoalPlan {
  let saved = 0;
  let before = 0;
  let thisPeriod = 0;
  for (const m of input.moves) {
    const sign = m.type === "saving_deposit" ? 1 : m.type === "saving_withdraw" ? -1 : 0;
    if (!sign) continue;
    saved += sign * m.amount;
    if (m.date < input.period.start) before += sign * m.amount;
    else if (m.date <= input.period.end) thisPeriod += sign * m.amount;
  }
  const periodsLeft = periodsUntil(input.period.start, input.targetDate);
  const missing = Math.max(0, input.target - before);
  const neededThisPeriod = Math.ceil(missing / periodsLeft);
  return {
    saved,
    neededThisPeriod,
    thisPeriod,
    done: thisPeriod >= neededThisPeriod,
    percent: Math.max(0, Math.min(100, Math.round((saved / input.target) * 100))),
    periodsLeft,
  };
}

export type TargetLine = {
  target: number;
  actual: number;
  /** Width of the bar, 0–100. */
  barPercent: number;
  /** Target reached (only when there is a target). */
  reached: boolean;
  /** Still to come, or how much beyond the target once reached. */
  remaining: number;
};

/** Progress toward an amount you hope to reach (expected income, a saving target this period). */
export function targetLine(target: number, actual: number): TargetLine {
  const reached = target > 0 && actual >= target;
  const barPercent = target > 0 ? Math.max(0, Math.min(100, Math.round((actual / target) * 100))) : 0;
  return { target, actual, barPercent, reached, remaining: reached ? actual - target : Math.max(0, target - actual) };
}

/** Share of a goal saved so far, 0–100 (rounded down so 100 means really reached). */
export function goalPercent(saved: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.floor((saved / target) * 100)));
}

/** Expected income − expense budget − saving target (negative = planned more than you expect). */
export function leftToPlan(expectedIncome: number, expenseBudget: number, savingTarget: number): number {
  return expectedIncome - expenseBudget - savingTarget;
}

/** The saving target for one goal in a period: what you typed, else what the goal needs then. */
export function savingTargetFor(typed: number | null, suggested: number | null): number | null {
  return typed !== null && typed > 0 ? typed : suggested;
}

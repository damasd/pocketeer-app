// Home screen maths (brief: Screens > Home). Pure and tested in home.test.ts.

/** Remaining budget this period: total expense budget − all expenses in the period. */
export function remainingBudget(budget: number, spent: number) {
  const remaining = budget - spent;
  const percent = budget > 0 ? Math.round((spent / budget) * 100) : spent > 0 ? 100 : 0;
  return { remaining, percent, barPercent: Math.min(100, percent), over: remaining < 0 };
}

export type Tile = {
  id: string;
  kind: "expense" | "saving";
  /** Expense: spent this period. Saving: set aside this period. */
  amount: number;
  /** Expense: budget. Saving: needed this period for its goal. */
  of: number;
  percent: number;
};

/**
 * The tiles Home shows when none are picked: the `count` with the most spent so far this period,
 * ties by the higher share used. Items with nothing spent and nothing planned are left out.
 */
export function topTiles(items: readonly Tile[], count = 6): Tile[] {
  return items
    .filter((t) => t.amount > 0 || t.of > 0)
    .sort((a, b) => b.amount - a.amount || b.percent - a.percent)
    .slice(0, count);
}

/** Share of a plan used, rounded percent. */
export function share(amount: number, of: number): number {
  return of > 0 ? Math.max(0, Math.round((amount / of) * 100)) : 0;
}

/** First day of the last `days` days, counting today (YYYY-MM-DD, local). */
export function recentFrom(today: string, days = 3): string {
  const [y, m, d] = today.split("-").map(Number);
  const start = new Date(y, m - 1, d - (days - 1));
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

type SavingMove = { type: string; amount: number; date: string };

/** Net amount saved between two dates (inclusive): saving deposits − saving withdrawals. */
export function netSaved(moves: readonly SavingMove[], range: { start: string; end: string }): number {
  return moves.reduce((n, t) => {
    if (t.date < range.start || t.date > range.end) return n;
    if (t.type === "saving_deposit") return n + t.amount;
    if (t.type === "saving_withdraw") return n - t.amount;
    return n;
  }, 0);
}

/**
 * This month's saving against last month's: up or down by how much, and by what share of last
 * month's (null when last month saved nothing, so there's no fair percentage).
 */
export function savingChange(now: number, before: number): { trend: "up" | "down" | "same"; diff: number; percent: number | null } {
  const diff = now - before;
  const trend = diff > 0 ? "up" : diff < 0 ? "down" : "same";
  const percent = before > 0 ? Math.round((Math.abs(diff) / before) * 100) : null;
  return { trend, diff: Math.abs(diff), percent };
}

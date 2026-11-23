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
 * The tiles Home shows: the `count` with the highest share used (expense budgets and saving
 * targets together), ties by the bigger amount. Items with nothing planned are left out.
 */
export function topTiles(items: readonly Tile[], count = 6): Tile[] {
  return items
    .filter((t) => t.of > 0)
    .sort((a, b) => b.percent - a.percent || b.amount - a.amount)
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

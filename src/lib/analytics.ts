// Analytics maths (brief: Screens > Analytics; confirmed decisions on time ranges).
// Month = one bar per pay period (last 12), Quarter = this year's four (three pay periods each),
// Year = one bar per year.

import type { TransactionType } from "@/lib/balances";
import { periodFor, type Period } from "@/lib/periods";

export type AnalyticsType = "expense" | "income" | "saving";
export type Range = "month" | "quarter" | "year";

export type Bucket = {
  key: string;
  start: string;
  end: string;
  /** Short label under the bar, e.g. "D", "Q4 '26", "2026". */
  label: string;
  /** Name for headings, e.g. "December", "Q4 2026", "2026". */
  name: string;
};


const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const periodBucket = (p: Pick<Period, "start" | "end" | "name">): Bucket => ({
  key: p.start,
  start: p.start,
  end: p.end,
  label: p.name.charAt(0),
  name: p.name,
});

/**
 * Buckets for a range, oldest first, ending with the one containing today.
 * `periods` are the stored pay periods (any order); older months are filled in by the 25th rule.
 */
export function buckets(range: Range, today: string, periods: readonly Pick<Period, "start" | "end" | "name">[], oldest: string): Bucket[] {
  if (range === "quarter") {
    // This year's four quarters, three pay periods each by the month they're named after
    // (Jan–Mar is Q1). Later quarters show too, with what is planned for them.
    const named = (y: number, m0: number) => {
      const date = `${y}-${String(m0 + 1).padStart(2, "0")}-15`; // always inside the period named after that month
      return periods.find((p) => p.start <= date && date <= p.end) ?? periodFor(date);
    };
    const y = Number(periodFor(today).end.slice(0, 4));
    return [0, 1, 2, 3].map((q) => ({
      key: `${y}-Q${q + 1}`,
      start: named(y, q * 3).start,
      end: named(y, q * 3 + 2).end,
      label: `Q${q + 1}`,
      name: `Q${q + 1} ${y}`,
    }));
  }

  if (range === "year") {
    const first = Number((oldest < today ? oldest : today).slice(0, 4));
    const last = Number(today.slice(0, 4));
    return Array.from({ length: last - first + 1 }, (_, i) => {
      const y = String(first + i);
      return { key: y, start: `${y}-01-01`, end: `${y}-12-31`, label: y, name: y };
    });
  }

  // Pay periods up to today, oldest first.
  const stored = [...periods].filter((p) => p.start <= today).sort((a, b) => a.start.localeCompare(b.start));
  const list = stored.length ? stored : [periodFor(today)];
  const filled = list.slice(-12);
  while (filled.length < 12) filled.unshift(periodFor(addDays(filled[0].start, -1)));
  return filled.map(periodBucket);
}

type Move = { type: TransactionType; amount: number; date: string; categoryId: string | null };

/** Signed contribution of a transaction to a view: expenses, income, or net saving. */
function contribution(type: AnalyticsType, t: Move): number {
  if (type === "saving") return t.type === "saving_deposit" ? t.amount : t.type === "saving_withdraw" ? -t.amount : 0;
  return t.type === type ? t.amount : 0;
}

export function totalIn(type: AnalyticsType, moves: readonly Move[], b: Pick<Bucket, "start" | "end">): number {
  return moves.reduce((s, t) => (t.date >= b.start && t.date <= b.end ? s + contribution(type, t) : s), 0);
}

/** Amount per category in a bucket, biggest first; categories at zero or below are left out. */
export function byCategory(
  type: AnalyticsType,
  moves: readonly Move[],
  b: Pick<Bucket, "start" | "end">,
): { categoryId: string; amount: number }[] {
  const sums = new Map<string, number>();
  for (const t of moves) {
    if (!t.categoryId || t.date < b.start || t.date > b.end) continue;
    const c = contribution(type, t);
    if (c) sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + c);
  }
  return [...sums]
    .filter(([, amount]) => amount > 0)
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Donut colours: lime for the biggest, then black to light grey; "Other" is the lightest. */
// CSS variables so the donut follows light and dark mode (used through style, not SVG attributes).
export const SEGMENT_COLOURS = ["var(--color-accent)", "var(--color-select)", "var(--color-ink)", "var(--color-muted)", "var(--color-chart-idle)"];
export const OTHER_COLOUR = "var(--color-line)";

export type Segment = { key: string; categoryIds: string[]; amount: number; colour: string; share: number };

/** Top 5 categories plus "Other" (brief: 14 shades of grey can't be told apart). */
export function segments(items: readonly { categoryId: string; amount: number }[], top = 5): Segment[] {
  const total = items.reduce((s, i) => s + i.amount, 0);
  const pct = (a: number) => (total > 0 ? Math.round((a / total) * 100) : 0);
  const head = items.slice(0, top).map((i, n) => ({
    key: i.categoryId,
    categoryIds: [i.categoryId],
    amount: i.amount,
    colour: SEGMENT_COLOURS[n],
    share: pct(i.amount),
  }));
  const rest = items.slice(top);
  if (!rest.length) return head;
  const amount = rest.reduce((s, i) => s + i.amount, 0);
  return [...head, { key: "other", categoryIds: rest.map((i) => i.categoryId), amount, colour: OTHER_COLOUR, share: pct(amount) }];
}

/**
 * What was planned for a bucket: the plan of every stored pay period that starts inside it
 * (budgets for expenses, expected income, saving targets), added up.
 */
export function plannedIn(
  bucket: Pick<Bucket, "start" | "end">,
  periods: readonly { id: string; start: string }[],
  planOf: (periodId: string) => number,
): number {
  return periods.filter((p) => p.start >= bucket.start && p.start <= bucket.end).reduce((s, p) => s + planOf(p.id), 0);
}

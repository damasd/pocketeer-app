// Pure helpers for the History screen: filtering, grouping by day and amount labels.

import type { TransactionType } from "@/lib/balances";
import { dateLabel } from "@/lib/log";
import { formatRupiah } from "@/lib/money";
import { inPeriod } from "@/lib/periods";

export type TypeFilter = "all" | "expense" | "income" | "transfer" | "saving";

export type HistoryItem = {
  id: string;
  date: string;
  createdAt: string;
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  note: string | null;
};

export type HistoryFilter = {
  period: { start: string; end: string } | null; // null = all time
  accountId: string | null; // matches money leaving or arriving
  categoryId: string | null;
  type: TypeFilter;
  /** Free text matched against note, category name and account names. */
  query: string;
};

export const NO_FILTER: HistoryFilter = { period: null, accountId: null, categoryId: null, type: "all", query: "" };

export function matchesType(type: TransactionType, filter: TypeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "saving") return type === "saving_deposit" || type === "saving_withdraw";
  return type === filter;
}

export function filterHistory<T extends HistoryItem>(
  items: readonly T[],
  f: HistoryFilter,
  names: { account: (id: string | null) => string; category: (id: string | null) => string },
): T[] {
  const q = f.query.trim().toLowerCase();
  return items.filter((t) => {
    if (f.period && !inPeriod(t.date, f.period)) return false;
    if (f.accountId && t.accountId !== f.accountId && t.toAccountId !== f.accountId) return false;
    if (f.categoryId && t.categoryId !== f.categoryId) return false;
    if (!matchesType(t.type, f.type)) return false;
    if (q) {
      const haystack = [t.note ?? "", names.category(t.categoryId), names.account(t.accountId), names.account(t.toAccountId)]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** Group by day, newest day first; within a day, newest entry first. */
export function groupByDay<T extends HistoryItem>(items: readonly T[], today?: string): { date: string; label: string; items: T[] }[] {
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const groups: { date: string; label: string; items: T[] }[] = [];
  for (const t of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else groups.push({ date: t.date, label: dateLabel(t.date, today), items: [t] });
  }
  return groups;
}

/** Expense "−Rp 35.000", income "+Rp 8.500.000", transfers and savings unsigned (mockup). */
export function signedAmount(type: TransactionType, amount: number): string {
  if (type === "expense") return `−${formatRupiah(amount)}`;
  if (type === "income") return `+${formatRupiah(amount)}`;
  return formatRupiah(amount);
}

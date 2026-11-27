"use client";

import Link from "next/link";
import { SubHeader } from "@/components/screen";
import { Check } from "lucide-react";
import { useMoney } from "@/components/amount";
import { BudgetTileBody } from "@/components/budget-tile";
import { showToast } from "@/components/toast";
import { ErrorNote } from "@/components/ui";
import { useBudgets } from "@/lib/budgets";
import { useCategories } from "@/lib/categories";
import { errorMessage } from "@/lib/errors";
import { setHomeTile, useHomeTiles } from "@/lib/home-tiles";
import { periodFor, periodRangeLabel } from "@/lib/periods";
import { periodOf, usePeriods } from "@/lib/periods-store";
import { useTransactions } from "@/lib/transactions";
import { useToday } from "@/lib/use-today";

/**
 * Budget page (from Home's "See all"): every expense category's tile for this pay period. Tap a
 * tile to show it on Home or take it off; with none chosen, Home shows the six used most.
 */
export function BudgetsScreen() {
  const today = useToday();
  const { money } = useMoney();
  const categories = useCategories();
  const periods = usePeriods();
  const budgets = useBudgets();
  const transactions = useTransactions();
  const homeTiles = useHomeTiles();

  const stored = today ? periodOf(periods.data ?? [], today) : null;
  const period = stored ?? (today ? periodFor(today) : null);
  const chosen = homeTiles.data ?? [];
  const list = (categories.data ?? []).filter((c) => c.kind === "expense" && !c.archived);
  const budgetOf = (id: string) =>
    (budgets.data ?? []).find((b) => stored !== null && b.periodId === stored.id && b.categoryId === id)?.amount ?? 0;
  const spentOf = (id: string) =>
    period
      ? (transactions.data ?? [])
          .filter((t) => t.type === "expense" && t.categoryId === id && t.date >= period.start && t.date <= period.end)
          .reduce((n, t) => n + t.amount, 0)
      : 0;

  const loading = !today || (categories.status === "loading" && !categories.data);
  const loadError = [categories, budgets, transactions].find((s) => s.status === "error");

  async function toggle(id: string, name: string) {
    const on = !chosen.includes(id);
    try {
      await setHomeTile(id, on);
    } catch (e) {
      showToast({ message: errorMessage(e, `Could not update ${name}`), tone: "error" });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SubHeader title="Budget" back="/" backLabel="Back to Home" />

      <div className="flex flex-col gap-0.5">
        <p className="text-body font-semibold">
          {period ? `${period.name} · ${periodRangeLabel(period)}` : "This month"}
        </p>
        <p className="text-meta text-muted" aria-live="polite">
          {chosen.length
            ? `${chosen.length} on Home. Tap a tile to add or remove it.`
            : "Tap a tile to show it on Home. Until you pick, Home shows the six used most."}
        </p>
      </div>

      {loadError && loadError.status === "error" && <ErrorNote>{loadError.message}</ErrorNote>}

      {loading ? (
        <ul aria-hidden className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="h-[150px] rounded-tile bg-card" />
          ))}
        </ul>
      ) : list.length === 0 ? (
        <p className="rounded-card bg-card px-5 py-4 text-meta font-medium text-muted">No expense categories yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {list.map((c) => {
            const on = chosen.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={`${c.name}. ${on ? "On Home, tap to remove" : "Not on Home, tap to add"}`}
                  onClick={() => toggle(c.id, c.name)}
                  className={`relative flex w-full flex-col gap-2 rounded-tile bg-card p-3 text-left transition-shadow duration-150 ${
                    on ? "ring-2 ring-ink" : "ring-1 ring-line"
                  }`}
                >
                  <BudgetTileBody name={c.name} icon={c.icon} spent={spentOf(c.id)} budget={budgetOf(c.id)} money={money} onCard />
                  {on && (
                    <span
                      aria-hidden
                      className="absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-full bg-lime text-ink"
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/plan"
        className="flex h-12 items-center justify-center rounded-full border border-line bg-card text-body font-semibold"
      >
        Change budgets in Target
      </Link>
    </div>
  );
}

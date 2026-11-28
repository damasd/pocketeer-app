"use client";

import Link from "next/link";
import { useState } from "react";
import { SubHeader } from "@/components/screen";
import { Check, LayoutGrid } from "lucide-react";
import { useMoney } from "@/components/amount";
import { BudgetTileBody } from "@/components/budget-tile";
import { showToast } from "@/components/toast";
import { ErrorNote } from "@/components/ui";
import { useBudgets } from "@/lib/budgets";
import { useCategories } from "@/lib/categories";
import { errorMessage } from "@/lib/errors";
import { share, topTiles } from "@/lib/home";
import { setHomeTile, useHomeTiles } from "@/lib/home-tiles";
import { periodFor } from "@/lib/periods";
import { periodOf, usePeriods } from "@/lib/periods-store";
import { useTransactions } from "@/lib/transactions";
import { useToday } from "@/lib/use-today";

/**
 * Budget page (from Home's "See all"): every expense category's tile for this pay period. The tiles
 * Home shows have a lime outline: the ones picked here, or else the six with the most spent.
 * "Choose tiles for Home" turns the tiles into on/off switches until Done.
 */
/** Home has room for this many budget tiles. */
const MAX_ON_HOME = 6;

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

  // What Home shows: the picked tiles, or its automatic pick (the same rule as Home).
  const auto = topTiles(
    list.map((c) => {
      const amount = spentOf(c.id);
      const of = budgetOf(c.id);
      return { id: c.id, kind: "expense" as const, amount, of, percent: share(amount, of) };
    }),
  ).map((t) => t.id);
  const onHome = chosen.length ? chosen : auto;
  const [choosing, setChoosing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Home has room for six tiles; once six are picked the others wait until one is removed.
  const full = onHome.length >= MAX_ON_HOME;

  const loading = !today || (categories.status === "loading" && !categories.data);
  const loadError = [categories, budgets, transactions].find((s) => s.status === "error");

  // The first change starts from what Home shows now (the automatic six), not from an empty pick.
  async function toggle(id: string, name: string) {
    if (saving) return;
    if (!onHome.includes(id) && full) {
      showToast({ message: `Home shows up to ${MAX_ON_HOME} tiles. Remove one first.` });
      return;
    }
    const next = onHome.includes(id) ? onHome.filter((x) => x !== id) : [...onHome, id];
    const add = next.filter((x) => !chosen.includes(x));
    const remove = chosen.filter((x) => !next.includes(x));
    setSaving(true);
    try {
      for (const x of add) await setHomeTile(x, true);
      for (const x of remove) await setHomeTile(x, false);
    } catch (e) {
      showToast({ message: errorMessage(e, `Could not update ${name}`), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SubHeader title="Budget" back="/" backLabel="Back to Home" />

      {/* Full-width pill: start picking which tiles Home shows; Done (lime) ends it. */}
      <button
        type="button"
        aria-pressed={choosing}
        onClick={() => setChoosing((c) => !c)}
        disabled={loading || list.length === 0}
        className={`flex h-12 items-center justify-center gap-2 rounded-full text-body font-semibold transition-colors duration-150 disabled:opacity-50 ${
          choosing ? "bg-lime font-bold text-ink" : "border border-line bg-card text-ink"
        }`}
      >
        {choosing ? (
          <>
            <Check aria-hidden size={18} strokeWidth={2.5} />
            Done
          </>
        ) : (
          <>
            <LayoutGrid aria-hidden size={18} strokeWidth={2} />
            Choose tiles for Home
          </>
        )}
      </button>

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
            const on = onHome.includes(c.id);
            const tile = `relative flex w-full flex-col gap-2 rounded-tile bg-card p-3 text-left transition-shadow duration-150 ${
              on ? "ring-[3px] ring-lime" : "ring-1 ring-line"
            }`;
            const body = (
              <>
                <BudgetTileBody name={c.name} icon={c.icon} spent={spentOf(c.id)} budget={budgetOf(c.id)} money={money} onCard />
                {/* Lime badge with a black tick: the outline's meaning without relying on colour. */}
                {(on || choosing) && (
                  <span
                    aria-hidden
                    className={`absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full ${
                      on ? "bg-lime text-ink" : "border-2 border-line bg-card"
                    }`}
                  >
                    {on && <Check size={14} strokeWidth={3} />}
                  </span>
                )}
              </>
            );
            return (
              <li key={c.id}>
                {choosing ? (
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-disabled={!on && full}
                    aria-label={`${c.name}. ${on ? "On Home, tap to remove" : full ? `Home already has ${MAX_ON_HOME}` : "Not on Home, tap to add"}`}
                    onClick={() => toggle(c.id, c.name)}
                    className={`${tile} ${!on && full ? "opacity-50" : "active:scale-[0.98]"}`}
                  >
                    {body}
                  </button>
                ) : (
                  <div className={tile}>
                    {body}
                    {on && <span className="sr-only">On Home</span>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* A quiet text link: still a 44 px tap target. */}
      <Link
        href="/plan"
        className="flex h-11 items-center justify-center self-center px-3 text-meta font-medium text-muted underline underline-offset-4 hover:text-ink"
      >
        Change budgets in Target
      </Link>
    </div>
  );
}

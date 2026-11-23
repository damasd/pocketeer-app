"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Plus } from "lucide-react";
import { Segmented } from "@/components/segmented";
import { Sheet } from "@/components/sheet";
import { showToast } from "@/components/toast";
import { ErrorNote } from "@/components/ui";
import { copyBudgets, setBudget, useBudgets } from "@/lib/budgets";
import { useCategories, type Category } from "@/lib/categories";
import { errorMessage } from "@/lib/errors";
import { useGoals, type Goal } from "@/lib/goals";
import { formatRupiah, groupThousands, parseRupiahInput } from "@/lib/money";
import { periodRangeLabel } from "@/lib/periods";
import { coverPeriodsFrom, periodOf, usePeriods, type StoredPeriod } from "@/lib/periods-store";
import { budgetLine, goalPlan, leftToPlan } from "@/lib/plan";
import { useTransactions, type Transaction } from "@/lib/transactions";
import { useToday } from "@/lib/use-today";
import { GoalForm } from "./goal-form";

type Tab = "budget" | "goals";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const byDate = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return `by ${MONTHS[m - 1]} ${y}`;
};

/** Days from today to the period's last day, counting today (only for the current period). */
function daysLeft(p: StoredPeriod, today: string): number | null {
  if (today < p.start || today > p.end) return null;
  const [y1, m1, d1] = today.split("-").map(Number);
  const [y2, m2, d2] = p.end.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
}

/** Plan tab: Budget & goals (mockup Budgets.dc.html). Waits for the browser to know today's date. */
export function PlanScreen() {
  const today = useToday();
  if (!today) {
    return (
      <header className="pt-3">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Budget &amp; goals</h1>
      </header>
    );
  }
  return <PlanBody today={today} />;
}

function PlanBody({ today }: { today: string }) {
  const periods = usePeriods();
  const budgets = useBudgets();
  const goals = useGoals();
  const categories = useCategories();
  const transactions = useTransactions();

  const [tab, setTab] = useState<Tab>("budget");
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [goalSheet, setGoalSheet] = useState<Goal | "new" | null>(null);

  const txs = useMemo(() => transactions.data ?? [], [transactions.data]);
  const list = periods.data ?? []; // newest first
  const current = periodOf(list, today);
  const period = list.find((p) => p.id === periodId) ?? current ?? list[0] ?? null;
  const index = period ? list.indexOf(period) : -1;
  const older = index >= 0 ? (list[index + 1] ?? null) : null;
  const newer = index > 0 ? list[index - 1] : null;

  // Periods reach back to the oldest transaction.
  const oldest = txs.length ? txs[txs.length - 1].date : null;
  useEffect(() => {
    coverPeriodsFrom(oldest);
  }, [oldest]);

  const allCategories = useMemo(() => categories.data ?? [], [categories.data]);
  const inPeriod = (t: Transaction) => period !== null && t.date >= period.start && t.date <= period.end;
  const periodTxs = txs.filter(inPeriod);

  const income = periodTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const spentBy = (categoryId: string) =>
    periodTxs.filter((t) => t.type === "expense" && t.categoryId === categoryId).reduce((s, t) => s + t.amount, 0);
  const budgetFor = (categoryId: string) =>
    (budgets.data ?? []).find((b) => b.periodId === period?.id && b.categoryId === categoryId)?.amount ?? 0;

  const expenseRows = allCategories.filter(
    (c) => c.kind === "expense" && (!c.archived || budgetFor(c.id) > 0 || spentBy(c.id) > 0),
  );
  const expenseBudget = expenseRows.reduce((s, c) => s + budgetFor(c.id), 0);

  // Goals are planned against the selected period on the Budget tab, and against today on the Goals tab.
  const goalRows = (goals.data ?? [])
    .map((g) => {
      const category = allCategories.find((c) => c.id === g.categoryId);
      const moves = txs.filter((t) => t.categoryId === g.categoryId);
      return { goal: g, category, moves };
    })
    .filter((r): r is { goal: Goal; category: Category; moves: Transaction[] } => Boolean(r.category));
  const plansFor = (p: StoredPeriod | null) =>
    p
      ? goalRows.map((r) => ({
          ...r,
          plan: goalPlan({ target: r.goal.target, targetDate: r.goal.targetDate, period: p, moves: r.moves }),
        }))
      : [];
  const goalsNeeded = plansFor(period).reduce((s, r) => s + r.plan.neededThisPeriod, 0);
  const left = leftToPlan(income, expenseBudget, goalsNeeded);

  const loadError = [periods, budgets, goals, categories, transactions].find((s) => s.status === "error");
  const loading = !period && periods.status === "loading";

  async function copyFromOlder() {
    if (!period || !older || !budgets.data) return;
    try {
      const undo = await copyBudgets(budgets.data, older.id, period.id);
      showToast({
        message: `Copied from ${older.name}`,
        action: {
          label: "Undo",
          run: async () => {
            try {
              await undo();
              showToast({ message: "Undone" });
            } catch (e) {
              showToast({ message: errorMessage(e, "Could not undo"), tone: "error" });
            }
          },
        },
      });
    } catch (e) {
      showToast({ message: errorMessage(e, "Could not copy"), tone: "error" });
    }
  }

  const olderHasBudgets = Boolean(older && (budgets.data ?? []).some((b) => b.periodId === older.id && b.amount > 0));

  return (
    <div className="flex flex-col gap-4">
      <header className="pt-3">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Budget &amp; goals</h1>
      </header>

      <Segmented
        label="Show"
        surface="card"
        options={[
          { value: "budget", label: "Budget" },
          { value: "goals", label: "Goals" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {loadError && loadError.status === "error" && <ErrorNote>{loadError.message}</ErrorNote>}

      {tab === "budget" ? (
        <>
          <div className="flex h-14 items-center justify-between rounded-full bg-card px-1.5">
            <button
              type="button"
              aria-label={older ? `Previous period, ${older.name}` : "No earlier period"}
              disabled={!older}
              onClick={() => older && setPeriodId(older.id)}
              className="flex size-11 items-center justify-center rounded-full bg-page disabled:opacity-40"
            >
              <ChevronLeft aria-hidden size={16} strokeWidth={2.25} />
            </button>
            <div className="flex flex-col items-center gap-0.5" aria-live="polite">
              <span className="text-[15px] font-bold">{period?.name ?? "…"}</span>
              {period && (
                <span className="text-xs text-muted">
                  {periodRangeLabel(period)}
                  {daysLeft(period, today) !== null && ` · ${daysLeft(period, today)} days left`}
                </span>
              )}
            </div>
            <button
              type="button"
              aria-label={newer ? `Next period, ${newer.name}` : "No later period"}
              disabled={!newer}
              onClick={() => newer && setPeriodId(newer.id)}
              className="flex size-11 items-center justify-center rounded-full bg-page disabled:opacity-40"
            >
              <ChevronRight aria-hidden size={16} strokeWidth={2.25} />
            </button>
          </div>

          <section aria-label="Plan for this period" className="flex flex-col gap-2.5 rounded-3xl bg-ink p-5 text-white">
            <SummaryLine label="Income this period" value={income} />
            <SummaryLine label="Expense budget" value={expenseBudget} />
            <SummaryLine label="Saving goals this period" value={goalsNeeded} />
            <div aria-hidden className="my-1 h-px bg-nav-selected" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] text-[#BDBDBD]">{left >= 0 ? "Left to plan" : "Planned more than income"}</span>
              <span
                className={`rounded-full px-3 py-1 text-[17px] font-bold ${left >= 0 ? "bg-lime text-ink" : "bg-ember text-white"}`}
              >
                {formatRupiah(Math.abs(left))}
              </span>
            </div>
          </section>

          {older && (
            <button
              type="button"
              onClick={copyFromOlder}
              disabled={!olderHasBudgets}
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-card text-sm font-semibold disabled:opacity-50"
            >
              <Copy aria-hidden size={16} strokeWidth={2} />
              {olderHasBudgets ? `Copy amounts from ${older.name}` : `${older.name} has no amounts to copy`}
            </button>
          )}

          <section aria-labelledby="expense-budget" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 id="expense-budget" className="text-[17px] font-semibold">
                Expense budget
              </h2>
              <span className="text-[13px] text-muted">Tap an amount to change it</span>
            </div>
            <ul className="rounded-3xl bg-card px-4 py-1">
              {loading &&
                [0, 1, 2].map((i) => (
                  <li key={i} aria-hidden className="flex items-center justify-between py-3">
                    <span className="h-4 w-28 rounded bg-page" />
                    <span className="h-11 w-36 rounded-full bg-page" />
                  </li>
                ))}
              {period &&
                expenseRows.map((c, i) => (
                  <BudgetRow
                    key={`${period.id}-${c.id}`}
                    category={c}
                    periodId={period.id}
                    budget={budgetFor(c.id)}
                    spent={spentBy(c.id)}
                    first={i === 0}
                  />
                ))}
            </ul>
          </section>
        </>
      ) : (
        <GoalsTab
          rows={plansFor(current ?? period)}
          savingCategories={allCategories.filter((c) => c.kind === "saving" && !c.archived)}
          onNew={() => setGoalSheet("new")}
          onOpen={(g) => setGoalSheet(g)}
        />
      )}

      <Sheet open={goalSheet !== null} onClose={() => setGoalSheet(null)} title={goalSheet === "new" ? "New goal" : "Edit goal"}>
        <GoalForm
          key={goalSheet === "new" ? "new" : goalSheet?.id}
          goal={goalSheet === "new" ? null : goalSheet}
          savingCategories={allCategories.filter((c) => c.kind === "saving")}
          takenCategoryIds={(goals.data ?? []).map((g) => g.categoryId)}
          onDone={() => setGoalSheet(null)}
        />
      </Sheet>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[13px] text-[#BDBDBD]">{label}</span>
      <span className="text-[15px] font-bold">{formatRupiah(value)}</span>
    </div>
  );
}

/** One expense category: editable amount, bar, spent and what's left (ember when over). */
function BudgetRow({
  category,
  periodId,
  budget,
  spent,
  first,
}: {
  category: Category;
  periodId: string;
  budget: number;
  spent: number;
  first: boolean;
}) {
  const [text, setText] = useState(groupThousands(budget));
  const [saving, setSaving] = useState(false);
  const line = budgetLine(budget, spent);

  // Show the saved amount again if it changes elsewhere (copy, undo).
  const [shown, setShown] = useState(budget);
  if (shown !== budget) {
    setShown(budget);
    setText(groupThousands(budget));
  }

  async function commit() {
    const amount = parseRupiahInput(text);
    setText(groupThousands(amount));
    if (amount === budget) return;
    setSaving(true);
    try {
      await setBudget(periodId, category.id, amount);
    } catch (e) {
      setText(groupThousands(budget));
      showToast({ message: errorMessage(e, "Could not save the budget"), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className={`flex flex-col gap-2 py-3 ${first ? "" : "border-t border-page"}`}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={`budget-${category.id}`} className="min-w-0 truncate text-[15px] font-semibold">
          {category.name}
        </label>
        <span className="flex h-11 w-[150px] flex-none items-center gap-1 rounded-full bg-page px-3">
          <span aria-hidden className="text-[13px] font-semibold text-muted">
            Rp
          </span>
          <input
            id={`budget-${category.id}`}
            inputMode="numeric"
            autoComplete="off"
            aria-label={`${category.name} budget in rupiah`}
            aria-busy={saving}
            value={text}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setText(groupThousands(parseRupiahInput(e.target.value)))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="min-w-0 flex-1 border-0 bg-transparent text-right text-base font-bold outline-none"
          />
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${category.name} spent`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={line.barPercent}
        className="h-1.5 overflow-hidden rounded-full bg-page"
      >
        <div className={`h-full rounded-full ${line.over ? "bg-ember" : "bg-ink"}`} style={{ width: `${line.barPercent}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted">{formatRupiah(spent)} spent</span>
        {line.over ? (
          <span className="rounded-full bg-ember px-2 py-0.5 font-semibold text-white">{formatRupiah(line.remaining)} over</span>
        ) : (
          <span className="font-semibold">{formatRupiah(line.remaining)} left</span>
        )}
      </div>
    </li>
  );
}

type GoalRow = { goal: Goal; category: Category; plan: ReturnType<typeof goalPlan> };

function GoalsTab({
  rows,
  savingCategories,
  onNew,
  onOpen,
}: {
  rows: GoalRow[];
  savingCategories: Category[];
  onNew: () => void;
  onOpen: (g: Goal) => void;
}) {
  const savedTotal = rows.reduce((s, r) => s + Math.max(0, r.plan.saved), 0);
  const targetTotal = rows.reduce((s, r) => s + r.goal.target, 0);
  const thisPeriod = rows.reduce((s, r) => s + Math.max(0, r.plan.thisPeriod), 0);
  const needed = rows.reduce((s, r) => s + r.plan.neededThisPeriod, 0);
  const pct = targetTotal > 0 ? Math.min(100, Math.round((savedTotal / targetTotal) * 100)) : 0;
  const withGoal = new Set(rows.map((r) => r.category.id));
  const without = savingCategories.filter((c) => !withGoal.has(c.id));

  return (
    <>
      <section aria-label="All goals" className="flex flex-col gap-1 rounded-3xl bg-ink p-5 text-white">
        <span className="text-[13px] text-[#BDBDBD]">Saved toward goals</span>
        <span className="text-[32px] leading-[1.25] font-bold tracking-[-0.03em]">{formatRupiah(savedTotal)}</span>
        <span className="text-[13px] text-[#BDBDBD]">
          of {formatRupiah(targetTotal)} across {rows.length} {rows.length === 1 ? "goal" : "goals"}
        </span>
        <div
          role="progressbar"
          aria-label="Saved toward all goals"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="mt-3 h-2 overflow-hidden rounded-full bg-nav-selected"
        >
          <div className="h-full rounded-full bg-lime" style={{ width: `${pct}%` }} />
        </div>
        <span className="mt-1.5 text-xs text-[#BDBDBD]">
          This period: {formatRupiah(thisPeriod)} of {formatRupiah(needed)} set aside
        </span>
      </section>

      <button
        type="button"
        onClick={onNew}
        className="flex h-12 items-center justify-center gap-2 rounded-full bg-lime text-sm font-bold text-ink"
      >
        <Plus aria-hidden size={16} strokeWidth={2.5} />
        New goal
      </button>

      {rows.map(({ goal, category, plan }) => (
        <button
          key={goal.id}
          type="button"
          onClick={() => onOpen(goal)}
          aria-label={`${category.name} goal, ${formatRupiah(plan.saved)} of ${formatRupiah(goal.target)}. Edit`}
          className="flex flex-col gap-2 rounded-3xl bg-card p-4 text-left"
        >
          <span className="flex w-full items-baseline justify-between gap-2">
            <span className="text-[17px] font-bold">{category.name}</span>
            <span className="text-xs text-muted">{byDate(goal.targetDate)}</span>
          </span>
          <span className="flex w-full items-baseline justify-between gap-2">
            <span className="text-xl font-bold">{formatRupiah(plan.saved)}</span>
            <span className="text-[13px] text-muted">of {formatRupiah(goal.target)}</span>
          </span>
          <span aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-page">
            <span className="block h-full rounded-full bg-ink" style={{ width: `${plan.percent}%` }} />
          </span>
          <span className="mt-0.5 flex w-full items-center justify-between gap-2 text-xs">
            <span className="text-muted">
              {plan.neededThisPeriod > 0 ? `${formatRupiah(plan.neededThisPeriod)} a month to get there` : "Target reached"}
            </span>
            <span className={`rounded-full px-2 py-0.5 font-semibold ${plan.done ? "bg-lime" : "bg-page"}`}>
              {plan.done ? "Done this month" : `${formatRupiah(Math.max(0, plan.thisPeriod))} this month`}
            </span>
          </span>
        </button>
      ))}

      {without.length > 0 && (
        <button type="button" onClick={onNew} className="flex items-center justify-between gap-2 rounded-3xl bg-card p-4 text-left">
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">
              {without.length} saving {without.length === 1 ? "category" : "categories"} without a goal
            </span>
            <span className="text-xs text-muted">
              {without.slice(0, 3).map((c) => c.name).join(", ")}
              {without.length > 3 ? ` and ${without.length - 3} more` : ""}
            </span>
          </span>
          <span className="flex items-center gap-0.5 text-[13px] font-semibold">
            Set
            <ChevronRight aria-hidden size={16} strokeWidth={2.25} />
          </span>
        </button>
      )}
    </>
  );
}

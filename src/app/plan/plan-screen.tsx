"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Plus, X } from "lucide-react";
import { Segmented } from "@/components/segmented";
import { Sheet } from "@/components/sheet";
import { showToast } from "@/components/toast";
import { Button, ErrorNote, Input, Label } from "@/components/ui";
import { copyBudgets, removeBudget, setBudget, useBudgets } from "@/lib/budgets";
import { CATEGORY_NAME_MAX, createCategory, useCategories, type Category } from "@/lib/categories";
import { errorMessage } from "@/lib/errors";
import { savingBalance } from "@/lib/balances";
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
  const [goalSheet, setGoalSheet] = useState<Category | "new" | null>(null);
  const [addOpen, setAddOpen] = useState(false);

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

  // The budget list is the categories picked for this period (a budget row exists), in category order.
  const budgeted = new Set((budgets.data ?? []).filter((b) => b.periodId === period?.id).map((b) => b.categoryId));
  const expenseCategories = allCategories.filter((c) => c.kind === "expense");
  const expenseRows = expenseCategories.filter((c) => budgeted.has(c.id));
  const addable = expenseCategories.filter((c) => !c.archived && !budgeted.has(c.id));
  const expenseBudget = expenseRows.reduce((s, c) => s + budgetFor(c.id), 0);
  const unbudgetedSpent = periodTxs
    .filter((t) => t.type === "expense" && t.categoryId && !budgeted.has(t.categoryId))
    .reduce((s, t) => s + t.amount, 0);

  // Saving categories are the goals: every active one is a card; target and date are optional.
  const savingRows = allCategories
    .filter((c) => c.kind === "saving" && !c.archived)
    .map((category) => ({
      category,
      goal: (goals.data ?? []).find((g) => g.categoryId === category.id) ?? null,
      moves: txs.filter((t) => t.categoryId === category.id),
    }));
  // Planned against the selected period on the Budget tab, and against today on the Goals tab.
  const plansFor = (p: StoredPeriod | null): SavingRow[] =>
    savingRows.map((r) => ({
      ...r,
      plan:
        p && r.goal
          ? goalPlan({ target: r.goal.target, targetDate: r.goal.targetDate, period: p, moves: r.moves })
          : null,
      saved: savingBalance(r.category.id, r.moves),
      thisPeriod: p
        ? r.moves
            .filter((t) => t.date >= p.start && t.date <= p.end)
            .reduce((s, t) => s + (t.type === "saving_deposit" ? t.amount : t.type === "saving_withdraw" ? -t.amount : 0), 0)
        : 0,
    }));
  const goalsNeeded = plansFor(period).reduce((s, r) => s + (r.plan?.neededThisPeriod ?? 0), 0);
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
              {expenseRows.length > 0 && <span className="text-[13px] text-muted">Tap an amount to change it</span>}
            </div>
            {(loading || expenseRows.length > 0) && (
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
            )}
            {period && !loading && expenseRows.length === 0 && (
              <p className="rounded-3xl bg-card px-5 py-4 text-[13px] font-medium text-muted">
                No categories in this budget yet. Add the ones you want to plan
                {olderHasBudgets ? `, or copy ${older?.name}'s list above` : ""}.
              </p>
            )}
            {unbudgetedSpent > 0 && (
              <p className="px-1 text-[13px] text-muted">
                {formatRupiah(unbudgetedSpent)} spent in categories without a budget this period.
              </p>
            )}
            {period && (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex h-12 items-center justify-center gap-2 rounded-full border border-dashed border-[#BDBDBD] text-sm font-semibold"
              >
                <Plus aria-hidden size={16} strokeWidth={2.5} />
                Add category
              </button>
            )}
          </section>
        </>
      ) : (
        <GoalsTab rows={plansFor(current ?? period)} onNew={() => setGoalSheet("new")} onOpen={(c) => setGoalSheet(c)} />
      )}

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add to budget">
        {period && (
          <AddBudgetCategory
            periodId={period.id}
            choices={addable}
            nextSortOrder={Math.max(0, ...expenseCategories.map((c) => c.sortOrder)) + 1}
            onDone={() => setAddOpen(false)}
          />
        )}
      </Sheet>

      <Sheet open={goalSheet !== null} onClose={() => setGoalSheet(null)} title={goalSheet === "new" ? "New goal" : "Edit goal"}>
        <GoalForm
          key={goalSheet === "new" ? "new" : goalSheet?.id}
          category={goalSheet === "new" ? null : goalSheet}
          goal={goalSheet === "new" ? null : ((goals.data ?? []).find((g) => g.categoryId === goalSheet?.id) ?? null)}
          nextSortOrder={Math.max(0, ...allCategories.filter((c) => c.kind === "saving").map((c) => c.sortOrder)) + 1}
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

  async function remove() {
    try {
      await removeBudget(periodId, category.id);
      showToast({
        message: `${category.name} removed from the budget`,
        action: {
          label: "Undo",
          run: async () => {
            try {
              await setBudget(periodId, category.id, budget);
            } catch (e) {
              showToast({ message: errorMessage(e, "Could not undo"), tone: "error" });
            }
          },
        },
      });
    } catch (e) {
      showToast({ message: errorMessage(e, "Could not remove"), tone: "error" });
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
        <button
          type="button"
          aria-label={`Remove ${category.name} from this budget`}
          onClick={remove}
          className="-mr-2 flex size-11 flex-none items-center justify-center rounded-full text-muted"
        >
          <X aria-hidden size={18} strokeWidth={2.25} />
        </button>
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

type SavingRow = {
  category: Category;
  goal: Goal | null;
  moves: Transaction[];
  plan: ReturnType<typeof goalPlan> | null;
  saved: number;
  thisPeriod: number;
};

/** Goals tab: every saving category is a goal; target amount and date are optional. */
function GoalsTab({ rows, onNew, onOpen }: { rows: SavingRow[]; onNew: () => void; onOpen: (c: Category) => void }) {
  const targeted = rows.filter((r) => r.goal && r.plan);
  const savedTotal = targeted.reduce((s, r) => s + Math.max(0, r.saved), 0);
  const targetTotal = targeted.reduce((s, r) => s + (r.goal?.target ?? 0), 0);
  const thisPeriod = targeted.reduce((s, r) => s + Math.max(0, r.thisPeriod), 0);
  const needed = targeted.reduce((s, r) => s + (r.plan?.neededThisPeriod ?? 0), 0);
  const pct = targetTotal > 0 ? Math.min(100, Math.round((savedTotal / targetTotal) * 100)) : 0;

  return (
    <>
      <section aria-label="All goals" className="flex flex-col gap-1 rounded-3xl bg-ink p-5 text-white">
        <span className="text-[13px] text-[#BDBDBD]">Saved toward goals</span>
        <span className="text-[32px] leading-[1.25] font-bold tracking-[-0.03em]">{formatRupiah(savedTotal)}</span>
        <span className="text-[13px] text-[#BDBDBD]">
          {targeted.length
            ? `of ${formatRupiah(targetTotal)} across ${targeted.length} ${targeted.length === 1 ? "goal" : "goals"} with a target`
            : "Set a target on a goal to track progress"}
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

      {rows.length === 0 && (
        <p className="rounded-3xl bg-card px-5 py-4 text-[13px] font-medium text-muted">
          No goals yet. Each goal is a saving category you can deposit into from the Log sheet.
        </p>
      )}

      {rows.map(({ category, goal, plan, saved, thisPeriod: setAside }) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onOpen(category)}
          aria-label={`${category.name}, saved ${formatRupiah(saved)}${goal ? ` of ${formatRupiah(goal.target)}` : ""}. Edit`}
          className="flex flex-col gap-2 rounded-3xl bg-card p-4 text-left"
        >
          <span className="flex w-full items-baseline justify-between gap-2">
            <span className="text-[17px] font-bold">{category.name}</span>
            {goal && <span className="text-xs text-muted">{byDate(goal.targetDate)}</span>}
          </span>
          <span className="flex w-full items-baseline justify-between gap-2">
            <span className="text-xl font-bold">{formatRupiah(saved)}</span>
            {goal && <span className="text-[13px] text-muted">of {formatRupiah(goal.target)}</span>}
          </span>
          {goal && plan ? (
            <>
              <span aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-page">
                <span className="block h-full rounded-full bg-ink" style={{ width: `${plan.percent}%` }} />
              </span>
              <span className="mt-0.5 flex w-full items-center justify-between gap-2 text-xs">
                <span className="text-muted">
                  {plan.neededThisPeriod > 0
                    ? `${formatRupiah(plan.neededThisPeriod)} a month to get there`
                    : "Target reached"}
                </span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${plan.done ? "bg-lime" : "bg-page"}`}>
                  {plan.done ? "Done this month" : `${formatRupiah(Math.max(0, plan.thisPeriod))} this month`}
                </span>
              </span>
            </>
          ) : (
            <span className="flex w-full items-center justify-between gap-2 text-xs">
              <span className="text-muted">{formatRupiah(Math.max(0, setAside))} this month</span>
              <span className="rounded-full bg-page px-2 py-0.5 font-semibold">Set a target</span>
            </span>
          )}
        </button>
      ))}
    </>
  );
}

/** Add an expense category to this period's budget: pick one, or create a new one. */
function AddBudgetCategory({
  periodId,
  choices,
  nextSortOrder,
  onDone,
}: {
  periodId: string;
  choices: Category[];
  nextSortOrder: number;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(task: () => Promise<string>) {
    setBusy(true);
    setError(null);
    try {
      const label = await task();
      onDone();
      showToast({ message: `${label} added to the budget` });
    } catch (e) {
      setError(errorMessage(e, "Could not add"));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {choices.length > 0 ? (
        <ul aria-label="Expense categories" className="flex max-h-[45dvh] flex-col overflow-y-auto rounded-2xl border border-line">
          {choices.map((c) => (
            <li key={c.id} className="border-b border-line last:border-0">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  add(async () => {
                    await setBudget(periodId, c.id, 0);
                    return c.name;
                  })
                }
                className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left"
              >
                <span className="text-[15px] font-semibold">{c.name}</span>
                <Plus aria-hidden size={18} strokeWidth={2.25} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] font-medium text-muted">Every expense category is already in this budget.</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) return setError("Type a name for the new category.");
          add(async () => {
            const c = await createCategory("expense", { name: trimmed, icon: "ellipsis", note: null }, nextSortOrder);
            await setBudget(periodId, c.id, 0);
            return c.name;
          });
        }}
        noValidate
        className="flex flex-col gap-2"
      >
        <Label htmlFor="new-expense-category">Or create a new expense category</Label>
        <div className="flex gap-2">
          <Input
            id="new-expense-category"
            placeholder="e.g. Groceries"
            maxLength={CATEGORY_NAME_MAX}
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-page"
          />
          <Button type="submit" size="md" disabled={busy} className="flex-none">
            Add
          </Button>
        </div>
      </form>

      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}

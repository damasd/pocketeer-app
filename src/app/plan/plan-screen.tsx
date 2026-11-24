"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import { DeleteCategoryConfirm } from "@/components/delete-category";
import { Segmented } from "@/components/segmented";
import { Sheet } from "@/components/sheet";
import { showToast } from "@/components/toast";
import { Button, ErrorNote, Input, Label } from "@/components/ui";
import { copyBudgets, setBudget, useBudgets } from "@/lib/budgets";
import { CATEGORY_NAME_MAX, createCategory, useCategories, type Category } from "@/lib/categories";
import { errorMessage } from "@/lib/errors";
import { savingBalance } from "@/lib/balances";
import { useGoals, type Goal } from "@/lib/goals";
import { formatRupiah, groupThousands, parseRupiahInput } from "@/lib/money";
import { periodRangeLabel } from "@/lib/periods";
import { coverPeriodsFrom, periodOf, usePeriods, type StoredPeriod } from "@/lib/periods-store";
import { budgetLine, goalPercent, goalPlan, leftToPlan, targetLine } from "@/lib/plan";
import { useTransactions, type Transaction } from "@/lib/transactions";
import { useToday } from "@/lib/use-today";
import { GoalForm } from "./goal-form";

type Tab = "plan" | "goals";
type Kind = Category["kind"];

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

const TITLE = "Target";

/** Target tab: Plan (expense budget, expected income, saving target) and Goals. Waits for today's date. */
export function PlanScreen() {
  const today = useToday();
  if (!today) {
    return (
      <header className="pt-3">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">{TITLE}</h1>
      </header>
    );
  }
  return <PlanBody today={today} />;
}

/** One row of a Plan slide: the amount typed for this period and what actually happened. */
type PlanRow = { category: Category; amount: number; actual: number; hint?: string };

const deposit = (t: Transaction) => (t.type === "saving_deposit" ? t.amount : t.type === "saving_withdraw" ? -t.amount : 0);

function PlanBody({ today }: { today: string }) {
  const periods = usePeriods();
  const budgets = useBudgets();
  const goals = useGoals();
  const categories = useCategories();
  const transactions = useTransactions();

  const [tab, setTab] = useState<Tab>("plan");
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [goalSheet, setGoalSheet] = useState<Category | "new" | null>(null);
  const [addKind, setAddKind] = useState<"expense" | "income" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

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
  const periodTxs = period ? txs.filter((t) => t.date >= period.start && t.date <= period.end) : [];
  const amountFor = (categoryId: string) =>
    (budgets.data ?? []).find((b) => b.periodId === period?.id && b.categoryId === categoryId)?.amount ?? 0;
  const actualFor = (c: Category) =>
    periodTxs
      .filter((t) => t.categoryId === c.id)
      .reduce((s, t) => s + (c.kind === "saving" ? deposit(t) : t.type === c.kind ? t.amount : 0), 0);

  // Each slide lists one kind of category, in category order. Archived ones stay only for
  // periods where they have an amount or money moved.
  const rowsOf = (kind: Kind): PlanRow[] =>
    allCategories
      .filter((c) => c.kind === kind)
      .map((category) => ({ category, amount: amountFor(category.id), actual: actualFor(category) }))
      .filter((r) => !r.category.archived || r.amount > 0 || r.actual !== 0);
  const expenseRows = rowsOf("expense");
  const incomeRows = rowsOf("income");
  const savingRows = rowsOf("saving").map((r) => {
    const goal = (goals.data ?? []).find((g) => g.categoryId === r.category.id);
    if (!goal?.targetDate || !period) return r;
    const plan = goalPlan({
      target: goal.target,
      targetDate: goal.targetDate,
      period,
      moves: txs.filter((t) => t.categoryId === r.category.id),
    });
    return plan.neededThisPeriod > 0 ? { ...r, hint: `Goal needs ${formatRupiah(plan.neededThisPeriod)} this period` } : r;
  });
  const total = (rows: PlanRow[]) => rows.reduce((s, r) => s + r.amount, 0);
  const expenseBudget = total(expenseRows);
  const expectedIncome = total(incomeRows);
  const savingTarget = total(savingRows);
  const left = leftToPlan(expectedIncome, expenseBudget, savingTarget);

  // Goals tab: every active saving category, with what's saved in it so far (all time).
  const goalRows: GoalRow[] = allCategories
    .filter((c) => c.kind === "saving" && !c.archived)
    .map((category) => ({
      category,
      goal: (goals.data ?? []).find((g) => g.categoryId === category.id) ?? null,
      saved: savingBalance(category.id, txs),
    }));

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
  const nextSortOrder = (kind: Kind) =>
    Math.max(0, ...allCategories.filter((c) => c.kind === kind).map((c) => c.sortOrder)) + 1;

  const rowList = (kind: Kind, rows: PlanRow[], empty: string) =>
    loading ? (
      <ul aria-hidden className="rounded-3xl bg-card px-4 py-1">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center justify-between py-3">
            <span className="h-4 w-28 rounded bg-page" />
            <span className="h-11 w-36 rounded-full bg-page" />
          </li>
        ))}
      </ul>
    ) : rows.length > 0 && period ? (
      <ul className="rounded-3xl bg-card px-4 py-1">
        {rows.map((r, i) => (
          <AmountRow
            key={`${period.id}-${r.category.id}`}
            kind={kind}
            row={r}
            periodId={period.id}
            first={i === 0}
            onDelete={kind === "saving" || r.category.builtIn ? undefined : () => setDeleting(r.category)}
          />
        ))}
      </ul>
    ) : (
      <p className="rounded-3xl bg-card px-5 py-4 text-[13px] font-medium text-muted">{empty}</p>
    );

  const addButton = (label: string, onClick: () => void) =>
    period && (
      <button
        type="button"
        onClick={onClick}
        className="flex h-12 items-center justify-center gap-2 rounded-full border border-dashed border-[#BDBDBD] text-sm font-semibold"
      >
        <Plus aria-hidden size={16} strokeWidth={2.5} />
        {label}
      </button>
    );

  return (
    <div className="flex flex-col gap-4">
      <header className="pt-3">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">{TITLE}</h1>
      </header>

      <Segmented
        label="Show"
        surface="card"
        options={[
          { value: "plan", label: "Plan" },
          { value: "goals", label: "Goals" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {loadError && loadError.status === "error" && <ErrorNote>{loadError.message}</ErrorNote>}

      {tab === "plan" ? (
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
            <SummaryLine label="Expected income" value={expectedIncome} />
            <SummaryLine label="Expense budget" value={expenseBudget} />
            <SummaryLine label="Saving target" value={savingTarget} />
            <div aria-hidden className="my-1 h-px bg-nav-selected" />
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 text-[13px] text-[#BDBDBD]">{left >= 0 ? "Left to plan" : "Over-planned by"}</span>
              <span
                className={`flex-none rounded-full px-3 py-1 text-[17px] font-bold whitespace-nowrap ${left >= 0 ? "bg-lime text-ink" : "bg-ember text-white"}`}
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

          <PlanSlides
            slides={[
              {
                id: "expense",
                label: "Expense",
                title: "Expense budget",
                total: expenseBudget,
                body: (
                  <>
                    {rowList("expense", expenseRows, "No expense categories yet.")}
                    {addButton("New expense category", () => setAddKind("expense"))}
                  </>
                ),
              },
              {
                id: "income",
                label: "Income",
                title: "Expected income",
                total: expectedIncome,
                body: (
                  <>
                    {rowList("income", incomeRows, "No income categories yet.")}
                    {addButton("New income category", () => setAddKind("income"))}
                  </>
                ),
              },
              {
                id: "saving",
                label: "Saving",
                title: "Saving target",
                total: savingTarget,
                body: (
                  <>
                    {rowList("saving", savingRows, "No goals yet. Each goal is a saving category you can deposit into.")}
                    {addButton("New goal", () => setGoalSheet("new"))}
                  </>
                ),
              },
            ]}
          />
        </>
      ) : (
        <GoalsTab rows={goalRows} onNew={() => setGoalSheet("new")} onOpen={(c) => setGoalSheet(c)} />
      )}

      <Sheet open={deleting !== null} onClose={() => setDeleting(null)} title="Delete category">
        {deleting && (
          <DeleteCategoryConfirm
            key={deleting.id}
            category={deleting}
            onCancel={() => setDeleting(null)}
            onDone={() => setDeleting(null)}
          />
        )}
      </Sheet>

      <Sheet
        open={addKind !== null}
        onClose={() => setAddKind(null)}
        title={addKind === "income" ? "New income category" : "New expense category"}
      >
        {period && addKind && (
          <NewCategory
            key={addKind}
            kind={addKind}
            periodId={period.id}
            nextSortOrder={nextSortOrder(addKind)}
            onDone={() => setAddKind(null)}
          />
        )}
      </Sheet>

      <Sheet open={goalSheet !== null} onClose={() => setGoalSheet(null)} title={goalSheet === "new" ? "New goal" : "Edit goal"}>
        <GoalForm
          key={goalSheet === "new" ? "new" : goalSheet?.id}
          category={goalSheet === "new" ? null : goalSheet}
          goal={goalSheet === "new" ? null : ((goals.data ?? []).find((g) => g.categoryId === goalSheet?.id) ?? null)}
          nextSortOrder={nextSortOrder("saving")}
          balance={goalSheet && goalSheet !== "new" ? savingBalance(goalSheet.id, txs) : 0}
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

type Slide = { id: string; label: string; title: string; total: number; body: ReactNode };

/**
 * Expense budget, Expected income and Saving target behind a three-way switch (the same sliding
 * pill as Plan / Goals). The list slides in from the side of the option you picked.
 */
function PlanSlides({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(slides[0].id);
  const [from, setFrom] = useState<"left" | "right" | null>(null);
  const index = slides.findIndex((s) => s.id === active);
  const slide = slides[index];

  function pick(id: string) {
    const next = slides.findIndex((s) => s.id === id);
    if (next === index) return;
    setFrom(next > index ? "right" : "left");
    setActive(id);
  }

  return (
    <section aria-labelledby={`list-${slide.id}`} className="flex flex-col gap-3">
      <Segmented
        label="Show list"
        surface="card"
        options={slides.map((s) => ({ value: s.id, label: s.label }))}
        value={active}
        onChange={pick}
      />
      <div key={slide.id} className={`flex flex-col gap-3 ${from ? `slide-in-${from}` : ""}`}>
        <div className="flex items-baseline justify-between gap-2">
          <h2 id={`list-${slide.id}`} className="text-[17px] font-semibold">
            {slide.title}
          </h2>
          <span className="text-[15px] font-bold whitespace-nowrap">{formatRupiah(slide.total)}</span>
        </div>
        <p className="-mt-1.5 text-[13px] text-muted">Tap an amount to change it</p>
        {slide.body}
      </div>
    </section>
  );
}

/**
 * One category on a Plan slide: the amount you type, a bar, and how it's going.
 * Expense: spent against the budget (ember when over). Income: received against what you expect.
 * Saving: put into the goal this period against the target.
 */
function AmountRow({
  kind,
  row,
  periodId,
  first,
  onDelete,
}: {
  kind: Kind;
  row: PlanRow;
  periodId: string;
  first: boolean;
  /** Only for categories you added; built-in ones cannot be deleted. */
  onDelete?: () => void;
}) {
  const { category, amount, actual, hint } = row;
  const [text, setText] = useState(groupThousands(amount));
  const [saving, setSaving] = useState(false);
  const noun = kind === "expense" ? "budget" : kind === "income" ? "expected income" : "saving target";

  // Show the saved amount again if it changes elsewhere (copy, undo).
  const [shown, setShown] = useState(amount);
  if (shown !== amount) {
    setShown(amount);
    setText(groupThousands(amount));
  }

  async function commit() {
    const next = parseRupiahInput(text);
    setText(groupThousands(next));
    if (next === amount) return;
    setSaving(true);
    try {
      await setBudget(periodId, category.id, next);
    } catch (e) {
      setText(groupThousands(amount));
      showToast({ message: errorMessage(e, `Could not save the ${noun}`), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  let bar: number;
  let barColour = "bg-ink";
  let status: ReactNode;
  if (kind === "expense") {
    const line = budgetLine(amount, actual);
    bar = line.barPercent;
    if (line.over) barColour = "bg-ember";
    status = line.over ? (
      <span className="rounded-full bg-ember px-2 py-0.5 font-semibold text-white">{formatRupiah(line.remaining)} over</span>
    ) : (
      <span className="font-semibold">{formatRupiah(line.remaining)} left</span>
    );
  } else {
    const line = targetLine(amount, actual);
    bar = line.barPercent;
    const reachedLabel =
      kind === "income" ? (line.remaining > 0 ? `${formatRupiah(line.remaining)} extra` : "All received") : "Target met";
    status =
      amount === 0 ? (
        <span className="text-muted">No amount set</span>
      ) : line.reached ? (
        <span className="rounded-full bg-lime px-2 py-0.5 font-semibold text-ink">{reachedLabel}</span>
      ) : (
        <span className="font-semibold">
          {formatRupiah(line.remaining)} {kind === "income" ? "to come" : "to go"}
        </span>
      );
  }
  const actualLabel = kind === "expense" ? "spent" : kind === "income" ? "received" : "saved";

  return (
    <li className={`flex flex-col gap-2 py-3 ${first ? "" : "border-t border-page"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-0.5">
          <label htmlFor={`amount-${category.id}`} className="min-w-0 truncate text-[15px] font-semibold">
            {category.name}
          </label>
          {onDelete && (
            <button
              type="button"
              aria-label={`Delete ${category.name}`}
              onClick={onDelete}
              className="flex size-11 flex-none items-center justify-center rounded-full text-muted"
            >
              <Trash2 aria-hidden size={18} strokeWidth={2} />
            </button>
          )}
        </span>
        <span className="flex h-11 w-[150px] flex-none items-center gap-1 rounded-full bg-page px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-lime">
          <span aria-hidden className="text-[13px] font-semibold text-muted">
            Rp
          </span>
          <input
            id={`amount-${category.id}`}
            inputMode="numeric"
            autoComplete="off"
            aria-label={`${category.name} ${noun} in rupiah`}
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
        aria-label={`${category.name} ${actualLabel}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={bar}
        className="h-1.5 overflow-hidden rounded-full bg-page"
      >
        <div className={`h-full rounded-full ${barColour}`} style={{ width: `${bar}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted">
          {formatRupiah(kind === "saving" ? Math.max(0, actual) : actual)} {actualLabel}
        </span>
        {status}
      </div>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </li>
  );
}

type GoalRow = { category: Category; goal: Goal | null; saved: number };

/**
 * Goals tab: the whole goal, not the month. Each saving category shows what's saved against its
 * target and the share saved so far; target amount and date are optional.
 */
function GoalsTab({ rows, onNew, onOpen }: { rows: GoalRow[]; onNew: () => void; onOpen: (c: Category) => void }) {
  const targeted = rows.filter((r) => r.goal);
  const savedTotal = targeted.reduce((s, r) => s + Math.max(0, r.saved), 0);
  const targetTotal = targeted.reduce((s, r) => s + (r.goal?.target ?? 0), 0);
  const pct = goalPercent(savedTotal, targetTotal);

  return (
    <>
      <section aria-label="All goals" className="flex flex-col gap-1 rounded-3xl bg-ink p-5 text-white">
        <span className="text-[13px] text-[#BDBDBD]">Saved toward goals</span>
        <span className="flex items-center justify-between gap-2">
          <span className="text-[32px] leading-[1.25] font-bold tracking-[-0.03em]">{formatRupiah(savedTotal)}</span>
          {targeted.length > 0 && (
            <span className="rounded-full bg-lime px-3 py-1 text-[15px] font-bold text-ink">{pct}%</span>
          )}
        </span>
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

      {rows.map(({ category, goal, saved }) => {
        const percent = goal ? goalPercent(saved, goal.target) : 0;
        const toGo = goal ? Math.max(0, goal.target - saved) : 0;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onOpen(category)}
            aria-label={`${category.name}, saved ${formatRupiah(saved)}${goal ? ` of ${formatRupiah(goal.target)}, ${percent}%` : ""}. Edit`}
            className="flex flex-col gap-2 rounded-3xl bg-card p-4 text-left"
          >
            <span className="flex w-full items-baseline justify-between gap-2">
              <span className="text-[17px] font-bold">{category.name}</span>
              {goal?.targetDate && <span className="text-xs text-muted">{byDate(goal.targetDate)}</span>}
            </span>
            <span className="text-xl font-bold">{formatRupiah(saved)}</span>
            {goal ? (
              <>
                <span aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-page">
                  <span className="block h-full rounded-full bg-ink" style={{ width: `${percent}%` }} />
                </span>
                <span className="mt-0.5 flex w-full items-center justify-between gap-2 text-xs">
                  <span className="text-muted">{toGo > 0 ? `${formatRupiah(toGo)} to go` : "Goal reached"}</span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${percent >= 100 ? "bg-lime text-ink" : "bg-page"}`}>
                    {percent}% saved
                  </span>
                </span>
              </>
            ) : (
              <span className="flex w-full items-center justify-end text-xs">
                <span className="rounded-full bg-page px-2 py-0.5 font-semibold">Set a target</span>
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

/**
 * Create a new expense or income category from a Plan slide. It joins that slide and the Log
 * sheet's chips straight away; an optional amount sets it for this period.
 */
function NewCategory({
  kind,
  periodId,
  nextSortOrder,
  onDone,
}: {
  kind: "expense" | "income";
  periodId: string;
  nextSortOrder: number;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Type a name for the category.");
    setBusy(true);
    setError(null);
    try {
      const c = await createCategory(kind, { name: trimmed, icon: "ellipsis", note: null }, nextSortOrder);
      if (amount > 0) await setBudget(periodId, c.id, amount);
      onDone();
      showToast({ message: `${c.name} added` });
    } catch (err) {
      setError(errorMessage(err, "Could not add the category"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`new-${kind}-category`}>Name</Label>
        <Input
          id={`new-${kind}-category`}
          placeholder={kind === "income" ? "e.g. Freelance" : "e.g. Groceries"}
          maxLength={CATEGORY_NAME_MAX}
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-page"
        />
        <p className="text-xs text-muted">It also appears in the Log sheet under {kind === "income" ? "Income" : "Expense"}. Change its icon in Settings › Categories.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`new-${kind}-amount`}>{kind === "income" ? "Expected this period" : "Budget this period"} (optional)</Label>
        <div className="flex h-[52px] items-center gap-1.5 rounded-2xl bg-page px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-lime">
          <span aria-hidden className="text-[15px] font-semibold text-muted">
            Rp
          </span>
          <input
            id={`new-${kind}-amount`}
            inputMode="numeric"
            autoComplete="off"
            value={groupThousands(amount)}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setAmount(parseRupiahInput(e.target.value))}
            className="h-12 min-w-0 flex-1 border-0 bg-transparent text-base font-semibold outline-none"
          />
        </div>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button type="submit" disabled={busy}>
        {busy ? "Adding…" : "Add category"}
      </Button>
    </form>
  );
}

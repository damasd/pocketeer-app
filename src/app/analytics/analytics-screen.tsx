"use client";

import { useEffect, useMemo, useState } from "react";
import { Segmented } from "@/components/segmented";
import { ErrorNote } from "@/components/ui";
import {
  buckets,
  byCategory,
  segments,
  totalIn,
  type AnalyticsType,
  type Bucket,
  type Range,
  type Segment,
} from "@/lib/analytics";
import { useBudgets } from "@/lib/budgets";
import { useCategories } from "@/lib/categories";
import { useGoals } from "@/lib/goals";
import { formatRupiah } from "@/lib/money";
import { coverPeriodsFrom, usePeriods } from "@/lib/periods-store";
import { budgetLine, goalPlan, savingTargetFor } from "@/lib/plan";
import { useTransactions } from "@/lib/transactions";
import { useToday } from "@/lib/use-today";

const TYPES: { value: AnalyticsType; label: string }[] = [
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
  { value: "saving", label: "Saving" },
];
const RANGES: { value: Range; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All time" },
];
const VERB: Record<AnalyticsType, { label: string; sub: string }> = {
  expense: { label: "Spent", sub: "spent" },
  income: { label: "Earned", sub: "earned" },
  saving: { label: "Saved", sub: "saved" },
};
const RANGE_NOTE: Record<Range, string> = {
  week: "One bar per week, Monday to Sunday",
  month: "One bar per pay period, 25th to 24th",
  year: "One bar per year",
  all: "One bar per pay period since you started",
};

/** Analytics tab (mockup Analytics.dc.html). */
export function AnalyticsScreen() {
  const today = useToday();
  if (!today) {
    return (
      <header className="pt-3">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Analytics</h1>
      </header>
    );
  }
  return <AnalyticsBody today={today} />;
}

function AnalyticsBody({ today }: { today: string }) {
  const transactions = useTransactions();
  const categories = useCategories();
  const periods = usePeriods();
  const budgets = useBudgets();
  const goals = useGoals();

  const [type, setType] = useState<AnalyticsType>("expense");
  const [range, setRange] = useState<Range>("month");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const txs = useMemo(() => transactions.data ?? [], [transactions.data]);
  const oldest = txs.length ? txs[txs.length - 1].date : today;
  useEffect(() => {
    coverPeriodsFrom(oldest);
  }, [oldest]);

  const list = useMemo(() => buckets(range, today, periods.data ?? [], oldest), [range, today, periods.data, oldest]);
  const selected = list.find((b) => b.key === selectedKey) ?? list[list.length - 1];
  const totals = list.map((b) => totalIn(type, txs, b));
  const total = totalIn(type, txs, selected);
  const split = segments(byCategory(type, txs, selected));
  const categoryName = (id: string) => (categories.data ?? []).find((c) => c.id === id)?.name ?? "";

  // Budget / target for the selected bucket: only when it is a stored pay period.
  const storedPeriod =
    range === "month" || range === "all" ? (periods.data ?? []).find((p) => p.start === selected.start) ?? null : null;
  const planFor = (categoryId: string): number | null => {
    if (!storedPeriod) return null;
    const typed = (budgets.data ?? []).find((b) => b.periodId === storedPeriod.id && b.categoryId === categoryId)?.amount ?? null;
    if (type !== "saving") return typed;
    const g = (goals.data ?? []).find((x) => x.categoryId === categoryId);
    const suggested = g
      ? goalPlan({
          target: g.target,
          targetDate: g.targetDate,
          period: storedPeriod,
          moves: txs.filter((t) => t.categoryId === categoryId),
        }).neededThisPeriod
      : null;
    return savingTargetFor(typed, suggested);
  };

  const loadError = [transactions, categories].find((s) => s.status === "error");

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-3">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Analytics</h1>
      </header>

      <Segmented label="Show" surface="card" options={TYPES} value={type} onChange={setType} />

      {loadError && loadError.status === "error" && <ErrorNote>{loadError.message}</ErrorNote>}

      <section aria-label="Over time" className="flex flex-col gap-1 rounded-3xl bg-card p-5">
        <span className="text-[13px] font-medium text-muted">
          {VERB[type].label} · {selected.name}
        </span>
        <span className="text-[34px] leading-[1.25] font-bold tracking-[-0.03em]">{formatRupiah(total)}</span>

        <div role="group" aria-label="Time range" className="mt-3 flex flex-wrap gap-1.5">
          {RANGES.map((r) => {
            const on = r.value === range;
            return (
              <button
                key={r.value}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setRange(r.value);
                  setSelectedKey(null);
                }}
                className={`h-11 rounded-full border px-3.5 text-xs ${on ? "border-lime bg-lime font-bold" : "border-line bg-card font-semibold"}`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        <Bars list={list} totals={totals} selected={selected} onSelect={(b) => setSelectedKey(b.key)} verb={VERB[type].label} />
        <span className="mt-2 text-xs text-muted">{RANGE_NOTE[range]}. Tap a bar to see its split.</span>
      </section>

      <section aria-labelledby="split-title" className="flex flex-col gap-4 rounded-3xl bg-card p-5">
        <div className="flex flex-col gap-0.5">
          <h2 id="split-title" className="text-[17px] font-semibold">
            {type === "income" ? "Income by category" : type === "saving" ? "Savings by category" : "Spending by category"}
          </h2>
          <span className="text-[13px] text-muted">{selected.name} · top categories</span>
        </div>
        {split.length ? (
          <Donut segments={split} total={total} sub={VERB[type].sub} name={(s) => (s.key === "other" ? "Other" : categoryName(s.key))} />
        ) : (
          <p className="py-6 text-center text-[13px] font-medium text-muted">Nothing {VERB[type].sub} in {selected.name}.</p>
        )}
      </section>

      {split.length > 0 && (
        <section aria-labelledby="split-list-title" className="rounded-3xl bg-card px-5 py-2">
          <h2 id="split-list-title" className="sr-only">
            Categories in {selected.name}
          </h2>
          <ul>
            {split.map((s, i) => {
              const isOther = s.key === "other";
              const plan = isOther ? null : planFor(s.key);
              const line = plan !== null && plan > 0 ? budgetLine(plan, s.amount) : null;
              const over = line !== null && line.over && type === "expense";
              return (
                <li key={s.key} className={`flex flex-col gap-1.5 py-3.5 ${i ? "border-t border-page" : ""}`}>
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="size-2.5 flex-none rounded-full shadow-[inset_0_0_0_1px_rgba(17,17,17,0.15)]"
                      style={{ background: s.colour }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                      {isOther ? "Other" : categoryName(s.key)}
                    </span>
                    <span className="text-[15px] font-bold whitespace-nowrap">{formatRupiah(s.amount)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2 pl-5 text-xs">
                    {isOther ? (
                      <span className="text-muted">
                        {s.categoryIds.length} more {s.categoryIds.length === 1 ? "category" : "categories"}
                      </span>
                    ) : over ? (
                      <span className="rounded-full bg-ember px-2 py-0.5 font-semibold text-white">
                        {formatRupiah(line!.remaining)} over budget
                      </span>
                    ) : line ? (
                      <span className="text-muted">
                        {line.percent}% of {type === "saving" ? "target" : type === "income" ? "expected" : "budget"}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="font-semibold text-muted">{s.share}% of total</span>
                  </span>
                  {line && (
                    <span aria-hidden className="ml-5 h-1 overflow-hidden rounded-full bg-page">
                      <span
                        className={`block h-full rounded-full ${over ? "bg-ember" : "bg-ink"}`}
                        style={{ width: `${line.barPercent}%` }}
                      />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Bar per bucket; the selected one is lime. Each bar is a button. Scrolls sideways when there are many. */
function Bars({
  list,
  totals,
  selected,
  onSelect,
  verb,
}: {
  list: Bucket[];
  totals: number[];
  selected: Bucket;
  onSelect: (b: Bucket) => void;
  verb: string;
}) {
  const max = Math.max(1, ...totals.map((t) => Math.max(0, t)));
  const many = list.length > 12;
  return (
    <div className={`mt-4 ${many ? "no-scrollbar -mx-5 overflow-x-auto px-5" : ""}`}>
      <ul aria-label={`${verb} per ${list.length > 1 ? "bar" : "period"}`} className="flex h-[170px] items-end gap-1.5">
        {list.map((b, i) => {
          const on = b.key === selected.key;
          const v = Math.max(0, totals[i]);
          const h = v > 0 ? Math.max(6, Math.round((v / max) * 130)) : 4;
          return (
            <li key={b.key} className={`flex h-full flex-col items-center justify-end ${many ? "w-7 flex-none" : "flex-1"}`}>
              <button
                type="button"
                aria-pressed={on}
                aria-label={`${b.name}: ${formatRupiah(totals[i])}`}
                onClick={() => onSelect(b)}
                className="flex h-full w-full flex-col items-center justify-end gap-1.5"
              >
                <span
                  aria-hidden
                  className={`block w-full rounded-md transition-colors duration-150 ${on ? "bg-lime" : "bg-line"}`}
                  style={{ height: h }}
                />
                <span aria-hidden className={`text-[11px] ${on ? "font-bold text-ink" : "font-medium text-muted"}`}>
                  {b.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Donut of the split (top 5 + Other) with the total in the middle. */
function Donut({
  segments: segs,
  total,
  sub,
  name,
}: {
  segments: Segment[];
  total: number;
  sub: string;
  name: (s: Segment) => string;
}) {
  const R = 80;
  const C = 2 * Math.PI * R;
  const sum = segs.reduce((s, x) => s + x.amount, 0);
  const gap = segs.length > 1 ? 3 : 0;
  // Each arc starts where the previous ones end.
  const arcs = segs.map((s, i) => ({
    s,
    len: (s.amount / sum) * C,
    start: (segs.slice(0, i).reduce((n, x) => n + x.amount, 0) / sum) * C,
  }));
  return (
    <div className="relative size-[200px] self-center">
      <svg
        role="img"
        aria-label={`Split by category: ${segs.map((s) => `${name(s)} ${s.share}%`).join(", ")}`}
        width="200"
        height="200"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r={R} fill="none" stroke="#F2F2F2" strokeWidth="28" />
        {arcs.map(({ s, len, start }) => (
            <circle
              key={s.key}
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={s.colour}
              strokeWidth="28"
              strokeDasharray={`${Math.max(len - gap, 0)} ${C}`}
              strokeDashoffset={-start}
              transform="rotate(-90 100 100)"
            />
        ))}
      </svg>
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className={`max-w-[136px] text-center leading-tight font-bold ${formatRupiah(total).length > 13 ? "text-[15px]" : formatRupiah(total).length > 11 ? "text-[17px]" : "text-xl"}`}>
          {formatRupiah(total)}
        </span>
        <span className="text-xs text-muted">{sub}</span>
      </div>
    </div>
  );
}

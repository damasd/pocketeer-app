"use client";

import { PageTitle } from "@/components/screen";

import { useEffect, useId, useMemo, useState } from "react";
import { CountUp, useEntrance } from "@/components/animated";
import { Segmented } from "@/components/segmented";
import { ErrorNote } from "@/components/ui";
import { RevealButton, useMoney } from "@/components/amount";
import {
  buckets,
  byCategory,
  plannedIn,
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
import { coverPeriodsFrom, usePeriods } from "@/lib/periods-store";
import { goalPlan, savingTargetFor } from "@/lib/plan";
import { useTransactions } from "@/lib/transactions";
import { useToday } from "@/lib/use-today";

const TYPES: { value: AnalyticsType; label: string }[] = [
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
  { value: "saving", label: "Saving" },
];
const RANGES: { value: Range; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];
/** Legend words: what was planned, and what really happened. */
const PLAN_WORD: Record<AnalyticsType, string> = { expense: "Budget", income: "Expected", saving: "Target" };

const VERB: Record<AnalyticsType, { label: string; sub: string }> = {
  expense: { label: "Spent", sub: "spent" },
  income: { label: "Earned", sub: "earned" },
  saving: { label: "Saved", sub: "saved" },
};
/** Analytics tab (mockup Analytics.dc.html). */
export function AnalyticsScreen() {
  const today = useToday();
  if (!today) {
    return (
      <header className="flex h-14 items-center pt-3">
        <PageTitle>Analytics</PageTitle>
      </header>
    );
  }
  return <AnalyticsBody today={today} />;
}

function AnalyticsBody({ today }: { today: string }) {
  const { money } = useMoney();
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
  // The bar you tapped, else the one containing today (quarters can run past today).
  const selected =
    list.find((b) => b.key === selectedKey) ?? list.find((b) => b.start <= today && today <= b.end) ?? list[list.length - 1];
  const totals = list.map((b) => totalIn(type, txs, b));
  const total = totalIn(type, txs, selected);
  const split = segments(byCategory(type, txs, selected));
  const categoryName = (id: string) => (categories.data ?? []).find((c) => c.id === id)?.name ?? "";

  // Charts and numbers play their entrance when the page shows, when the data first arrives, and
  // when you switch type or range. The split (donut, list) also replays for another bar.
  const chartKey = `${type}|${range}|${transactions.data ? "ready" : "loading"}`;
  const splitKey = `${chartKey}|${selected.key}`;

  // What was planned for each bar: budgets, expected income or saving targets of the pay periods
  // inside it (a saving goal with no typed target counts what it needs that period).
  const typedFor = (periodId: string, categoryId: string) =>
    (budgets.data ?? []).find((b) => b.periodId === periodId && b.categoryId === categoryId)?.amount ?? null;
  const planOf = (periodId: string): number => {
    const p = (periods.data ?? []).find((x) => x.id === periodId);
    if (!p) return 0;
    return (categories.data ?? [])
      .filter((c) => c.kind === type)
      .reduce((sum, c) => {
        const typed = typedFor(periodId, c.id);
        if (type !== "saving") return sum + (typed ?? 0);
        const g = (goals.data ?? []).find((x) => x.categoryId === c.id);
        const suggested = g?.targetDate
          ? goalPlan({ target: g.target, targetDate: g.targetDate, period: p, moves: txs.filter((t) => t.categoryId === c.id) })
              .neededThisPeriod
          : null;
        return sum + (savingTargetFor(typed, suggested) ?? 0);
      }, 0);
  };
  const plans = list.map((b) => plannedIn(b, periods.data ?? [], planOf));
  const plan = plans[list.indexOf(selected)] ?? 0;

  const loadError = [transactions, categories].find((s) => s.status === "error");

  return (
    <div className="flex flex-col gap-5">
      {/* −4 px so the Expenses/Income/Saving switch lines up with Target's Plan/Goals (16 px under the title). */}
      <header className="-mb-1 flex h-14 items-center pt-3">
        <PageTitle>Analytics</PageTitle>
      </header>

      <Segmented label="Show" surface="card" options={TYPES} value={type} onChange={setType} />

      {loadError && loadError.status === "error" && <ErrorNote>{loadError.message}</ErrorNote>}

      <section aria-label="Over time" className="flex flex-col gap-1 rounded-card bg-card p-5">
        <span className="flex items-center gap-1 text-meta font-medium text-muted">
          {VERB[type].label}
          <RevealButton />
        </span>
        <CountUp
          value={total}
          format={money}
          replay={chartKey}
          className="text-amount leading-[1.25] font-bold tracking-[-0.03em] tabular-nums"
        />

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
                className={`h-11 rounded-full border px-3.5 text-caption ${on ? "border-lime bg-lime font-bold" : "border-line bg-card font-semibold"}`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        {/* The period the number and the picked bar refer to. */}
        <span className="mt-2 text-meta font-medium text-muted">{selected.name}</span>

        <Bars
          list={list}
          totals={totals}
          plans={plans}
          selected={selected}
          onSelect={(b) => setSelectedKey(b.key)}
          verb={VERB[type].label}
          replay={chartKey}
        />
        {/* Legend for the bar picked: the light part is the plan, the dark part what really happened. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-caption">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="hatch-lime size-3 rounded-bar" />
            <span className="text-muted">{PLAN_WORD[type]}</span>
            <span className="font-bold tabular-nums">{money(plan)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-bar bg-lime" />
            <span className="text-muted">{VERB[type].label}</span>
            <span className="font-bold tabular-nums">{money(total)}</span>
          </span>
        </div>
      </section>

      <section aria-labelledby="split-title" className="flex flex-col gap-4 rounded-card bg-card p-5">
        <div className="flex flex-col gap-0.5">
          <h2 id="split-title" className="text-heading font-semibold">
            {type === "income" ? "Income by category" : type === "saving" ? "Savings by category" : "Spending by category"}
          </h2>
          <span className="text-meta text-muted">{selected.name}</span>
        </div>
        {split.length ? (
          <Donut
            segments={split}
            total={total}
            sub={VERB[type].sub}
            name={(s) => (s.key === "other" ? "Other" : categoryName(s.key))}
            replay={splitKey}
          />
        ) : (
          <p className="py-6 text-center text-meta font-medium text-muted">Nothing {VERB[type].sub} in {selected.name}.</p>
        )}
      </section>

      {split.length > 0 && (
        <section aria-labelledby="split-list-title" className="rounded-card bg-card px-5 py-2">
          <h2 id="split-list-title" className="sr-only">
            Categories in {selected.name}
          </h2>
          <ul>
            {split.map((s, i) => (
              <li key={s.key} className={`flex items-center gap-2.5 py-3.5 ${i ? "border-t border-page" : ""}`}>
                <span
                  aria-hidden
                  className="size-2.5 flex-none rounded-full shadow-[inset_0_0_0_1px_rgba(17,17,17,0.15)]"
                  style={{ background: s.colour }}
                />
                <span className="min-w-0 flex-1 truncate text-body font-semibold">
                  {s.key === "other" ? `Other (${s.categoryIds.length})` : categoryName(s.key)}
                </span>
                <CountUp
                  value={s.amount}
                  format={money}
                  replay={splitKey}
                  className="text-body font-bold whitespace-nowrap tabular-nums"
                />
                <span className="w-10 flex-none text-right text-caption font-semibold text-muted tabular-nums">{s.share}%</span>
              </li>
            ))}
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
  plans,
  selected,
  onSelect,
  verb,
  replay,
}: {
  list: Bucket[];
  totals: number[];
  plans: number[];
  selected: Bucket;
  onSelect: (b: Bucket) => void;
  verb: string;
  replay: string;
}) {
  const { money } = useMoney();
  const ref = useEntrance<HTMLUListElement>("[data-bar]", [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], {
    replay,
    duration: 700,
    stagger: 45,
    maxStagger: 450,
  });
  const max = Math.max(1, ...totals.map((t) => Math.max(0, t)), ...plans);
  const px = (v: number) => (v > 0 ? Math.max(6, Math.round((v / max) * 130)) : 0);
  const many = list.length > 12;
  return (
    <div className={`mt-4 ${many ? "no-scrollbar -mx-5 overflow-x-auto px-5" : ""}`}>
      <ul ref={ref} aria-label={`${verb} per ${list.length > 1 ? "bar" : "period"}`} className="flex h-[170px] items-end gap-1.5">
        {list.map((b, i) => {
          const on = b.key === selected.key;
          const done = px(Math.max(0, totals[i]));
          const planned = px(plans[i]);
          const h = Math.max(done, planned, 4); // an empty bar keeps a small stub
          return (
            <li key={b.key} className={`flex h-full flex-col items-center justify-end ${many ? "w-7 flex-none" : "flex-1"}`}>
              <button
                type="button"
                aria-pressed={on}
                aria-label={`${b.name}: ${money(totals[i])}${plans[i] > 0 ? ` of ${money(plans[i])} planned` : ""}`}
                onClick={() => onSelect(b)}
                className="flex h-full w-full flex-col items-center justify-end gap-1.5"
              >
                <span aria-hidden data-bar className="relative block w-full origin-bottom" style={{ height: h }}>
                  <span
                    className={`absolute inset-x-0 bottom-0 rounded-bar transition-colors duration-150 ${on ? "hatch-lime" : "hatch-grey"}`}
                    style={{ height: planned }}
                  />
                  <span
                    className={`absolute inset-x-0 bottom-0 rounded-bar transition-colors duration-150 ${on ? "bg-lime" : "bg-[#C9C9C9]"}`}
                    style={{ height: done || (planned ? 0 : 4) }}
                  />
                </span>
                <span aria-hidden className={`text-caption ${on ? "font-bold text-ink" : "font-medium text-muted"}`}>
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
  replay,
}: {
  segments: Segment[];
  total: number;
  sub: string;
  name: (s: Segment) => string;
  replay: string;
}) {
  const { money } = useMoney();
  const R = 80;
  const C = 2 * Math.PI * R;
  // The coloured arcs show through a mask whose ring is drawn in, clockwise from the top.
  const maskId = `donut-${useId().replace(/:/g, "")}`;
  const ref = useEntrance<SVGSVGElement>("[data-sweep]", [{ strokeDashoffset: `${C}` }, { strokeDashoffset: "0" }], {
    replay,
    duration: 1100,
    easing: "cubic-bezier(0.45, 0, 0.2, 1)", // even sweep, soft finish
  });
  const sum = segs.reduce((s, x) => s + x.amount, 0);
  const gap = segs.length > 1 ? 3 : 0;
  // Each arc starts where the previous ones end.
  const arcs = segs.map((s, i) => ({
    s,
    len: (s.amount / sum) * C,
    start: (segs.slice(0, i).reduce((n, x) => n + x.amount, 0) / sum) * C,
  }));
  return (
    <div className="relative size-[260px] self-center">
      <svg
        role="img"
        aria-label={`Split by category: ${segs.map((s) => `${name(s)} ${s.share}%`).join(", ")}`}
        width="260"
        height="260"
        viewBox="0 0 200 200"
        ref={ref}
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
            <circle
              data-sweep
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke="white"
              strokeWidth="32"
              strokeDasharray={`${C} ${C}`}
              strokeDashoffset={0}
              transform="rotate(-90 100 100)"
            />
          </mask>
        </defs>
        <circle cx="100" cy="100" r={R} fill="none" stroke="#F2F2F2" strokeWidth="28" />
        <g mask={`url(#${maskId})`}>
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
        </g>
      </svg>
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className={`max-w-[176px] text-center leading-tight font-bold ${money(total).length > 13 ? "text-heading" : "text-title"}`}>
          <CountUp value={total} format={money} replay={replay} duration={1000} className="tabular-nums" />
        </span>
        <span className="text-meta text-muted">{sub}</span>
      </div>
    </div>
  );
}

"use client";

import { SubHeader } from "@/components/screen";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, Search, SlidersHorizontal } from "lucide-react";
import { LogCloseButton, LogForm, LogInputButtons, LogTitle } from "@/components/log-sheet";
import { Sheet } from "@/components/sheet";
import { ErrorNote } from "@/components/ui";
import { useAccounts } from "@/lib/accounts";
import { useCategories } from "@/lib/categories";
import { TransactionRow } from "@/components/transaction-row";
import { NO_FILTER, filterHistory, groupByDay, type HistoryFilter, type TypeFilter } from "@/lib/history";
import { localDate } from "@/lib/log";
import { periodFor, periodRangeLabel } from "@/lib/periods";
import { coverPeriodsFrom, periodOf, usePeriods } from "@/lib/periods-store";
import { useTransactions, type Transaction } from "@/lib/transactions";

const TYPE_CHIPS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
  { value: "saving", label: "Saving" },
];

const ALL = "all";
const CURRENT = "current";

/** All transactions (mockup History.dc.html), grouped by day, with filters. */
export function HistoryScreen() {
  const params = useSearchParams();
  const fromAccount = params.get("account");

  const transactions = useTransactions();
  const accounts = useAccounts();
  const categories = useCategories();

  const today = localDate();
  // "current" until a period is picked, so it follows the stored (possibly hand-edited) dates.
  const [periodStart, setPeriodStart] = useState<string>(fromAccount ? ALL : CURRENT);
  const [accountId, setAccountId] = useState<string>(fromAccount ?? ALL);
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [type, setType] = useState<TypeFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);

  const txs = useMemo(() => transactions.data ?? [], [transactions.data]);
  const accountList = useMemo(() => accounts.data ?? [], [accounts.data]);
  const categoryList = useMemo(() => categories.data ?? [], [categories.data]);
  const accountName = (id: string | null) => accountList.find((a) => a.id === id)?.name ?? "";
  const category = (id: string | null) => categoryList.find((c) => c.id === id) ?? null;

  // Stored pay periods up to today, newest first; they reach back to the oldest transaction.
  const stored = usePeriods();
  const oldest = txs.length ? txs[txs.length - 1].date : null;
  useEffect(() => {
    coverPeriodsFrom(oldest);
  }, [oldest]);
  const periods = useMemo(() => {
    return (stored.data ?? []).filter((p) => p.start <= today);
  }, [stored.data, today]);
  const period =
    periodStart === ALL
      ? null
      : periodStart === CURRENT
        ? (periodOf(periods, today) ?? periodFor(today))
        : (periods.find((p) => p.start === periodStart) ?? periodFor(periodStart));

  const filter: HistoryFilter = {
    ...NO_FILTER,
    period,
    accountId: accountId === ALL ? null : accountId,
    categoryId: categoryId === ALL ? null : categoryId,
    type,
    query,
  };
  const shown = filterHistory(txs, filter, { account: accountName, category: (id) => category(id)?.name ?? "" });
  const groups = groupByDay(shown, today);

  const loading = transactions.status === "loading" && !transactions.data;
  const loadError = [transactions, accounts, categories].find((s) => s.status === "error");

  // Filters changed from the default view (this pay period, everything else "all").
  const activeFilters =
    (periodStart !== CURRENT ? 1 : 0) + (accountId !== ALL ? 1 : 0) + (categoryId !== ALL ? 1 : 0) + (type !== "all" ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Back, the title in the middle, and + to log a transaction (as the nav bar's Log button). */}
      <SubHeader
        title="Transactions"
        back={fromAccount ? "/account" : "/"}
        backLabel={fromAccount ? "Back to Accounts" : "Back to Home"}
        action={
          <button
            type="button"
            aria-label="Log transaction"
            aria-haspopup="dialog"
            onClick={() => setAdding(true)}
            className="flex size-11 items-center justify-center rounded-full bg-accent text-on-accent"
          >
            <Plus aria-hidden size={20} strokeWidth={2.5} />
          </button>
        }
      />

      <div className="flex items-center gap-2">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-card px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
          <Search aria-hidden size={18} strokeWidth={2.25} className="flex-none text-muted" />
          <input
            type="search"
            aria-label="Search notes, categories and accounts"
            placeholder="Search transactions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-input outline-none placeholder:text-muted"
          />
        </label>
        <button
          type="button"
          aria-label={activeFilters ? `Filters, ${activeFilters} on` : "Filters"}
          aria-haspopup="dialog"
          onClick={() => setFiltersOpen(true)}
          className={`relative flex size-11 flex-none items-center justify-center rounded-full border ${
            activeFilters ? "border-select bg-select text-on-select" : "border-line bg-card"
          }`}
        >
          <SlidersHorizontal aria-hidden size={18} strokeWidth={2.25} />
          {activeFilters > 0 && (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-accent text-caption font-bold text-on-accent ring-2 ring-page"
            >
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter">
        <div className="flex flex-col gap-4">
          <FilterField
            label="Pay period"
            value={period ? period.start : ALL}
            display={period ? `${period.name} (${periodRangeLabel(period)})` : "All time"}
            onChange={setPeriodStart}
          >
            {periods.map((p) => (
              <option key={p.start} value={p.start}>
                {p.name} ({periodRangeLabel(p)})
              </option>
            ))}
            <option value={ALL}>All time</option>
          </FilterField>

          <FilterField
            label="Account"
            value={accountId}
            display={accountId === ALL ? "All accounts" : accountName(accountId) || "Account"}
            onChange={setAccountId}
          >
            <option value={ALL}>All accounts</option>
            {accountList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.archived ? " (archived)" : ""}
              </option>
            ))}
          </FilterField>

          <FilterField
            label="Category"
            value={categoryId}
            display={categoryId === ALL ? "All categories" : (category(categoryId)?.name ?? "Category")}
            onChange={setCategoryId}
          >
            <option value={ALL}>All categories</option>
            {(["expense", "income", "saving"] as const).map((kind) => (
              <optgroup key={kind} label={kind[0].toUpperCase() + kind.slice(1)}>
                {categoryList
                  .filter((c) => c.kind === kind)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.archived ? " (archived)" : ""}
                    </option>
                  ))}
              </optgroup>
            ))}
          </FilterField>

          <div className="flex flex-col gap-2">
            <span id="type-label" className="text-meta font-medium text-muted">
              Type
            </span>
            <div role="group" aria-labelledby="type-label" className="flex flex-wrap gap-2">
              {TYPE_CHIPS.map((c) => {
                const on = c.value === type;
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setType(c.value)}
                    className={`h-11 flex-none rounded-full border px-4 text-meta font-semibold transition-colors duration-150 ${
                      on ? "border-accent bg-accent text-on-accent" : "border-line bg-card"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={activeFilters === 0}
              onClick={() => {
                setPeriodStart(CURRENT);
                setAccountId(ALL);
                setCategoryId(ALL);
                setType("all");
              }}
              className="h-12 flex-1 rounded-full border border-line bg-card text-body font-semibold disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="h-12 flex-[2] rounded-full bg-accent text-body font-bold text-on-accent"
            >
              Show {shown.length} {shown.length === 1 ? "transaction" : "transactions"}
            </button>
          </div>
        </div>
      </Sheet>

      <p className="text-meta text-muted" aria-live="polite">
        {loading
          ? "Loading…"
          : [
              `${shown.length} ${shown.length === 1 ? "transaction" : "transactions"}`,
              period ? `${period.name} (${periodRangeLabel(period)})` : "All time",
              accountId !== ALL ? accountName(accountId) : null,
              categoryId !== ALL ? category(categoryId)?.name : null,
              type !== "all" ? TYPE_CHIPS.find((c) => c.value === type)?.label : null,
            ]
              .filter(Boolean)
              .join(" · ")}
      </p>

      {loadError && loadError.status === "error" && <ErrorNote>{loadError.message}</ErrorNote>}

      {!loading && groups.length === 0 ? (
        <div className="rounded-card bg-card px-5 py-8 text-center">
          <p className="text-body font-semibold">No transactions</p>
          <p className="mt-1 text-meta font-medium text-muted">
            {txs.length === 0 ? "Tap + to log your first one." : "Nothing matches these filters."}
          </p>
        </div>
      ) : (
        <div className="rounded-card bg-card px-4 pt-1 pb-2">
          {loading &&
            [0, 1, 2].map((i) => (
              <div key={i} aria-hidden className="flex items-center gap-3 py-2.5">
                <span className="size-10 rounded-full bg-page" />
                <span className="h-4 flex-1 rounded-bar bg-page" />
              </div>
            ))}
          {groups.map((g) => (
            <section key={g.date} aria-label={g.label}>
              <h2 className="pt-3 pb-0.5 text-caption font-semibold text-muted">{g.label}</h2>
              <ul>
                {g.items.map((t) => (
                  <li key={t.id}>
                    <TransactionRow
                      tx={t}
                      categoryName={category(t.categoryId)?.name ?? ""}
                      categoryIcon={category(t.categoryId)?.icon ?? "ellipsis"}
                      accountName={accountName}
                      onOpen={() => setEditing(t)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Log transaction" heading={<LogTitle />} leading={<LogCloseButton />} actions={<LogInputButtons />}>
        <LogForm onDone={() => setAdding(false)} />
      </Sheet>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Edit transaction">
        {editing && <LogForm key={editing.id} editing={editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}

/** One filter in the Filter sheet: its name, then a full-width field that opens the phone's picker. */
function FilterField({
  label,
  value,
  display,
  onChange,
  children,
}: {
  label: string;
  value: string;
  display: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-meta font-medium text-muted">{label}</span>
      <span className="relative flex h-12 items-center justify-between gap-2 rounded-tile bg-page px-4 text-body font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
        <span aria-hidden className="truncate">
          {display}
        </span>
        <ChevronDown aria-hidden size={18} strokeWidth={2.25} className="flex-none text-muted" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer appearance-none opacity-0"
        >
          {children}
        </select>
      </span>
    </label>
  );
}

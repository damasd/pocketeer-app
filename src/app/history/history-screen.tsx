"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ChevronDown, ChevronLeft, Search, X } from "lucide-react";
import { LogForm } from "@/components/log-sheet";
import { Sheet } from "@/components/sheet";
import { ErrorNote } from "@/components/ui";
import { useAccounts } from "@/lib/accounts";
import { useCategories } from "@/lib/categories";
import { CategoryIcon } from "@/lib/category-icons";
import { NO_FILTER, filterHistory, groupByDay, signedAmount, type HistoryFilter, type TypeFilter } from "@/lib/history";
import { localDate } from "@/lib/log";
import { periodFor, periodRangeLabel, periodsBetween } from "@/lib/periods";
import { useTransactions, type Transaction } from "@/lib/transactions";

const TYPE_CHIPS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
  { value: "saving", label: "Saving" },
];

const ALL = "all";

/** All transactions (mockup History.dc.html), grouped by day, with filters. */
export function HistoryScreen() {
  const params = useSearchParams();
  const fromAccount = params.get("account");

  const transactions = useTransactions();
  const accounts = useAccounts();
  const categories = useCategories();

  const today = localDate();
  const [periodStart, setPeriodStart] = useState<string>(() => (fromAccount ? ALL : periodFor(today).start));
  const [accountId, setAccountId] = useState<string>(fromAccount ?? ALL);
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [type, setType] = useState<TypeFilter>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);

  const txs = useMemo(() => transactions.data ?? [], [transactions.data]);
  const accountList = useMemo(() => accounts.data ?? [], [accounts.data]);
  const categoryList = useMemo(() => categories.data ?? [], [categories.data]);
  const accountName = (id: string | null) => accountList.find((a) => a.id === id)?.name ?? "";
  const category = (id: string | null) => categoryList.find((c) => c.id === id) ?? null;

  // Periods from the oldest transaction to today, newest first.
  const periods = useMemo(() => {
    const oldest = txs.length ? txs[txs.length - 1].date : today;
    return periodsBetween(oldest < today ? oldest : today, today);
  }, [txs, today]);
  const period = periodStart === ALL ? null : (periods.find((p) => p.start === periodStart) ?? periodFor(periodStart));

  const filter: HistoryFilter = {
    ...NO_FILTER,
    period,
    accountId: accountId === ALL ? null : accountId,
    categoryId: categoryId === ALL ? null : categoryId,
    type,
    query: searchOpen ? query : "",
  };
  const shown = filterHistory(txs, filter, { account: accountName, category: (id) => category(id)?.name ?? "" });
  const groups = groupByDay(shown, today);

  const loading = transactions.status === "loading" && !transactions.data;
  const loadError = [transactions, accounts, categories].find((s) => s.status === "error");

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-2 pt-3">
        <Link
          href={fromAccount ? "/account" : "/"}
          aria-label={fromAccount ? "Back to Accounts" : "Back to Home"}
          className="flex size-11 flex-none items-center justify-center rounded-full border border-line bg-card"
        >
          <ChevronLeft aria-hidden size={18} strokeWidth={2.25} />
        </Link>
        <h1 className="flex-1 text-center text-[17px] font-bold">Transactions</h1>
        <button
          type="button"
          aria-label={searchOpen ? "Close search" : "Search transactions"}
          aria-expanded={searchOpen}
          onClick={() => {
            setSearchOpen((o) => !o);
            setQuery("");
          }}
          className="flex size-11 flex-none items-center justify-center rounded-full border border-line bg-card"
        >
          {searchOpen ? <X aria-hidden size={18} strokeWidth={2.25} /> : <Search aria-hidden size={18} strokeWidth={2.25} />}
        </button>
      </header>

      {searchOpen && (
        <input
          type="search"
          aria-label="Search notes, categories and accounts"
          placeholder="Search notes, categories, accounts"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 rounded-full border border-line bg-card px-4 text-base placeholder:text-muted"
        />
      )}

      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        <FilterSelect
          label="Pay period"
          value={periodStart}
          active={periodStart !== ALL}
          display={period ? period.name : "All time"}
          onChange={setPeriodStart}
        >
          {periods.map((p) => (
            <option key={p.start} value={p.start}>
              {p.name} ({periodRangeLabel(p)})
            </option>
          ))}
          <option value={ALL}>All time</option>
        </FilterSelect>

        <FilterSelect
          label="Account"
          value={accountId}
          active={accountId !== ALL}
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
        </FilterSelect>

        <FilterSelect
          label="Category"
          value={categoryId}
          active={categoryId !== ALL}
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
        </FilterSelect>
      </div>

      <div role="group" aria-label="Transaction type" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {TYPE_CHIPS.map((c) => {
          const on = c.value === type;
          return (
            <button
              key={c.value}
              type="button"
              aria-pressed={on}
              onClick={() => setType(c.value)}
              className={`h-11 flex-none rounded-full border px-4 text-[13px] font-semibold transition-colors duration-150 ${
                on ? "border-lime bg-lime" : "border-line bg-card"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <p className="text-[13px] text-muted" aria-live="polite">
        {loading
          ? "Loading…"
          : `${shown.length} ${shown.length === 1 ? "transaction" : "transactions"} · ${period ? periodRangeLabel(period) : "All time"}`}
      </p>

      {loadError && loadError.status === "error" && <ErrorNote>{loadError.message}</ErrorNote>}

      {!loading && groups.length === 0 ? (
        <div className="rounded-3xl bg-card px-5 py-8 text-center">
          <p className="text-[15px] font-semibold">No transactions</p>
          <p className="mt-1 text-[13px] font-medium text-muted">
            {txs.length === 0 ? "Tap + to log your first one." : "Nothing matches these filters."}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-card px-4 pt-1 pb-2">
          {loading &&
            [0, 1, 2].map((i) => (
              <div key={i} aria-hidden className="flex items-center gap-3 py-2.5">
                <span className="size-10 rounded-full bg-page" />
                <span className="h-4 flex-1 rounded bg-page" />
              </div>
            ))}
          {groups.map((g) => (
            <section key={g.date} aria-label={g.label}>
              <h2 className="pt-3 pb-0.5 text-xs font-semibold text-muted">{g.label}</h2>
              <ul>
                {g.items.map((t) => (
                  <li key={t.id}>
                    <Row
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

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Edit transaction" tall>
        {editing && <LogForm key={editing.id} editing={editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}

/** A filter chip that opens the phone's native picker. Black when it is filtering. */
function FilterSelect({
  label,
  value,
  display,
  active,
  onChange,
  children,
}: {
  label: string;
  value: string;
  display: string;
  active: boolean;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`relative flex h-11 flex-none items-center gap-1 rounded-full border pr-3 pl-3.5 text-[13px] font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-lime ${
        active ? "border-ink bg-ink text-white" : "border-line bg-card text-ink"
      }`}
    >
      <span className="sr-only">{label}: </span>
      <span aria-hidden>{display}</span>
      <ChevronDown aria-hidden size={16} strokeWidth={2.25} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {children}
      </select>
    </label>
  );
}

function Row({
  tx,
  categoryName,
  categoryIcon,
  accountName,
  onOpen,
}: {
  tx: Transaction;
  categoryName: string;
  categoryIcon: string;
  accountName: (id: string | null) => string;
  onOpen?: () => void;
}) {
  const saving = tx.type === "saving_deposit" || tx.type === "saving_withdraw";
  const title = tx.note || categoryName || (tx.type === "transfer" ? "Transfer" : "Transaction");
  const sub =
    tx.type === "transfer"
      ? `Transfer · ${accountName(tx.accountId)} → ${accountName(tx.toAccountId)}`
      : saving
        ? tx.accountId === tx.toAccountId
          ? `Saving · stays in ${accountName(tx.accountId)}`
          : `Saving · ${accountName(tx.accountId)} → ${accountName(tx.toAccountId)}`
        : `${categoryName} · ${accountName(tx.accountId)}`;

  const icon =
    tx.type === "income" ? (
      <span aria-hidden className="flex size-10 flex-none items-center justify-center rounded-full bg-ink text-white">
        <ArrowDownLeft size={18} strokeWidth={2} />
      </span>
    ) : tx.type === "transfer" ? (
      <span aria-hidden className="flex size-10 flex-none items-center justify-center rounded-full bg-page">
        <ArrowLeftRight size={18} strokeWidth={2} />
      </span>
    ) : (
      <span
        aria-hidden
        className={`flex size-10 flex-none items-center justify-center rounded-full ${saving ? "bg-lime" : "bg-page"}`}
      >
        <CategoryIcon name={categoryIcon} size={18} />
      </span>
    );

  const body = (
    <>
      {icon}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold">{title}</span>
        <span className="truncate text-xs text-muted">{sub}</span>
      </span>
      <span className="text-[15px] font-semibold whitespace-nowrap">{signedAmount(tx.type, tx.amount)}</span>
    </>
  );

  return onOpen ? (
    <button type="button" onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left">
      {body}
    </button>
  ) : (
    <div className="flex min-h-14 items-center gap-3 py-2.5">{body}</div>
  );
}

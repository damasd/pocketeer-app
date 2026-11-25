"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Delete } from "lucide-react";
import { DatePopover } from "@/components/date-popover";
import { FitText } from "@/components/fit-text";
import { Segmented } from "@/components/segmented";
import { showToast } from "@/components/toast";
import { ErrorNote } from "@/components/ui";
import { useAccounts, type Account } from "@/lib/accounts";
import { accountBalance, savingBalance } from "@/lib/balances";
import { useCategories } from "@/lib/categories";
import { errorMessage } from "@/lib/errors";
import {
  accountBadge,
  categoryKindFor,
  defaultAccountId,
  accountGroupsFor,
  defaultToAccountId,
  digitsToAmount,
  localDate,
  logProblem,
  modeOf,
  pressKey,
  rankByUse,
  storedType,
  type KeypadKey,
  type LogMode,
  type SavingDirection,
} from "@/lib/log";
import { haptic } from "@/lib/haptics";
import { formatRupiah } from "@/lib/money";
import { useBudgets } from "@/lib/budgets";
import { periodOf, usePeriods } from "@/lib/periods-store";
import {
  NOTE_MAX,
  createTransaction,
  deleteTransaction,
  toNewTransaction,
  updateTransaction,
  useTransactions,
  type Transaction,
} from "@/lib/transactions";

const MODES: { value: LogMode; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
  { value: "saving", label: "Saving" },
];

const DIRECTIONS: { value: SavingDirection; label: string }[] = [
  { value: "deposit", label: "Deposit" },
  { value: "withdraw", label: "Withdraw" },
];

/**
 * Log transaction form (mockup Log.dc.html): expense, income, transfer and saving (deposit or withdraw).
 * With `editing`, the form is filled in from that transaction and saves changes to it.
 */
export function LogForm({ onDone, editing = null }: { onDone: () => void; editing?: Transaction | null }) {
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();

  const start = editing ? modeOf(editing.type) : { mode: "expense" as LogMode, direction: "deposit" as SavingDirection };
  const [mode, setMode] = useState<LogMode>(start.mode);
  const [direction, setDirection] = useState<SavingDirection>(start.direction);
  const [digits, setDigits] = useState(editing ? String(editing.amount) : "");
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [chosenFromId, setChosenFromId] = useState<string | null>(editing?.accountId ?? null);
  const [chosenToId, setChosenToId] = useState<string | null>(editing?.toAccountId ?? null);
  const [openPicker, setOpenPicker] = useState<"from" | "to" | null>(null);
  const [date, setDate] = useState(editing?.date ?? localDate());
  const [note, setNote] = useState(editing?.note ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type = storedType(mode, direction);
  const kind = categoryKindFor(mode);
  const txs = useMemo(() => transactions.data ?? [], [transactions.data]);
  const budgets = useBudgets();
  const periods = usePeriods();

  // What's left of an expense category's budget in the pay period of the chosen date (this
  // transaction not counted yet; when editing, its old amount is left out).
  function budgetNote(categoryId: string): BudgetLineNote {
    const period = periodOf(periods.data ?? [], date);
    const name = (categories.data ?? []).find((c) => c.id === categoryId)?.name ?? "";
    if (!period) return { kind: "none", name, period: "" };
    const budget = (budgets.data ?? []).find((b) => b.periodId === period.id && b.categoryId === categoryId)?.amount ?? 0;
    const spent = txs
      .filter(
        (t) =>
          t.type === "expense" && t.categoryId === categoryId && t.id !== editing?.id && t.date >= period.start && t.date <= period.end,
      )
      .reduce((n, t) => n + t.amount, 0);
    if (budget <= 0) return { kind: "none", name, period: period.name };
    return { kind: budget >= spent ? "left" : "over", amount: Math.abs(budget - spent), budget, name, period: period.name };
  }

  // Archived accounts and categories are hidden, except the ones the edited transaction already uses.
  const active = useMemo(
    () =>
      (accounts.data ?? []).filter(
        (a) => !a.archived || a.id === editing?.accountId || a.id === editing?.toAccountId,
      ),
    [accounts.data, editing?.accountId, editing?.toAccountId],
  );
  // Spending accounts for everyday money; Saving accounts only through Saving (see accountGroupsFor).
  // The edited transaction keeps its own accounts even if they no longer fit the rule.
  const groups = accountGroupsFor(type);
  const fromList = active.filter((a) => a.group === groups.from || a.id === editing?.accountId);
  const toList = groups.to ? active.filter((a) => a.group === groups.to || a.id === editing?.toAccountId) : [];
  // Default "from": the account on the newest transaction of this type, else the newest of any type.
  const fromId =
    (chosenFromId && fromList.some((a) => a.id === chosenFromId) ? chosenFromId : null) ??
    defaultAccountId(fromList, [...txs.filter((t) => t.type === type), ...txs]);
  const toCandidates = mode === "transfer" ? toList.filter((a) => a.id !== fromId) : toList;
  const toId = groups.to
    ? (chosenToId && toCandidates.some((a) => a.id === chosenToId) ? chosenToId : null) ??
      defaultToAccountId(type, fromId, toCandidates, txs)
    : null;
  const from = fromList.find((a) => a.id === fromId) ?? null;
  const to = toCandidates.find((a) => a.id === toId) ?? null;
  const balanceOf = (a: Account) => accountBalance(a.id, a.startingBalance, txs);

  const chips = useMemo(() => {
    if (!kind) return [];
    const ofKind = (categories.data ?? []).filter((c) => c.kind === kind && (!c.archived || c.id === editing?.categoryId));
    const sameKind = txs.filter((t) => (kind === "saving" ? t.type.startsWith("saving") : t.type === kind));
    return rankByUse(ofKind, sameKind.map((t) => t.categoryId));
  }, [categories.data, txs, kind, editing?.categoryId]);

  const amount = digitsToAmount(digits);
  const loading = (accounts.status === "loading" && !accounts.data) || (categories.status === "loading" && !categories.data);
  const loadError =
    accounts.status === "error" ? accounts.message : categories.status === "error" ? categories.message : null;

  const fromLabel = { expense: "Pay from", income: "Into", transfer: "From", saving: "From" }[mode];

  function press(key: KeypadKey, tap = true) {
    if (tap) haptic();
    setDigits((d) => pressKey(d, key));
    setError(null);
  }

  async function save() {
    if (busy) return;
    const problem = logProblem({ mode, amount, categoryId: kind ? categoryId : null, fromId: from?.id ?? null, toId: to?.id ?? null });
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    const input = {
      date,
      type,
      amount,
      accountId: from!.id,
      toAccountId: mode === "transfer" || mode === "saving" ? to!.id : null,
      categoryId: kind ? categoryId : null,
      note,
    };
    try {
      if (editing) {
        await updateTransaction(editing.id, input);
        onDone();
        showToast({
          message: `Updated · ${formatRupiah(amount)}`,
          action: { label: "Undo", run: () => undo(() => updateTransaction(editing.id, toNewTransaction(editing))) },
        });
        return;
      }
      const tx = await createTransaction(input);
      onDone();
      showToast({
        message: `Saved · ${formatRupiah(amount)}`,
        action: {
          label: "Undo",
          run: () => undo(() => deleteTransaction(tx.id)),
        },
      });
    } catch (e) {
      setError(errorMessage(e, "Could not save"));
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteTransaction(editing.id);
      onDone();
      showToast({
        message: `Deleted · ${formatRupiah(editing.amount)}`,
        action: { label: "Undo", run: () => undo(() => createTransaction(toNewTransaction(editing))) },
      });
    } catch (e) {
      setError(errorMessage(e, "Could not delete"));
      setBusy(false);
    }
  }

  // Laptop: type digits, Backspace and Enter anywhere in the open sheet (not while typing a note).
  // Listens on the document because focus starts on the sheet's ✕ button, outside this form.
  const keyHandler = useRef<(e: KeyboardEvent) => void>(null);

  function onKeyDown(e: KeyboardEvent) {
    if (e.defaultPrevented) return;
    if ((e.target as HTMLElement).tagName === "INPUT" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      press(e.key as KeypadKey, false);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      press("back", false);
    } else if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") {
      e.preventDefault();
      save();
    }
  }
  useEffect(() => {
    keyHandler.current = onKeyDown;
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandler.current?.(e);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  if (!loading && !loadError && active.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-[17px] font-semibold">Add an account first</p>
        <p className="text-[13px] font-medium text-muted">Every transaction is paid from or paid into an account.</p>
        <Link
          href="/account"
          onClick={onDone}
          className="mt-2 flex h-12 items-center rounded-full bg-lime px-5 text-[15px] font-bold text-ink"
        >
          Go to Accounts
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Segmented
        label="Transaction type"
        options={MODES}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setCategoryId(null);
          setChosenToId(null);
          setOpenPicker(null);
          setError(null);
        }}
      />

      <div className="mt-3 flex items-center gap-3 pb-1">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
          <span className="text-[13px] font-medium text-muted">Amount</span>
          <output
            aria-live="polite"
            aria-label={`Amount ${formatRupiah(amount)}. Type digits, Enter to save`}
            tabIndex={-1}
            data-autofocus
            className="flex w-full justify-center rounded-xl px-2 outline-none"
          >
            <FitText text={formatRupiah(amount)} max={42} min={24} className="leading-[1.2] font-bold tracking-[-0.03em]" />
          </output>
        </div>
      </div>

      {/* Type and amount stay at the top; everything below scrolls when it doesn't fit. */}
      <div
        className={`no-scrollbar -mx-5 flex min-h-0 flex-1 flex-col gap-3 px-5 pb-1 ${
          // Saving holds the most (direction, category, From and To); the other tabs fit as they are.
          mode === "saving" ? "overflow-y-auto overscroll-contain" : "overflow-hidden"
        }`}
      >
        {loadError && <ErrorNote>{loadError}</ErrorNote>}

        {kind && (
          <div className="mt-3 flex flex-col gap-2">
            {mode === "saving" && (
              <div className="mb-2">
                <Segmented
                  label="Deposit or withdraw"
                  options={DIRECTIONS}
                  value={direction}
                  onChange={(v) => {
                    setDirection(v);
                    setChosenToId(null);
                    setError(null);
                  }}
                />
              </div>
            )}
            {/* The picked category's note sits on the label line, so showing it moves nothing. */}
            <div className="flex h-5 items-center justify-between gap-3 leading-5">
              <span id="category-label" className="text-[13px] font-medium text-muted">
                {mode === "saving" ? "Saving category" : "Category"}
              </span>
              <span aria-live="polite" className="text-right">
                {mode === "saving" && categoryId && (
                  <span className="text-xs text-muted">
                    <b className="font-bold text-ink">{formatRupiah(savingBalance(categoryId, txs))}</b> saved
                  </span>
                )}
                {mode === "expense" && categoryId && <BudgetNote line={budgetNote(categoryId)} />}
              </span>
            </div>
            <div role="group" aria-labelledby="category-label" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              {loading &&
                [0, 1, 2].map((i) => <span key={i} aria-hidden className="h-11 w-24 flex-none rounded-full bg-page" />)}
              {chips.map((c) => {
                const on = c.id === categoryId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setCategoryId(c.id);
                      setError(null);
                    }}
                    className={`h-11 flex-none rounded-full border px-4 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 ${
                      on ? "border-lime bg-lime text-ink" : "border-line bg-card text-ink"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
              {!loading && chips.length === 0 && (
                <Link href="/settings/categories" onClick={onDone} className="flex h-11 items-center text-[13px] font-semibold underline">
                  Add a category
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Transfer: From and To side by side. */}
        <div className={mode === "transfer" ? "grid grid-cols-2 items-start gap-3" : "contents"}>
          <AccountPicker
            id="from"
            label={fromLabel}
            accounts={fromList}
            emptyText={groups.from === "saving" ? "No Saving accounts yet." : "No Spending accounts yet."}
            onLeave={onDone}
            value={from}
            balanceOf={balanceOf}
            open={openPicker === "from"}
            onToggle={() => setOpenPicker((p) => (p === "from" ? null : "from"))}
            onPick={(a) => {
              setChosenFromId(a.id);
              setOpenPicker(null);
              setError(null);
            }}
            badge="ink"
            compact={mode === "transfer"}
          />

          {(mode === "transfer" || mode === "saving") && (
            <AccountPicker
              id="to"
              label="To"
              accounts={toCandidates}
              emptyText={groups.to === "saving" ? "No Saving accounts yet." : "No other Spending account yet."}
              onLeave={onDone}
              value={to}
              balanceOf={balanceOf}
              open={openPicker === "to"}
              onToggle={() => setOpenPicker((p) => (p === "to" ? null : "to"))}
              onPick={(a) => {
                setChosenToId(a.id);
                setOpenPicker(null);
                setError(null);
              }}
              badge="lime"
              compact={mode === "transfer"}
            />
          )}
        </div>


        {editing &&
          (confirmDelete ? (
            <div role="group" aria-label="Confirm delete" className="flex items-center gap-2 rounded-2xl bg-page p-2 pl-4">
              <span className="flex-1 text-[13px] font-semibold">Delete this transaction?</span>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-11 rounded-full px-3 text-[13px] font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={remove}
                className="h-11 rounded-full bg-ember px-4 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="h-11 self-start rounded-full px-1 text-[13px] font-semibold underline-offset-4 hover:underline"
            >
              Delete transaction
            </button>
          ))}

        {/* When and what: with the keypad at the bottom (spare room goes above). The calendar floats near the bottom of the screen. */}
        <div className="mt-auto flex flex-none gap-2">
          <DatePopover value={date} onChange={setDate} up />
          <input
            type="text"
            aria-label="Note"
            placeholder="Note"
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="h-11 min-w-0 flex-1 rounded-full border-0 bg-page px-4 text-base placeholder:text-muted"
          />
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        {/* Keys are 52 px tall, a little shorter on small screens (never under 44 px). */}
        <div className="grid flex-none grid-cols-4 grid-rows-[repeat(4,clamp(44px,6.5dvh,52px))] gap-2 pt-1">
          {(["1", "2", "3"] as const).map((k, i) => (
            <Key key={k} col={i + 1} row={1} onPress={() => press(k)}>
              {k}
            </Key>
          ))}
          <Key col={4} row={1} label="Delete last digit" onPress={() => press("back")}>
            <Delete aria-hidden size={22} strokeWidth={2} />
          </Key>
          {(["4", "5", "6"] as const).map((k, i) => (
            <Key key={k} col={i + 1} row={2} onPress={() => press(k)}>
              {k}
            </Key>
          ))}
          {(["7", "8", "9"] as const).map((k, i) => (
            <Key key={k} col={i + 1} row={3} onPress={() => press(k)}>
              {k}
            </Key>
          ))}
          <Key col="1 / span 2" row={4} onPress={() => press("0")}>
            0
          </Key>
          <Key col={3} row={4} onPress={() => press("000")} small>
            000
          </Key>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            style={{ gridColumn: 4, gridRow: "2 / span 3" }}
            className="rounded-2xl bg-lime text-[17px] font-bold text-ink transition-transform duration-100 ease-out active:scale-[0.97] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Key({
  col,
  row,
  label,
  small = false,
  onPress,
  children,
}: {
  col: number | string;
  row: number;
  label?: string;
  small?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      style={{ gridColumn: col, gridRow: row }}
      className={`flex items-center justify-center rounded-2xl bg-page font-semibold text-ink transition-transform duration-100 ease-out select-none active:scale-[0.96] ${
        small ? "text-xl" : "text-[22px]"
      }`}
    >
      {children}
    </button>
  );
}

/** Run an undo step and report the result in a toast. */
async function undo(step: () => Promise<unknown>) {
  try {
    await step();
    showToast({ message: "Undone" });
  } catch (e) {
    showToast({ message: errorMessage(e, "Could not undo"), tone: "error" });
  }
}

/** Account picker (mockup "Pay from" / "To" rows): shows the account and its balance; opens a list below. */
function AccountPicker({
  id,
  label,
  accounts,
  value,
  balanceOf,
  open,
  onToggle,
  onPick,
  badge,
  hint,
  emptyText,
  onLeave,
  compact = false,
}: {
  id: string;
  label: string;
  accounts: Account[];
  value: Account | null;
  balanceOf: (a: Account) => number;
  open: boolean;
  onToggle: () => void;
  onPick: (a: Account) => void;
  badge: "ink" | "lime";
  hint?: string;
  emptyText: string;
  /** Called when the user follows a link out of the sheet. */
  onLeave: () => void;
  /** Half width (Transfer): tighter button, each account's balance under its name in the list. */
  compact?: boolean;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <span id={`${id}-label`} className="text-[13px] font-medium text-muted">
        {label}
      </span>
      <button
        type="button"
        aria-labelledby={`${id}-label ${id}-current`}
        aria-expanded={open}
        aria-controls={`${id}-options`}
        onClick={onToggle}
        className={`flex h-14 items-center rounded-2xl bg-page text-left ${compact ? "gap-2 px-2.5" : "gap-3 px-3.5"}`}
      >
        <span
          aria-hidden
          className={`flex size-8 flex-none items-center justify-center rounded-full text-[11px] font-bold ${
            badge === "ink" ? "bg-ink text-lime" : "bg-lime text-ink"
          }`}
        >
          {value ? accountBadge(value.name) : "…"}
        </span>
        <span id={`${id}-current`} className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold">
            {value?.name ?? (accounts.length ? "Pick an account" : emptyText)}
          </span>
          {value && <span className="text-xs text-muted">{formatRupiah(balanceOf(value))}</span>}
        </span>
        <ChevronDown aria-hidden size={18} className={`flex-none transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {open && accounts.length === 0 && (
        <p id={`${id}-options`} className="rounded-2xl border border-line px-4 py-3 text-[13px] font-medium">
          {emptyText}{" "}
          <Link href="/account" onClick={onLeave} className="font-semibold underline">
            Add one in Accounts
          </Link>
          , then set its type.
        </p>
      )}
      {open && accounts.length > 0 && (
        <ul id={`${id}-options`} className="flex flex-col overflow-hidden rounded-2xl border border-line">
          {accounts.map((a) => (
            <li key={a.id} className="border-b border-line last:border-0">
              <button
                type="button"
                aria-pressed={a.id === value?.id}
                onClick={() => onPick(a)}
                className={`flex min-h-12 w-full py-2 text-left ${
                  compact ? "flex-col items-start justify-center gap-0.5 px-3" : "items-center justify-between gap-3 px-4"
                } ${a.id === value?.id ? "bg-page" : "bg-card"}`}
              >
                <span className="max-w-full truncate text-[15px] font-semibold">{a.name}</span>
                <span className={`text-muted ${compact ? "text-xs" : "text-[13px]"}`}>{formatRupiah(balanceOf(a))}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type BudgetLineNote =
  | { kind: "none"; name: string; period: string }
  | { kind: "left" | "over"; amount: number; budget: number; name: string; period: string };

/**
 * Under the expense categories: what's left of the picked one's budget this period. Over budget,
 * the amount is ember (4.57:1 on white, bold: readable).
 */
function BudgetNote({ line }: { line: BudgetLineNote }) {
  if (line.kind === "none") return <span className="text-xs text-muted">No budget set</span>;
  return (
    <span className="text-xs text-muted">
      <b className={`font-bold ${line.kind === "over" ? "text-ember" : "text-ink"}`}>{formatRupiah(line.amount)}</b>{" "}
      {line.kind === "over" ? "over" : "left"}
    </span>
  );
}

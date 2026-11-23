"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Delete } from "lucide-react";
import { Segmented } from "@/components/segmented";
import { showToast } from "@/components/toast";
import { ErrorNote } from "@/components/ui";
import { useAccounts } from "@/lib/accounts";
import { accountBalance } from "@/lib/balances";
import { useCategories } from "@/lib/categories";
import { errorMessage } from "@/lib/errors";
import {
  accountBadge,
  dateLabel,
  defaultAccountId,
  digitsToAmount,
  localDate,
  pressKey,
  rankByUse,
  type KeypadKey,
} from "@/lib/log";
import { formatRupiah } from "@/lib/money";
import {
  NOTE_MAX,
  createTransaction,
  deleteTransaction,
  toNewTransaction,
  updateTransaction,
  useTransactions,
  type Transaction,
} from "@/lib/transactions";

type LogType = "expense" | "income";

const TYPES: { value: LogType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

/**
 * Log transaction form (mockup Log.dc.html). Expense and income for now; transfer and saving in slice 6.
 * With `editing`, the form is filled in from that transaction and saves changes to it.
 */
export function LogForm({ onDone, editing = null }: { onDone: () => void; editing?: Transaction | null }) {
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();

  const [type, setType] = useState<LogType>(editing?.type === "income" ? "income" : "expense");
  const [digits, setDigits] = useState(editing ? String(editing.amount) : "");
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [chosenAccountId, setChosenAccountId] = useState<string | null>(editing?.accountId ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [date, setDate] = useState(editing?.date ?? localDate());
  const [note, setNote] = useState(editing?.note ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const txs = useMemo(() => transactions.data ?? [], [transactions.data]);
  // Archived accounts and categories are hidden, except the ones the edited transaction already uses.
  const active = useMemo(
    () => (accounts.data ?? []).filter((a) => !a.archived || a.id === editing?.accountId),
    [accounts.data, editing?.accountId],
  );
  const accountId = chosenAccountId ?? defaultAccountId(active, txs);
  const account = active.find((a) => a.id === accountId) ?? null;
  const balanceOf = (id: string, start: number) => accountBalance(id, start, txs);

  const chips = useMemo(() => {
    const ofKind = (categories.data ?? []).filter((c) => c.kind === type && (!c.archived || c.id === editing?.categoryId));
    return rankByUse(
      ofKind,
      txs.filter((t) => t.type === type).map((t) => t.categoryId),
    );
  }, [categories.data, txs, type, editing?.categoryId]);

  const amount = digitsToAmount(digits);
  const loading = (accounts.status === "loading" && !accounts.data) || (categories.status === "loading" && !categories.data);
  const loadError =
    accounts.status === "error" ? accounts.message : categories.status === "error" ? categories.message : null;

  function press(key: KeypadKey) {
    setDigits((d) => pressKey(d, key));
    setError(null);
  }

  async function save() {
    if (busy) return;
    if (amount <= 0) return setError("Type an amount first.");
    if (!categoryId) return setError("Pick a category.");
    if (!account) return setError("Pick an account.");
    setBusy(true);
    setError(null);
    const input = { date, type, amount, accountId: account.id, toAccountId: null, categoryId, note };
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
      press(e.key as KeypadKey);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      press("back");
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
    <div className="flex flex-1 flex-col gap-3">
      <Segmented
        label="Transaction type"
        options={TYPES}
        value={type}
        onChange={(t) => {
          setType(t);
          setCategoryId(null);
          setError(null);
        }}
      />

      <div className="flex flex-col items-center gap-0.5 py-0.5">
        <span className="text-[13px] font-medium text-muted">Amount</span>
        <output
          aria-live="polite"
          aria-label={`Amount ${formatRupiah(amount)}. Type digits, Enter to save`}
          tabIndex={-1}
          data-autofocus
          className="rounded-xl px-2 text-[42px] leading-[1.2] font-bold tracking-[-0.03em] outline-none"
        >
          {formatRupiah(amount)}
        </output>
      </div>

      {loadError && <ErrorNote>{loadError}</ErrorNote>}

      <div className="flex flex-col gap-2">
        <span id="category-label" className="text-[13px] font-medium text-muted">
          Category
        </span>
        <div
          role="group"
          aria-labelledby="category-label"
          className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5"
        >
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
            <Link href="/settings/categories" onClick={onDone} className="text-[13px] font-semibold underline">
              Add a category
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span id="account-label" className="text-[13px] font-medium text-muted">
          {type === "expense" ? "Pay from" : "Into"}
        </span>
        <button
          type="button"
          aria-labelledby="account-label account-current"
          aria-expanded={pickerOpen}
          aria-controls="account-options"
          onClick={() => setPickerOpen((o) => !o)}
          className="flex h-14 items-center gap-3 rounded-2xl bg-page px-3.5 text-left"
        >
          <span aria-hidden className="flex size-8 flex-none items-center justify-center rounded-full bg-ink text-[11px] font-bold text-lime">
            {account ? accountBadge(account.name) : "…"}
          </span>
          <span id="account-current" className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[15px] font-semibold">{account?.name ?? "Loading…"}</span>
            {account && (
              <span className="text-xs text-muted">{formatRupiah(balanceOf(account.id, account.startingBalance))}</span>
            )}
          </span>
          <ChevronDown
            aria-hidden
            size={18}
            className={`flex-none transition-transform duration-150 ${pickerOpen ? "rotate-180" : ""}`}
          />
        </button>
        {pickerOpen && (
          <ul id="account-options" className="flex flex-col overflow-hidden rounded-2xl border border-line">
            {active.map((a) => (
              <li key={a.id} className="border-b border-line last:border-0">
                <button
                  type="button"
                  aria-pressed={a.id === accountId}
                  onClick={() => {
                    setChosenAccountId(a.id);
                    setPickerOpen(false);
                  }}
                  className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left ${
                    a.id === accountId ? "bg-page" : "bg-card"
                  }`}
                >
                  <span className="text-[15px] font-semibold">{a.name}</span>
                  <span className="text-[13px] text-muted">{formatRupiah(balanceOf(a.id, a.startingBalance))}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            const input = dateRef.current;
            if (!input) return;
            try {
              input.showPicker();
            } catch {
              input.focus();
            }
          }}
          className="relative flex h-11 flex-none items-center gap-1.5 rounded-full border border-line bg-card px-3.5 text-[13px] font-semibold"
        >
          <CalendarDays aria-hidden size={16} strokeWidth={2} />
          {dateLabel(date)}
          <span className="sr-only">, change date</span>
        </button>
        <input
          ref={dateRef}
          type="date"
          aria-label="Date"
          required
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="sr-only"
        />
        <input
          type="text"
          aria-label="Note"
          placeholder="Note (optional)"
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

      <div className="mt-auto grid grid-cols-4 grid-rows-[repeat(4,52px)] gap-2 pt-1">
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

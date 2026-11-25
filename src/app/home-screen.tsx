"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AccountStack, topCards, useAccountSwipe } from "@/components/account-stack";
import { AccountsPreview } from "@/components/accounts-preview";
import { RevealButton, useMoney } from "@/components/amount";
import { FitText } from "@/components/fit-text";
import { Greeting } from "@/components/greeting";
import { LogForm } from "@/components/log-sheet";
import { Sheet } from "@/components/sheet";
import { TransactionRow } from "@/components/transaction-row";
import { useAccounts } from "@/lib/accounts";
import { accountBalance, savedInAccount } from "@/lib/balances";
import { useBudgets } from "@/lib/budgets";
import { useCategories } from "@/lib/categories";
import { CategoryIcon } from "@/lib/category-icons";
import { groupByDay } from "@/lib/history";
import { netSaved, recentFrom, remainingBudget, savingChange, topTiles, type Tile } from "@/lib/home";
import { periodFor } from "@/lib/periods";
import { coverPeriodsFrom, periodOf, usePeriods } from "@/lib/periods-store";
import { useTransactions, type Transaction } from "@/lib/transactions";
import { useToday } from "@/lib/use-today";

/** Home (mockup Main.dc.html): dark header with the remaining budget, then tiles and recent transactions. */
export function HomeScreen() {
  const today = useToday();
  const router = useRouter();
  const periods = usePeriods();
  const budgets = useBudgets();
  const categories = useCategories();
  const transactions = useTransactions();
  const accounts = useAccounts();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const { money, hidden } = useMoney();

  const txs = useMemo(() => transactions.data ?? [], [transactions.data]);
  const oldest = txs.length ? txs[txs.length - 1].date : null;
  useEffect(() => {
    coverPeriodsFrom(oldest);
  }, [oldest]);

  // Pulling down past the top shows dark, not grey, above the dark header.
  useEffect(() => {
    document.documentElement.classList.add("dark-top");
    return () => document.documentElement.classList.remove("dark-top");
  }, []);

  // The stored period (budgets hang off it); until periods load, the 25th rule gives the dates.
  const stored = today ? periodOf(periods.data ?? [], today) : null;
  const period = stored ?? (today ? periodFor(today) : null);
  const inPeriod = (t: Transaction) => period !== null && t.date >= period.start && t.date <= period.end;
  const periodTxs = txs.filter(inPeriod);
  const allCategories = categories.data ?? [];
  const budgetRows = (budgets.data ?? []).filter((b) => stored !== null && b.periodId === stored.id);

  // Remaining budget: every expense budget this period minus every expense this period.
  const expenseCategories = allCategories.filter((c) => c.kind === "expense");
  const budgetTotal = budgetRows
    .filter((b) => expenseCategories.some((c) => c.id === b.categoryId))
    .reduce((s, b) => s + b.amount, 0);
  const spentTotal = periodTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const head = remainingBudget(budgetTotal, spentTotal);
  // Tiles: expense budgets, the six with the highest share used.
  const spentBy = (id: string) => periodTxs.filter((t) => t.type === "expense" && t.categoryId === id).reduce((s, t) => s + t.amount, 0);
  const expenseTiles: Tile[] = expenseCategories.map((c) => {
    const of = budgetRows.find((b) => b.categoryId === c.id)?.amount ?? 0;
    const amount = spentBy(c.id);
    return { id: c.id, kind: "expense", amount, of, percent: of > 0 ? Math.round((amount / of) * 100) : 0 };
  });
  // Saving this month against last month (net: deposits − withdrawals).
  const dayBefore = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    const t = new Date(y, m - 1, d - 1);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  };
  const lastPeriod = period
    ? (periodOf(periods.data ?? [], dayBefore(period.start)) ?? periodFor(dayBefore(period.start)))
    : null;
  const savedNow = period ? netSaved(txs, period) : 0;
  const savedBefore = lastPeriod ? netSaved(txs, lastPeriod) : 0;
  const saving = savingChange(savedNow, savedBefore);
  const tiles = topTiles(expenseTiles);

  // Last 3 days, grouped by day.
  const recent = today ? groupByDay(txs.filter((t) => t.date >= recentFrom(today) && t.date <= today), today) : [];
  const accountName = (id: string | null) => (accounts.data ?? []).find((a) => a.id === id)?.name ?? "";
  const category = (id: string | null) => allCategories.find((c) => c.id === id) ?? null;

  // Card stack peeking at the right edge: the top three cards of the Accounts page.
  const withBalance = (accounts.data ?? []).map((a) => ({
    ...a,
    balance: accountBalance(a.id, a.startingBalance, txs),
    saved: savedInAccount(a.id, txs),
  }));
  const stack = topCards(withBalance);
  const { stackRef, pageRef, previewRef, handlers: swipeHandlers } = useAccountSwipe(() => router.push("/account", { transitionTypes: ["account-zoom"] }), {
    cards: stack.map((a) => ({ id: a.id, group: a.group })),
    spending: (accounts.data ?? []).filter((a) => !a.archived && a.group === "spending").length,
  });

  const loading = !today || (budgets.status === "loading" && !budgets.data) || (transactions.status === "loading" && !transactions.data);

  return (
    <>
      {/* Slides in from the right while the account cards are pulled. */}
      <AccountsPreview
        accounts={withBalance}
        flying={stack.map((a) => a.id)}
        money={money}
        masked={hidden}
        previewRef={previewRef}
      />
      <main ref={pageRef} className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-ink">
        {/* Swipe left anywhere on the header: the account cards slide and Accounts opens. */}
        <div
          // Stays where it is while the white part below slides up over it.
          className="sticky top-0 z-0 flex touch-pan-y flex-col gap-6 px-5 pt-[max(32px,env(safe-area-inset-top))] pb-7 text-white select-none"
          {...swipeHandlers}
        >
          <Greeting />

          {/* The card stack sits beside the budget, its top level with it, reaching the right edge. */}
          <div className="relative">
            <section aria-label="Budget this period" className="mr-[92px] flex flex-col gap-1">
              {/* The eye sits in the label's own line height, so the block (and the cards beside it) keep their size. */}
              <span className="flex h-5 items-center gap-1 text-[13px] font-medium text-[#BDBDBD]">
                This month budget
                <RevealButton tone="dark" />
              </span>
              {loading ? (
                <span aria-hidden className="mt-1 block h-[46px] w-52 rounded-xl bg-nav-selected" />
              ) : budgetTotal > 0 ? (
                <>
                  <span className="mt-1 flex items-center gap-1">
                    <FitText text={money(head.remaining)} max={38} min={22} className="leading-[46px] font-bold tracking-[-0.03em]" />
                  </span>
                  <div
                    role="progressbar"
                    aria-label="Budget used"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={head.barPercent}
                    className="mt-3.5 h-2 overflow-hidden rounded-full bg-nav-selected"
                  >
                    <div className={`h-full rounded-full ${head.over ? "bg-ember" : "bg-lime"}`} style={{ width: `${head.barPercent}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs text-[#BDBDBD]">
                    <span>
                      <b className="font-bold text-white">{head.percent}%</b> spent of
                    </span>
                    <span>{money(budgetTotal)}</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="mt-1 text-[22px] leading-[1.3] font-bold">No budget yet</span>
                  <span className="flex items-center gap-1 text-[13px] font-medium text-[#BDBDBD]">
                    {money(spentTotal)} spent this period
                  </span>
                  <Link
                    href="/plan"
                    className="mt-3 flex h-11 items-center self-start rounded-full bg-lime px-4 text-[13px] font-bold text-ink"
                  >
                    Set budgets
                  </Link>
                </>
              )}
            </section>

            <AccountStack accounts={stack} masked={hidden} stackRef={stackRef} />
          </div>
        </div>

        {/* Tall enough to cover the header completely when pushed up. */}
        <div className="relative z-10 flex min-h-dvh flex-1 flex-col gap-6 rounded-t-[28px] bg-card px-5 pt-2.5 pb-36 shadow-[0_-10px_30px_rgba(0,0,0,0.25)]">
          <div aria-hidden className="h-[5px] w-10 self-center rounded-full bg-line" />

          <section aria-labelledby="tiles-title" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="tiles-title" className="text-[17px] font-semibold">
                Budget
              </h2>
              <Link href="/plan" aria-label="See all budgets" className="-mr-1 flex h-11 items-center gap-0.5 px-1 text-[13px] font-semibold">
                See all
                <ChevronRight aria-hidden size={15} strokeWidth={2.5} />
              </Link>
            </div>
            {tiles.length === 0 && !loading ? (
              <p className="rounded-[20px] bg-page px-4 py-4 text-[13px] font-medium text-muted">
                Set budgets in Target to see them here.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-3">
                {tiles.map((t) => {
                  const c = category(t.id);
                  const over = t.kind === "expense" && t.amount > t.of;
                  return (
                    <li key={`${t.kind}-${t.id}`} className="flex flex-col gap-2 rounded-[20px] bg-page p-3">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          aria-hidden
                          className="flex size-7 flex-none items-center justify-center rounded-full bg-card text-ink"
                        >
                          <CategoryIcon name={c?.icon ?? "ellipsis"} size={16} />
                        </span>
                        <span className="truncate text-[13px] font-semibold">{c?.name}</span>
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[17px] font-bold">{money(t.amount)}</span>
                        <span className="text-xs text-muted">
                          of {money(t.of)}
                          {t.kind === "saving" ? " target" : ""}
                        </span>
                      </span>
                      <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-card">
                        <span
                          className={`block h-full rounded-full ${over ? "bg-ember" : "bg-ink"}`}
                          style={{ width: `${Math.min(100, t.percent)}%` }}
                        />
                      </span>
                      {over ? (
                        <span className="self-start rounded-full bg-ember px-2 py-0.5 text-xs font-bold text-white">
                          {money(t.amount - t.of)} over
                        </span>
                      ) : (
                        <span className="text-xs text-muted">
                          {t.percent}% {t.kind === "saving" ? "saved" : "used"}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="saving-title" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="saving-title" className="text-[17px] font-semibold">
                Saving
              </h2>
              <Link href="/plan" aria-label="See all goals" className="-mr-1 flex h-11 items-center gap-0.5 px-1 text-[13px] font-semibold">
                See all
                <ChevronRight aria-hidden size={15} strokeWidth={2.5} />
              </Link>
            </div>
            <div className="flex flex-col gap-1 rounded-3xl bg-ink p-5 text-white">
              <span className="text-[13px] text-[#BDBDBD]">Saved this month{period ? ` · ${period.name}` : ""}</span>
              {loading ? (
                <span aria-hidden className="mt-1 block h-9 w-44 rounded-xl bg-nav-selected" />
              ) : (
                <span className="text-[30px] leading-[1.25] font-bold tracking-[-0.03em]">{money(savedNow)}</span>
              )}
              {!loading && lastPeriod && (
                <span
                  className={`mt-2 self-start rounded-full px-2.5 py-1 text-xs font-bold ${
                    saving.trend === "down" ? "bg-nav-selected text-white" : "bg-lime text-ink"
                  }`}
                >
                  {saving.trend === "same"
                    ? `Same as ${lastPeriod.name}`
                    : `${saving.trend === "up" ? "▲" : "▼"} ${
                        saving.percent !== null ? `${saving.percent}%` : money(saving.diff)
                      } vs ${lastPeriod.name}`}
                </span>
              )}
            </div>
          </section>

          <section aria-labelledby="recent-title" className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h2 id="recent-title" className="text-[17px] font-semibold">
                Transaction
              </h2>
              <Link href="/history" aria-label="See all transactions" className="-mr-1 flex h-11 items-center gap-0.5 px-1 text-[13px] font-semibold">
                See all
                <ChevronRight aria-hidden size={15} strokeWidth={2.5} />
              </Link>
            </div>
            {!loading && recent.length === 0 && (
              <p className="text-[13px] font-medium text-muted">Nothing in the last 3 days. Tap + to log one.</p>
            )}
            {recent.map((g) => (
              <section key={g.date} aria-label={g.label}>
                <h3 className="pt-3 pb-0.5 text-xs font-semibold text-muted">{g.label}</h3>
                <ul>
                  {g.items.map((t) => (
                    <li key={t.id}>
                      <TransactionRow
                        tx={t}
                        categoryName={category(t.categoryId)?.name ?? ""}
                        categoryIcon={category(t.categoryId)?.icon ?? "ellipsis"}
                        accountName={accountName}
                        onOpen={() => setEditing(t)}
                        masked={hidden}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </section>
        </div>

        <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Edit transaction" tall>
          {editing && <LogForm key={editing.id} editing={editing} onDone={() => setEditing(null)} />}
        </Sheet>
      </main>
    </>
  );
}

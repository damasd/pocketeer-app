"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccountStack, topCards, useAccountSwipe } from "@/components/account-stack";
import { AccountsPreview } from "@/components/accounts-preview";
import { RevealButton, useMoney } from "@/components/amount";
import { BudgetTileBody } from "@/components/budget-tile";
import { TilePager } from "@/components/tile-pager";
import { FitText } from "@/components/fit-text";
import { Greeting } from "@/components/greeting";
import { LogForm } from "@/components/log-sheet";
import { Sheet } from "@/components/sheet";
import { TransactionRow } from "@/components/transaction-row";
import { useAccounts } from "@/lib/accounts";
import { onLock } from "@/lib/app-lock";
import { accountBalance, savedInAccount } from "@/lib/balances";
import { useBudgets } from "@/lib/budgets";
import { useCategories } from "@/lib/categories";
import { groupByDay } from "@/lib/history";
import { useHomeTiles } from "@/lib/home-tiles";
import { netSaved, remainingBudget, savingChange, topTiles, type Tile } from "@/lib/home";
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

  // The white part is a panel moved by the app (not the page scroll, which iPhone Safari fights
  // with momentum and bounce). It rests below the header or covers it:
  // - at rest, a vertical drag moves it; pushed up past a quarter of the way (or flicked) it covers
  //   the header, otherwise it springs back;
  // - covered, its list scrolls inside it; pulling down while the list is at its top opens the
  //   header fully.
  // The mouse wheel does the same on a laptop.
  const headerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [covered, setCovered] = useState(false);
  const coveredRef = useRef(false);
  useEffect(() => {
    const sheet = sheetRef.current;
    const main = sheet?.parentElement; // the page (<main>)
    const inner = innerRef.current;
    const header = headerRef.current;
    if (!main || !sheet || !inner || !header) return;
    const SNAP_MS = 280;
    const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
    const SLOP = 6;
    const FLICK = 0.3; // px per ms
    const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const H = () => header.offsetHeight;

    /** Panel position: 0 = resting below the header, −H = covering it. */
    const put = (y: number, ms: number) => {
      sheet.style.transition = ms && !reduce() ? `transform ${ms}ms ${EASE}` : "none";
      sheet.style.transform = y ? `translate3d(0, ${y}px, 0)` : "";
    };
    const settle = (cover: boolean) => {
      put(cover ? -H() : 0, SNAP_MS);
      coveredRef.current = cover;
      setCovered(cover);
      if (!cover) inner.scrollTop = 0;
    };

    // Header height can change (data arriving): keep a covering panel exactly over it.
    const ro = new ResizeObserver(() => {
      if (coveredRef.current) put(-H(), 0);
    });
    ro.observe(header);

    let g: { x: number; y: number; t: number; base: number; at: number; v: number; on: boolean } | null = null;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || (e.target as Element).closest?.("dialog")) return (g = null);
      const t = e.touches[0];
      const base = coveredRef.current ? -H() : 0;
      g = { x: t.clientX, y: t.clientY, t: e.timeStamp, base, at: base, v: 0, on: false };
    };
    const onMove = (e: TouchEvent) => {
      if (!g) return;
      const t = e.touches[0];
      const dx = t.clientX - g.x;
      const dy = t.clientY - g.y;
      if (!g.on) {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        // Sideways is the card pull; covered, only a pull down from the list's top moves the panel.
        if (Math.abs(dx) > Math.abs(dy)) return (g = null);
        if (coveredRef.current && !(dy > 0 && inner.scrollTop <= 0)) return (g = null);
        g.on = true;
        g.y = t.clientY;
        g.t = e.timeStamp;
      }
      e.preventDefault();
      const at = Math.min(0, Math.max(-H(), g.base + (t.clientY - g.y)));
      g.v = (at - g.at) / Math.max(1, e.timeStamp - g.t);
      g.at = at;
      g.t = e.timeStamp;
      put(at, 0);
    };
    const onEnd = () => {
      if (!g?.on) return (g = null);
      const h = H();
      let cover: boolean;
      if (Math.abs(g.v) > FLICK) cover = g.v < 0; // flicked up covers, flicked down opens
      else if (g.at < g.base || (g.at === g.base && !coveredRef.current)) cover = g.at < -h * 0.25; // pushed up
      else cover = false; // pulled down: open fully
      settle(cover);
      g = null;
    };
    const onWheel = (e: WheelEvent) => {
      if (!coveredRef.current && e.deltaY > 0) {
        e.preventDefault();
        settle(true);
      } else if (coveredRef.current && e.deltaY < 0 && inner.scrollTop <= 0) {
        e.preventDefault();
        settle(false);
      }
    };

    main.addEventListener("touchstart", onStart, { passive: true });
    main.addEventListener("touchmove", onMove, { passive: false });
    main.addEventListener("touchend", onEnd, { passive: true });
    main.addEventListener("touchcancel", onEnd, { passive: true });
    main.addEventListener("wheel", onWheel, { passive: false });
    // The app locks (after a while away): next time it opens, Home starts from the top, with the
    // greeting and this month's budget showing and the list scrolled back up.
    const offLock = onLock(() => {
      g = null;
      put(0, 0);
      coveredRef.current = false;
      setCovered(false);
      inner.scrollTop = 0;
      window.scrollTo(0, 0);
    });
    return () => {
      offLock();
      ro.disconnect();
      main.removeEventListener("touchstart", onStart);
      main.removeEventListener("touchmove", onMove);
      main.removeEventListener("touchend", onEnd);
      main.removeEventListener("touchcancel", onEnd);
      main.removeEventListener("wheel", onWheel);
    };
  }, []);

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
  // Tiles: the ones picked on the Budget page, or else the six with the most spent this period.
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
  // The tiles picked on the Budget page, in category order; none picked: the six used most.
  const homeTiles = useHomeTiles();
  const chosenTiles = homeTiles.data ?? [];
  const tiles = chosenTiles.length ? expenseTiles.filter((t) => chosenTiles.includes(t.id)) : topTiles(expenseTiles);

  // The 6 latest transactions (newest first, future-dated ones left out), grouped by day.
  const LATEST = 6;
  const recent = today ? groupByDay(txs.filter((t) => t.date <= today).slice(0, LATEST), today) : [];
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
      {/* One screen tall and clipped top to bottom only, so the page never scrolls while the cards
          of the card pull can still fly out sideways. */}
      <main ref={pageRef} className="relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-y-clip bg-ink">
        {/* Swipe left anywhere on the header: the account cards slide and Accounts opens. */}
        <div
          ref={headerRef}
          data-home-header
          className="relative flex flex-none touch-pan-y flex-col gap-6 px-5 pt-[max(32px,env(safe-area-inset-top))] pb-7 text-white select-none"
          {...swipeHandlers}
        >
          <Greeting />

          {/* The card stack sits beside the budget, its top level with it, reaching the right edge. */}
          <div className="relative">
            <section aria-label="Budget this period" className="mr-[92px] flex flex-col gap-1">
              {/* The eye sits in the label's own line height, so the block (and the cards beside it) keep their size. */}
              <span className="flex h-5 items-center gap-1 text-meta font-medium text-[#BDBDBD]">
                This month budget
                <RevealButton tone="dark" />
              </span>
              {loading ? (
                <span aria-hidden className="mt-1 block h-[46px] w-52 rounded-tile bg-nav-selected" />
              ) : budgetTotal > 0 ? (
                <>
                  <span className="mt-1 flex items-center gap-1">
                    <FitText text={money(head.remaining)} max={38} min={24} className="leading-[46px] font-bold tracking-[-0.03em]" />
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
                  <div className="mt-1.5 flex justify-between text-caption text-[#BDBDBD]">
                    <span>
                      <b className="font-bold text-white">{head.percent}%</b> spent of
                    </span>
                    <span>{money(budgetTotal)}</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="mt-1 text-title leading-[1.3] font-bold">No budget yet</span>
                  <span className="flex items-center gap-1 text-meta font-medium text-[#BDBDBD]">
                    {money(spentTotal)} spent this period
                  </span>
                  <Link
                    href="/plan"
                    className="mt-3 flex h-11 items-center self-start rounded-full bg-lime px-4 text-meta font-bold text-ink"
                  >
                    Set budgets
                  </Link>
                </>
              )}
            </section>

            <AccountStack accounts={stack} masked={hidden} stackRef={stackRef} />
          </div>
        </div>

        {/* A screen tall, so it fills the screen when it covers the header. */}
        <div
          ref={sheetRef}
          className="relative z-10 h-dvh flex-none rounded-t-card bg-card shadow-[0_-10px_30px_rgba(0,0,0,0.25)] will-change-transform"
        >
        <div
          ref={innerRef}
          // Children never shrink (the grab bar would squash to nothing when the list is long).
          className={`no-scrollbar flex h-full flex-col gap-6 overscroll-contain px-5 pt-2.5 pb-36 [&>*]:flex-none ${
            covered ? "overflow-y-auto" : "overflow-hidden"
          }`}
        >
          {/* No extra gap under the handle (the Budget title row's own 44 px height spaces it), so both rows of
              tiles and their dots clear the nav bar. */}
          <div aria-hidden className="-mb-6 h-[5px] w-10 self-center rounded-full bg-line" />

          <section aria-labelledby="tiles-title" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="tiles-title" className="text-heading font-semibold">
                Budget
              </h2>
              <Link href="/budgets" aria-label="See all budgets" className="-mr-1 flex h-11 items-center gap-0.5 px-1 text-meta font-semibold">
                See all
                <ChevronRight aria-hidden size={15} strokeWidth={2.5} />
              </Link>
            </div>
            {tiles.length === 0 && !loading ? (
              <p className="rounded-tile bg-page px-4 py-4 text-meta font-medium text-muted">
                Set budgets in Target, or pick tiles in See all, to see them here.
              </p>
            ) : (
              <TilePager label="Budget tiles" count={tiles.length}>
                {tiles.map((t) => {
                  const c = category(t.id);
                  return (
                    <li key={`${t.kind}-${t.id}`} className="flex aspect-square min-w-0 flex-col rounded-tile bg-page p-4">
                      <BudgetTileBody name={c?.name ?? ""} icon={c?.icon ?? "ellipsis"} spent={t.amount} budget={t.of} money={money} />
                    </li>
                  );
                })}
              </TilePager>
            )}
          </section>

          <section aria-labelledby="saving-title" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="saving-title" className="text-heading font-semibold">
                Saving
              </h2>
              <Link href="/plan" aria-label="See all goals" className="-mr-1 flex h-11 items-center gap-0.5 px-1 text-meta font-semibold">
                See all
                <ChevronRight aria-hidden size={15} strokeWidth={2.5} />
              </Link>
            </div>
            <div className="flex flex-col gap-1 rounded-card bg-ink p-5 text-white">
              <span className="text-meta text-[#BDBDBD]">Saved this month</span>
              {loading ? (
                <span aria-hidden className="mt-1 block h-9 w-44 rounded-tile bg-nav-selected" />
              ) : (
                <span className="text-amount leading-[1.25] font-bold tracking-[-0.03em]">{money(savedNow)}</span>
              )}
              {!loading && lastPeriod && (
                <span className="mt-2 flex items-center gap-1.5 text-caption text-[#BDBDBD]">
                  <span
                    className={`rounded-full px-2.5 py-1 font-bold ${
                      saving.trend === "down" ? "bg-nav-selected text-white" : "bg-lime text-ink"
                    }`}
                  >
                    {saving.trend === "same"
                      ? "Same"
                      : `${saving.trend === "up" ? "▲" : "▼"} ${saving.percent !== null ? `${saving.percent}%` : money(saving.diff)}`}
                  </span>
                  {saving.trend === "same" ? "as last month" : "vs last month"}
                </span>
              )}
            </div>
          </section>

          <section aria-labelledby="recent-title" className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h2 id="recent-title" className="text-heading font-semibold">
                Transaction
              </h2>
              <Link href="/history" aria-label="See all transactions" className="-mr-1 flex h-11 items-center gap-0.5 px-1 text-meta font-semibold">
                See all
                <ChevronRight aria-hidden size={15} strokeWidth={2.5} />
              </Link>
            </div>
            {!loading && recent.length === 0 && (
              <p className="text-meta font-medium text-muted">No transactions yet. Tap + to log one.</p>
            )}
            {recent.map((g) => (
              <section key={g.date} aria-label={g.label}>
                <h3 className="pt-3 pb-0.5 text-caption font-semibold text-muted">{g.label}</h3>
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
        </div>

        <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Edit transaction">
          {editing && <LogForm key={editing.id} editing={editing} onDone={() => setEditing(null)} />}
        </Sheet>
      </main>
    </>
  );
}

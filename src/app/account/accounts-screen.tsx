"use client";

import { useLayoutEffect, useState } from "react";
import { ChevronRight, Plus, Wallet as WalletIcon } from "lucide-react";
import { ArchivedSection } from "@/components/archived-section";
import { AccountCardFace } from "@/components/account-card";
import { RevealButton, useMoney } from "@/components/amount";
import { Sheet } from "@/components/sheet";
import { Button, ErrorNote } from "@/components/ui";
import { useAccounts, type Account, type AccountGroup } from "@/lib/accounts";
import { accountBalance, sumBalances } from "@/lib/balances";
import { cardTransitionName, saveSlots, useHandoff, type CardSlot } from "@/lib/card-handoff";
import { useTransactions } from "@/lib/transactions";
import { AccountForm } from "./account-form";

type WithBalance = Account & { balance: number };

const GROUPS: { id: AccountGroup; title: string }[] = [
  { id: "spending", title: "Spending" },
  { id: "saving", title: "Saving" },
];

export function AccountsScreen() {
  const state = useAccounts();
  const { money, hidden } = useMoney();
  // Cards arriving from the Home stack zoom into place (shared view-transition names).
  const arriving = useHandoff();
  const transactions = useTransactions();
  const txs = transactions.data ?? [];
  // Sheet: null = closed, "new" = create, Account = edit.
  const [editing, setEditing] = useState<Account | "new" | null>(null);

  const all = state.data ?? [];
  // Balances are calculated from the starting balance and every transaction (never stored).
  const withBalance: WithBalance[] = all.map((a) => ({
    ...a,
    balance: accountBalance(a.id, a.startingBalance, txs),
  }));
  const active = withBalance.filter((a) => !a.archived);
  const archived = withBalance.filter((a) => a.archived);
  const byGroup = (g: AccountGroup) => active.filter((a) => a.group === g);
  const nextSortOrder = Math.max(0, ...all.map((a) => a.sortOrder)) + 1;
  const loading = state.status === "loading" && !state.data;

  // Tell Home where each card sits, so a card pulled from the Home stack lands exactly here.
  const layoutKey = active.map((a) => `${a.id}:${a.group}`).join(",");
  useLayoutEffect(() => {
    if (loading) return;
    const measure = () => {
      const byId: Record<string, CardSlot> = {};
      document.querySelectorAll<HTMLElement>("[data-slot]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0) return; // page hidden: keep the last good measurement
        byId[el.dataset.slot!] = { x: r.left, y: r.top + window.scrollY, width: r.width };
      });
      if (Object.keys(byId).length) saveSlots(window.innerWidth, byId);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [loading, layoutKey]);

  return (
    <>
      <header className="flex items-center justify-between pt-3">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Accounts</h1>
        <button
          type="button"
          aria-label="Add account"
          onClick={() => setEditing("new")}
          className="flex size-11 items-center justify-center rounded-full border border-line bg-card"
        >
          <Plus aria-hidden size={18} strokeWidth={2.25} />
        </button>
      </header>

      {state.status === "error" && (
        <div className="mt-6">
          <ErrorNote>{state.message}</ErrorNote>
        </div>
      )}

      <section aria-label="Total balance" className="mt-6 flex flex-col gap-1">
        <span className="flex items-center gap-1 text-[13px] font-medium text-muted">
          Total balance
          <RevealButton />
        </span>
        {loading ? (
          <span aria-hidden className="h-[46px] w-56 rounded-xl bg-line" />
        ) : (
          <span className="text-[38px] leading-[1.2] font-bold tracking-[-0.03em]">{money(sumBalances(active))}</span>
        )}
      </section>

      {!loading && active.length === 0 && state.status !== "error" && (
        <section
          aria-label="No accounts yet"
          className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[#BDBDBD] px-6 py-10 text-center"
        >
          <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-card">
            <WalletIcon size={22} strokeWidth={2} />
          </span>
          <h2 className="text-[17px] font-semibold">No accounts yet</h2>
          <p className="text-[13px] font-medium text-muted">Add the bank accounts, e-wallets and cash you use.</p>
          <Button size="md" className="mt-2" onClick={() => setEditing("new")}>
            Add account
          </Button>
        </section>
      )}

      {(loading || active.length > 0) && GROUPS.map((g) => {
        const list = byGroup(g.id);
        return (
          <section key={g.id} id={g.id} aria-labelledby={`${g.id}-title`} className="mt-8 flex scroll-mt-4 flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 id={`${g.id}-title`} className="text-[17px] font-semibold">
                {g.title}
              </h2>
              {!loading && (
                <span className="text-[13px] text-muted">
                  {list.length} {list.length === 1 ? "account" : "accounts"} · {money(sumBalances(list))}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-4">
              {loading &&
                [0, 1].map((i) => <span key={i} aria-hidden className="block h-[216px] rounded-3xl bg-line" />)}
              {list.map((a) => (
                <div
                  key={a.id}
                  data-slot={a.id}
                  className="acct-card relative rounded-3xl transition-transform duration-150 ease-out has-[>button:active]:scale-[0.98]"
                  style={arriving.includes(a.id) ? { viewTransitionName: cardTransitionName(a.id) } : undefined}
                >
                  {/* Tapping the card edits the account (button laid over the card, so the
                      copy button inside it stays a separate button). */}
                  <AccountCardFace
                    name={a.name}
                    accountNumber={a.accountNumber}
                    colour={a.colour}
                    balance={a.balance}
                    masked={hidden}
                    copyable
                  />
                  <button
                    type="button"
                    aria-label={`${a.name}, balance ${money(a.balance)}. Edit account`}
                    onClick={() => setEditing(a)}
                    className="absolute inset-0 rounded-3xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  />
                </div>
              ))}
              {!loading && list.length === 0 && (
                <p className="rounded-3xl bg-card p-5 text-[13px] font-medium text-muted">
                  No {g.title.toLowerCase()} accounts. Tap + to add one.
                </p>
              )}
            </div>
          </section>
        );
      })}

      <div className="mt-8">
      <ArchivedSection count={archived.length}>
          <ul aria-label="Archived accounts" className="flex flex-col overflow-hidden rounded-3xl bg-card">
            {archived.map((a) => (
              <li key={a.id} className="border-b border-line last:border-0">
                <button
                  type="button"
                  onClick={() => setEditing(a)}
                  className="flex min-h-14 w-full items-center justify-between gap-3 px-5 py-3 text-left"
                >
                  <span className="flex flex-col">
                    <span className="text-[15px] font-semibold">{a.name}</span>
                    <span className="text-[13px] font-medium text-muted">{money(a.balance)}</span>
                  </span>
                  <ChevronRight aria-hidden size={20} className="text-muted" />
                </button>
              </li>
            ))}
          </ul>
      </ArchivedSection>
      </div>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New account" : "Edit account"}
      >
        <AccountForm
          key={editing === "new" ? "new" : editing?.id}
          account={editing === "new" ? null : editing}
          nextSortOrder={nextSortOrder}
          onDone={() => setEditing(null)}
        />
      </Sheet>
    </>
  );
}

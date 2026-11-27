"use client";

import type { Ref } from "react";
import { Pencil, Plus } from "lucide-react";
import { AccountCardFace, CARD_STYLES } from "@/components/account-card";
import { RevealButton } from "@/components/amount";
import type { Account, AccountGroup } from "@/lib/accounts";
import { sumBalances } from "@/lib/balances";

type PreviewAccount = Account & { balance: number; saved: number };

const GROUPS: { id: AccountGroup; title: string }[] = [
  { id: "spending", title: "Spending" },
  { id: "saving", title: "Saving" },
];

/**
 * A still copy of the top of the Accounts page that slides in from the right while the Home card
 * stack is pulled, so the page itself appears to slide over. The pulled cards land in the gaps
 * left for them (`flying`). Keep the spacing in step with src/app/account/page.tsx and
 * accounts-screen.tsx: when the real page takes over, nothing should jump.
 */
export function AccountsPreview({
  accounts,
  flying,
  money,
  masked,
  previewRef,
}: {
  accounts: PreviewAccount[];
  flying: readonly string[];
  money: (n: number) => string;
  masked: boolean;
  previewRef: Ref<HTMLDivElement>;
}) {
  const active = accounts.filter((a) => !a.archived);
  return (
    <div
      ref={previewRef}
      aria-hidden
      inert
      className="fixed inset-y-0 left-1/2 z-0 w-full max-w-[480px] -translate-x-1/2 overflow-hidden bg-page text-ink"
      style={{ visibility: "hidden" }}
    >
      <div className="px-5 pt-[max(8px,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between pt-3">
          <span className="text-title font-bold tracking-[-0.02em]">Accounts</span>
          <span className="flex size-11 items-center justify-center rounded-full border border-line bg-card">
            <Plus size={18} strokeWidth={2.25} />
          </span>
        </header>

        <div className="mt-6 flex flex-col gap-1">
          <span className="flex items-center gap-1 text-meta font-medium text-muted">
            Total balance
            <RevealButton />
          </span>
          <span className="text-hero leading-[1.2] font-bold tracking-[-0.03em]">{money(sumBalances(active))}</span>
        </div>

        {GROUPS.map((g) => {
          const list = active.filter((a) => a.group === g.id);
          return (
            <div key={g.id} className="mt-8 flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="text-heading font-semibold">{g.title}</span>
                <span className="text-meta text-muted">
                  {list.length} {list.length === 1 ? "account" : "accounts"} · {money(sumBalances(list))}
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {list.map((a) =>
                  flying.includes(a.id) ? (
                    // The pulled card lands here.
                    <span key={a.id} data-preview-slot={a.id} className="block h-[216px]" />
                  ) : (
                    <div key={a.id} className="relative">
                      <AccountCardFace
                        name={a.name}
                        accountNumber={a.accountNumber}
                        colour={a.colour}
                        balance={a.balance}
                        saved={a.saved}
                        masked={masked}
                      />
                      <span
                        className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full"
                        style={{ color: CARD_STYLES[a.colour].fg, background: CARD_STYLES[a.colour].circle }}
                      >
                        <Pencil size={18} strokeWidth={2.25} />
                      </span>
                    </div>
                  ),
                )}
                {list.length === 0 && (
                  <p className="rounded-card bg-card p-5 text-meta font-medium text-muted">
                    No {g.title.toLowerCase()} accounts. Tap + to add one.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

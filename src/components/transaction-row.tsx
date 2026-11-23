"use client";

import { ArrowDownLeft, ArrowLeftRight } from "lucide-react";
import { CategoryIcon } from "@/lib/category-icons";
import { signedAmount } from "@/lib/history";
import type { Transaction } from "@/lib/transactions";

/** One transaction row (mockup History / Home): icon, title, "Category · Account", signed amount. */
export function TransactionRow({
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

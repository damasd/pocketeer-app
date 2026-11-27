"use client";

import { CategoryIcon } from "@/lib/category-icons";

/**
 * One expense budget as a tile (Home and the Budget page): what's left of the budget in bold,
 * then the bar and how much is used. Over budget: Rp 0 left and a red pill with how much over.
 * Without a budget it shows what was spent.
 */
export function BudgetTileBody({
  name,
  icon,
  spent,
  budget,
  money,
  onCard = false,
}: {
  name: string;
  icon: string;
  spent: number;
  budget: number;
  money: (n: number) => string;
  /** The tile is white (Budget page): icon circle and bar track turn grey to show on it. */
  onCard?: boolean;
}) {
  const inner = onCard ? "bg-page" : "bg-card";
  const over = budget > 0 && spent > budget;
  const percent = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  return (
    <>
      <span className="flex min-w-0 items-center gap-1.5">
        <span aria-hidden className={`flex size-7 flex-none items-center justify-center rounded-full text-ink ${inner}`}>
          <CategoryIcon name={icon} size={16} />
        </span>
        <span className="truncate text-meta font-semibold">{name}</span>
      </span>
      {budget > 0 ? (
        <>
          <span className="flex flex-col gap-0.5">
            <span className="text-heading font-bold">{money(Math.max(0, budget - spent))}</span>
            <span className="text-caption text-muted">left of {money(budget)}</span>
          </span>
          <span aria-hidden className={`h-1.5 overflow-hidden rounded-full ${inner}`}>
            <span
              className={`block h-full rounded-full ${over ? "bg-ember" : "bg-ink"}`}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </span>
          {over ? (
            <span className="self-start rounded-full bg-ember px-2 py-0.5 text-caption font-bold text-white">
              {money(spent - budget)} over
            </span>
          ) : (
            <span className="text-caption text-muted">{percent}% used</span>
          )}
        </>
      ) : (
        <>
          <span className="flex flex-col gap-0.5">
            <span className="text-heading font-bold">{money(spent)}</span>
            <span className="text-caption text-muted">spent</span>
          </span>
          <span aria-hidden className={`h-1.5 rounded-full ${inner}`} />
          <span className="text-caption text-muted">No budget set</span>
        </>
      )}
    </>
  );
}

"use client";

import { CategoryIcon } from "@/lib/category-icons";

/**
 * One expense budget as a square tile (Home and the Budget page): the category icon in a circle at
 * the top, and at the bottom the category name, what's left of the budget and the bar of how much
 * is used. The wrapper is `flex aspect-square flex-col p-4`; the space between icon and name
 * stretches so the bottom block always sits on the tile's bottom padding.
 * Over budget: a red pill with how much over and a full red bar. Without a budget: what was spent
 * and an empty bar.
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
      <span aria-hidden className={`flex size-11 flex-none items-center justify-center rounded-full text-ink ${inner}`}>
        <CategoryIcon name={icon} size={20} />
      </span>
      <span className="mt-auto truncate pt-3 text-heading leading-tight font-semibold">{name}</span>
      <span className="mt-1 flex h-5 min-w-0 items-center">
        {over ? (
          <span className="truncate rounded-full bg-ember px-2 text-caption leading-5 font-bold text-white">
            {money(spent - budget)} over
          </span>
        ) : (
          <span className="truncate text-meta text-muted">
            {budget > 0 ? `${money(budget - spent)} left` : `${money(spent)} spent · no budget`}
          </span>
        )}
      </span>
      <span
        role="img"
        aria-label={budget > 0 ? `${percent}% of the budget used` : "No budget set"}
        className={`mt-4 h-1.5 flex-none overflow-hidden rounded-full ${inner}`}
      >
        {budget > 0 && (
          <span
            className={`block h-full rounded-full ${over ? "bg-ember" : "bg-ink"}`}
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        )}
      </span>
    </>
  );
}

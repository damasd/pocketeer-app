"use client";

import { useSyncExternalStore } from "react";

/**
 * Home → Accounts card zoom. When the Home card stack is swiped, Home lists the accounts whose
 * cards are flying over; both pages give those cards the same view-transition-name so the browser
 * grows each card from its place on Home into its place on Accounts. Cleared once the zoom is done
 * so ordinary tab changes keep their normal slide.
 */
let ids: readonly string[] = [];
const listeners = new Set<() => void>();
const NONE: readonly string[] = [];

export function setHandoff(next: readonly string[]) {
  ids = next;
  listeners.forEach((l) => l());
}

export function useHandoff(): readonly string[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => ids,
    () => NONE,
  );
}

/** Shared name for one account's card in the zoom. */
export const cardTransitionName = (accountId: string) => `acct-${accountId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

/** Where a card sits on the Accounts page (page coordinates at scroll 0) for a given window width. */
export type CardSlot = { x: number; y: number; width: number };
let slots: { viewport: number; byId: Record<string, CardSlot> } = { viewport: 0, byId: {} };

/** Accounts page reports its card positions each time it lays out, so Home can pull cards to them. */
export function saveSlots(viewport: number, byId: Record<string, CardSlot>) {
  slots = { viewport, byId };
}

/** Last measured slots for these accounts, if measured at this window width. */
export function measuredSlots(ids: readonly string[], viewport: number): CardSlot[] | null {
  if (slots.viewport !== viewport) return null;
  const found = ids.map((id) => slots.byId[id]);
  return found.every(Boolean) ? found : null;
}

/**
 * Accounts page layout, for the first swipe before the page has been measured
 * (matches src/app/account: header, total balance, then Spending and Saving sections).
 */
export const ACCOUNTS_LAYOUT = {
  firstCardTop: 227, // below the page's top padding: header + total balance + section heading
  cardHeight: 216,
  cardGap: 16,
  sectionGap: 32, // mt-8 between sections
  sectionHead: 38, // heading row + gap-3 before the cards
  emptyNote: 60, // "No spending accounts" note when a section has none
  pagePadX: 20,
  maxWidth: 480,
};

/** Calculated slots for the top cards. `spending` = how many active spending accounts there are. */
export function estimatedSlots(
  cards: readonly { group: "spending" | "saving" }[],
  spending: number,
  viewport: number,
  topPadding: number,
): CardSlot[] {
  const L = ACCOUNTS_LAYOUT;
  const pageW = Math.min(viewport, L.maxWidth);
  const x = Math.max(0, (viewport - L.maxWidth) / 2) + L.pagePadX;
  const width = pageW - L.pagePadX * 2;
  const spendingTop = topPadding + L.firstCardTop;
  const spendingHeight = spending > 0 ? spending * L.cardHeight + (spending - 1) * L.cardGap : L.emptyNote;
  const savingTop = spendingTop + spendingHeight + L.sectionGap + L.sectionHead;
  let s = 0;
  let v = 0;
  return cards.map((c) =>
    c.group === "spending"
      ? { x, width, y: spendingTop + s++ * (L.cardHeight + L.cardGap) }
      : { x, width, y: savingTop + v++ * (L.cardHeight + L.cardGap) },
  );
}

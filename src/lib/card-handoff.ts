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

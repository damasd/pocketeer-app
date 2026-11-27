"use client";

import { useSyncExternalStore } from "react";
import { onLock } from "@/lib/app-lock";

// Amounts on Home, Accounts, Budget and Analytics start hidden ("Rp ••••••"). The eye button shows them until the
// app locks or is closed. "Hide amounts" can be turned off in Settings > Security.

const PREF_KEY = "pocketeer.hide-amounts.v1";

type State = { ready: boolean; hideByDefault: boolean; revealed: boolean };
let state: State = { ready: false, hideByDefault: true, revealed: false };
const listeners = new Set<() => void>();
const emit = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  let hide = true;
  try {
    hide = localStorage.getItem(PREF_KEY) !== "off";
  } catch {}
  emit({ ready: true, hideByDefault: hide });
  onLock(() => emit({ revealed: false }));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  start();
  return () => listeners.delete(l);
};
const SERVER: State = { ready: false, hideByDefault: true, revealed: false };

export function useAmounts() {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER);
  // Hidden until the browser has read the preference, so nothing flashes on first paint.
  return { ...s, hidden: !s.ready || (s.hideByDefault && !s.revealed) };
}

export function toggleReveal() {
  emit({ revealed: !state.revealed });
}

export function setHideByDefault(hide: boolean) {
  try {
    localStorage.setItem(PREF_KEY, hide ? "on" : "off");
  } catch {}
  emit({ hideByDefault: hide, revealed: false });
}

/** What a hidden amount shows: the same width whatever the number, so its size gives nothing away. */
export const MASK = "Rp ••••••";

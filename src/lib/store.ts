"use client";

import { useEffect, useSyncExternalStore } from "react";
import { errorMessage } from "@/lib/errors";

export type StoreState<T> =
  | { status: "loading"; data: T | null }
  | { status: "ready"; data: T }
  | { status: "error"; data: T | null; message: string };

// ---- Reload when the app comes back -------------------------------------------------------
// The home-screen app can sit in the background for hours; changes made on the laptop meanwhile
// should show when it is opened again. Stores that have loaded reload after a minute away.

const AWAY_MS = 60_000;
const loadedStores = new Set<() => Promise<void>>();
let hiddenAt: number | null = null;

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
    } else if (hiddenAt !== null && Date.now() - hiddenAt > AWAY_MS) {
      hiddenAt = null;
      loadedStores.forEach((reload) => reload());
    }
  });
}

/**
 * A tiny per-tab cache for one Supabase query. Loads on first use, is shared by every
 * screen, and is updated in place after a save so lists don't flicker.
 */
export function createStore<T>(load: () => Promise<T>, what: string) {
  let state: StoreState<T> = { status: "loading", data: null };
  let inflight: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const reloadIfLoaded = async () => {
    if (state.data !== null) await refresh();
  };
  loadedStores.add(reloadIfLoaded);

  const emit = (next: StoreState<T>) => {
    state = next;
    listeners.forEach((l) => l());
  };

  async function refresh() {
    try {
      emit({ status: "ready", data: await load() });
    } catch (e) {
      emit({ status: "error", data: state.data, message: errorMessage(e, `Could not load ${what}`) });
    }
  }

  function ensure() {
    inflight ??= refresh().finally(() => {
      if (state.status === "error") inflight = null; // allow a retry on next mount
    });
  }

  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  const serverSnapshot: StoreState<T> = { status: "loading", data: null };

  return {
    use(): StoreState<T> {
      const s = useSyncExternalStore(subscribe, () => state, () => serverSnapshot);
      useEffect(ensure, []);
      return s;
    },
    /** Replace the cached data after a successful save. */
    update(fn: (data: T) => T) {
      if (state.data !== null) emit({ status: "ready", data: fn(state.data) });
    },
    refresh,
    /** Forget everything (sign out). */
    reset() {
      inflight = null;
      state = { status: "loading", data: null };
    },
  };
}

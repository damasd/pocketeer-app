"use client";

import { useEffect, useSyncExternalStore } from "react";
import { errorMessage } from "@/lib/errors";

export type StoreState<T> =
  | { status: "loading"; data: T | null }
  | { status: "ready"; data: T }
  | { status: "error"; data: T | null; message: string };

/**
 * A tiny per-tab cache for one Supabase query. Loads on first use, is shared by every
 * screen, and is updated in place after a save so lists don't flicker.
 */
export function createStore<T>(load: () => Promise<T>, what: string) {
  let state: StoreState<T> = { status: "loading", data: null };
  let inflight: Promise<void> | null = null;
  const listeners = new Set<() => void>();

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

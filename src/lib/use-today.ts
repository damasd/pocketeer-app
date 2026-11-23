"use client";

import { useSyncExternalStore } from "react";
import { localDate } from "@/lib/log";

const subscribe = () => () => {};

/**
 * Today's local date (YYYY-MM-DD) in the browser, null while the page is prerendered.
 * Screens that depend on "today" render a placeholder until it is known.
 */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, localDate, () => null);
}

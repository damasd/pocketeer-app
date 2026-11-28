"use client";

import { useSyncExternalStore } from "react";
import { pageStatusBarColour, setPageStatusBarColour } from "@/lib/status-bar";
import { THEME_KEY } from "@/lib/theme-script";

// Light or dark theme for the whole app, chosen with the toggle on Home and kept on this device.
// Dark sets data-theme="dark" on <html>; globals.css swaps the colour variables under it.

export type Theme = "light" | "dark";

const listeners = new Set<() => void>();
const read = (): Theme =>
  typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => "light",
  );
}

export function setTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === "dark") html.setAttribute("data-theme", "dark");
  else html.removeAttribute("data-theme");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
  // The status bar band follows the page's own colour in the new theme.
  setPageStatusBarColour(pageStatusBarColour(window.location.pathname));
  listeners.forEach((l) => l());
}

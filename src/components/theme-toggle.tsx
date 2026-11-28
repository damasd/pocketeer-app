"use client";

import { Moon, Sun } from "lucide-react";
import { setTheme, useTheme } from "@/lib/theme";

/** Home header, top right: switches the whole app between light and dark (kept on this device). */
export function ThemeToggle() {
  const theme = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label="Dark mode"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="flex size-11 flex-none items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-150 hover:bg-white/15"
    >
      <span key={theme} className="icon-swap flex">
        {dark ? <Sun aria-hidden size={18} strokeWidth={2} /> : <Moon aria-hidden size={18} strokeWidth={2} />}
      </span>
    </button>
  );
}

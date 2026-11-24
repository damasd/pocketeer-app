"use client";

import { Eye, EyeOff } from "lucide-react";
import { MASK, toggleReveal, useAmounts } from "@/lib/amounts";
import { formatRupiah } from "@/lib/money";

/** Format money, or "Rp ••••••" while amounts are hidden (Home and Accounts). */
export function useMoney(): { money: (n: number) => string; hidden: boolean } {
  const { hidden } = useAmounts();
  return { money: (n: number) => (hidden ? MASK : formatRupiah(n)), hidden };
}

/** Eye button that shows or hides amounts. `tone` dark sits on the black Home header. */
export function RevealButton({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { hidden, hideByDefault } = useAmounts();
  if (!hideByDefault) return null; // amounts always shown: nothing to toggle
  return (
    <button
      type="button"
      aria-pressed={!hidden}
      aria-label={hidden ? "Show amounts" : "Hide amounts"}
      onClick={toggleReveal}
      className={`-my-2 flex size-11 flex-none items-center justify-center rounded-full ${
        tone === "dark" ? "text-[#BDBDBD] hover:text-white" : "text-muted hover:text-ink"
      }`}
    >
      {hidden ? <EyeOff aria-hidden size={18} strokeWidth={2} /> : <Eye aria-hidden size={18} strokeWidth={2} />}
    </button>
  );
}

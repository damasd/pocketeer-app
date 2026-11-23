"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Archived items stay out of sight: only a small "Show archived (n)" link at the bottom,
 * which opens the list so an item can be restored.
 */
export function ArchivedSection({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 items-center gap-1 self-center px-2 text-[13px] font-semibold text-muted"
      >
        {open ? "Hide archived" : `Show archived (${count})`}
        <ChevronDown aria-hidden size={16} strokeWidth={2.25} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && children}
    </section>
  );
}

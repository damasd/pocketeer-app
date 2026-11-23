"use client";

import type { Ref } from "react";
import { X } from "lucide-react";

/** Empty Log transaction sheet. The form arrives in slice 4. */
export function LogSheet({ ref }: { ref: Ref<HTMLDialogElement> }) {
  return (
    <dialog
      ref={ref}
      aria-labelledby="log-sheet-title"
      className="sheet"
      onClick={(e) => {
        // Tap on the backdrop closes the sheet.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="px-5 pt-3 pb-[max(24px,env(safe-area-inset-bottom))]">
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <header className="flex items-center gap-2">
          <form method="dialog">
            <button
              aria-label="Close"
              className="-ml-2.5 flex size-11 items-center justify-center rounded-full text-ink"
            >
              <X aria-hidden size={24} strokeWidth={2} />
            </button>
          </form>
          <h2 id="log-sheet-title" className="text-[17px] font-semibold">
            Log transaction
          </h2>
        </header>
        <p className="py-16 text-center text-[13px] font-medium text-muted">
          Nothing to log yet.
        </p>
      </div>
    </dialog>
  );
}

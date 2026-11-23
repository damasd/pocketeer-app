"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Bottom sheet on a native <dialog>: Escape, focus trap and an inert page come free.
 * Controlled by `open`; calls onClose when dismissed (✕, Escape or tapping the backdrop).
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      className="sheet"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="flex flex-col gap-4 px-5 pt-2.5 pb-[max(24px,env(safe-area-inset-bottom))]">
        <div aria-hidden className="h-[5px] w-10 self-center rounded-full bg-line" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Close"
            onClick={() => ref.current?.close()}
            className="flex size-11 flex-none items-center justify-center rounded-full bg-page"
          >
            <X aria-hidden size={18} strokeWidth={2.25} />
          </button>
          <h2 className="flex-1 text-center text-[17px] font-bold">{title}</h2>
          <span aria-hidden className="w-11 flex-none" />
        </div>
        {open && children}
      </div>
    </dialog>
  );
}

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type Toast = {
  id: number;
  message: string;
  action?: { label: string; run: () => Promise<void> | void };
  tone?: "default" | "error";
};

let current: Toast | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Show one toast at a time (a newer one replaces the older). */
export function showToast(t: Omit<Toast, "id">) {
  current = { ...t, id: nextId++ };
  emit();
}

function dismiss(id: number) {
  if (current?.id === id) {
    current = null;
    emit();
  }
}

const VISIBLE_MS = 5000;

/** Black pill at the top of the screen (mockup: "Saved · Rp 35.000  [Undo]"). */
export function Toaster() {
  const toast = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dismiss(toast.id), VISIBLE_MS);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-5"
      style={{ top: "max(12px, env(safe-area-inset-top))" }}
    >
      {toast && (
        <div
          key={toast.id}
          className={`toast-in pointer-events-auto flex min-h-11 w-full max-w-[440px] items-center justify-between gap-3 rounded-full py-1.5 pr-1.5 pl-4 text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(17,17,17,0.28)] ${
            toast.tone === "error" ? "bg-ember" : "bg-ink"
          }`}
        >
          <span className="min-w-0 truncate">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await toast.action!.run();
                } finally {
                  setBusy(false);
                  dismiss(toast.id);
                }
              }}
              className="flex h-11 flex-none items-center rounded-full bg-lime px-4 text-[13px] font-bold text-ink disabled:opacity-60"
            >
              {busy ? "…" : toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

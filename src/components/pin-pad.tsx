"use client";

import { haptic } from "@/lib/haptics";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Delete } from "lucide-react";
import { PIN_LENGTH } from "@/lib/lock-rules";

/**
 * Six dots and a number pad. Calls onComplete with the six digits, then clears.
 * `tone` dark is the lock screen; light sits in a sheet. Digits and Backspace work on a keyboard.
 */
export function PinPad({
  title,
  message,
  error = false,
  tone = "light",
  disabled = false,
  leftKey,
  onComplete,
}: {
  title: string;
  message?: string | null;
  /** Show the message as a problem (ember). */
  error?: boolean;
  tone?: "dark" | "light";
  disabled?: boolean;
  /** Bottom-left key, e.g. Face ID. */
  leftKey?: ReactNode;
  onComplete: (pin: string) => void | Promise<void>;
}) {
  const [digits, setDigits] = useState("");
  const [busy, setBusy] = useState(false);
  const dark = tone === "dark";

  async function press(d: string) {
    if (disabled || busy) return;
    haptic();
    if (d === "back") return setDigits((s) => s.slice(0, -1));
    if (digits.length >= PIN_LENGTH) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === PIN_LENGTH) {
      setBusy(true);
      try {
        await onComplete(next);
      } finally {
        setDigits("");
        setBusy(false);
      }
    }
  }

  // Keyboard: digits and Backspace (the handler always sees the latest state).
  const handler = useRef<(e: KeyboardEvent) => void>(null);
  useEffect(() => {
    handler.current = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        press(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        press("back");
      }
    };
  });
  useEffect(() => {
    const l = (e: KeyboardEvent) => handler.current?.(e);
    document.addEventListener("keydown", l);
    return () => document.removeEventListener("keydown", l);
  }, []);

  const key = dark ? "bg-[#1F1F1F] text-white" : "bg-page text-ink";

  return (
    <div className="flex w-full max-w-[320px] flex-col items-center gap-6 self-center">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-heading font-semibold">{title}</h2>
        <div role="img" aria-label={`${digits.length} of ${PIN_LENGTH} digits entered`} className="flex gap-3.5 py-2">
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className={`size-3.5 rounded-full border-2 transition-colors duration-100 ${
                i < digits.length
                  ? dark
                    ? "border-white bg-white"
                    : "border-ink bg-ink"
                  : dark
                    ? "border-[#5A5A5A]"
                    : "border-[#BDBDBD]"
              }`}
            />
          ))}
        </div>
        <p
          role={error ? "alert" : "status"}
          aria-live="polite"
          className={`min-h-6 text-meta font-semibold ${
            error ? "rounded-full bg-ember px-3 py-0.5 text-white" : dark ? "text-[#BDBDBD]" : "text-muted"
          } ${message ? "" : "invisible"}`}
        >
          {message || "."}
        </p>
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => press(d)}
            className={`h-16 rounded-full text-title font-semibold transition-transform duration-100 ease-out select-none active:scale-[0.96] disabled:opacity-40 ${key}`}
          >
            {d}
          </button>
        ))}
        <div className="flex items-center justify-center">{leftKey}</div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => press("0")}
          className={`h-16 rounded-full text-title font-semibold transition-transform duration-100 ease-out select-none active:scale-[0.96] disabled:opacity-40 ${key}`}
        >
          0
        </button>
        <button
          type="button"
          aria-label="Delete last digit"
          disabled={disabled || digits.length === 0}
          onClick={() => press("back")}
          className={`flex h-16 items-center justify-center rounded-full disabled:opacity-40 ${dark ? "text-white" : "text-ink"}`}
        >
          <Delete aria-hidden size={24} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

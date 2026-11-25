"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { dateLabel, localDate } from "@/lib/log";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const iso = (y: number, m0: number, d: number) => {
  const t = new Date(y, m0, d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

/**
 * Date pill that opens a small calendar in the app's own style (the phone's picker can't be
 * styled): the chosen day is a lime circle, today has a black ring, and "Today" jumps back.
 * Picking a day closes it; so do Escape and tapping outside.
 */
export function DatePopover({
  value,
  onChange,
  up = false,
}: {
  value: string;
  onChange: (date: string) => void;
  /** Float near the bottom of the screen instead of hanging off the pill (inside a scrolling area). */
  up?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => ({ y: Number(value.slice(0, 4)), m: Number(value.slice(5, 7)) - 1 }));
  const wrap = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLButtonElement>(null);
  const today = localDate();

  // Close on a tap outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Focus the chosen day when it opens, for keyboard users.
  useEffect(() => {
    if (open) wrap.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"], [data-today]')?.focus();
  }, [open]);

  function toggle() {
    if (!open) setView({ y: Number(value.slice(0, 4)), m: Number(value.slice(5, 7)) - 1 });
    setOpen((o) => !o);
  }
  function pick(date: string) {
    onChange(date);
    setOpen(false);
    pill.current?.focus();
  }
  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "Escape") return;
    // Close only the calendar, not the sheet it sits in.
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    pill.current?.focus();
  }

  // Days of the month, with blanks before the 1st so weeks start on Monday.
  const first = new Date(view.y, view.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const step = (n: number) => setView((v) => ({ y: new Date(v.y, v.m + n, 1).getFullYear(), m: new Date(v.y, v.m + n, 1).getMonth() }));

  return (
    <div ref={wrap} className="relative flex-none" onKeyDown={onKeyDown}>
      <button
        ref={pill}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Date, ${dateLabel(value)}. Change`}
        onClick={toggle}
        className={`flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors duration-150 ${
          open ? "border-ink bg-ink text-white" : "border-line bg-card text-ink"
        }`}
      >
        <CalendarDays aria-hidden size={16} strokeWidth={2} />
        {dateLabel(value)}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className={`calendar-in z-30 w-[min(332px,calc(100vw-40px))] ${up ? "fixed inset-x-0 bottom-[max(24px,env(safe-area-inset-bottom))] mx-auto origin-bottom" : "absolute top-full left-0 mt-2 origin-top-left"} rounded-3xl bg-card p-3 shadow-[0_12px_32px_rgba(17,17,17,0.18)] ring-1 ring-line`}
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => step(-1)}
              className="flex size-11 items-center justify-center rounded-full bg-page"
            >
              <ChevronLeft aria-hidden size={16} strokeWidth={2.25} />
            </button>
            <span aria-live="polite" className="text-[15px] font-bold">
              {MONTHS[view.m]} {view.y}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => step(1)}
              className="flex size-11 items-center justify-center rounded-full bg-page"
            >
              <ChevronRight aria-hidden size={16} strokeWidth={2.25} />
            </button>
          </div>

          <div aria-hidden className="mt-2 grid grid-cols-7 text-center text-[11px] font-semibold text-muted">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 justify-items-center gap-y-0.5">
            {cells.map((d, i) => {
              if (d === null) return <span key={`b${i}`} aria-hidden />;
              const date = iso(view.y, view.m, d);
              const on = date === value;
              const isToday = date === today;
              return (
                <button
                  key={date}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${d} ${MONTHS[view.m]} ${view.y}${isToday ? ", today" : ""}`}
                  data-today={isToday ? "" : undefined}
                  onClick={() => pick(date)}
                  className={`flex size-11 items-center justify-center rounded-full text-[15px] transition-colors duration-150 ${
                    on
                      ? "bg-lime font-bold text-ink"
                      : isToday
                        ? "font-bold text-ink ring-[1.5px] ring-ink ring-inset"
                        : "font-medium text-ink hover:bg-page"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-end border-t border-page pt-2">
            <button
              type="button"
              onClick={() => pick(today)}
              className="h-11 rounded-full bg-page px-5 text-[13px] font-bold"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

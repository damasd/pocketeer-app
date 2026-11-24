"use client";

import { useLayoutEffect, useRef, type KeyboardEvent } from "react";

const ROW = 40; // px per option
const VISIBLE = 5; // rows on show; the middle one is the choice

/**
 * One scroll wheel, like the iPhone date picker: flick it and it settles on an option; the option
 * in the middle band is the choice. Tapping an option scrolls it to the middle; ↑ ↓ keys step.
 */
export function Wheel<T extends string | number>({
  label,
  options,
  value,
  onChange,
  align = "center",
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  align?: "left" | "center" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Start on the current value (and follow it if it changes from outside). The sheet may still be
  // closed on first render (no height yet, so no scrolling): place it again once it has a size.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const place = () => {
      if (el.clientHeight && Math.round(el.scrollTop / ROW) !== index) el.scrollTop = index * ROW;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [index]);
  useLayoutEffect(() => () => clearTimeout(settle.current), []);

  function onScroll() {
    // The choice is made once the wheel comes to rest.
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / ROW)));
      if (options[i].value !== value) onChange(options[i].value);
    }, 90);
  }

  function go(i: number) {
    const el = ref.current;
    const next = Math.max(0, Math.min(options.length - 1, i));
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: next * ROW, behavior: reduce ? "auto" : "smooth" });
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") go(index + 1);
    else if (e.key === "ArrowUp") go(index - 1);
    else return;
    e.preventDefault();
  }

  const pad = ((VISIBLE - 1) / 2) * ROW;
  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      aria-activedescendant={`${label}-${String(value)}`}
      tabIndex={0}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      className="no-scrollbar relative z-10 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-xl focus-visible:outline-2 focus-visible:outline-lime"
      style={{
        height: ROW * VISIBLE,
        paddingBlock: pad,
        // Rows fade away above and below the middle, like a wheel turning out of sight.
        maskImage: "linear-gradient(to bottom, transparent, black 35%, black 65%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 35%, black 65%, transparent)",
      }}
    >
      {options.map((o, i) => (
        <div
          key={String(o.value)}
          id={`${label}-${String(o.value)}`}
          role="option"
          aria-selected={i === index}
          onClick={() => go(i)}
          className={`flex snap-center items-center px-4 text-[20px] transition-colors duration-150 ${
            align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center"
          } ${i === index ? "font-semibold text-ink" : "font-medium text-muted"}`}
          style={{ height: ROW }}
        >
          {o.label}
        </div>
      ))}
    </div>
  );
}

/** Wheels side by side over one highlighted middle band. */
export function WheelGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex gap-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 rounded-xl bg-page"
        style={{ top: ((VISIBLE - 1) / 2) * ROW, height: ROW }}
      />
      {children}
    </div>
  );
}

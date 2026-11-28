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
  fit,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  align?: "left" | "center" | "right";
  /** As wide as its longest option, with almost no padding on the given side (the side facing the
   *  next wheel), so two wheels sit together like written text ("December 2026"). */
  fit?: "left" | "right";
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
      className={`no-scrollbar relative z-10 ${fit ? "flex-none" : "flex-1"} snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-tile focus-visible:outline-2 focus-visible:outline-accent`}
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
          className={`flex snap-center items-center ${
            !fit ? "px-4" : fit === "right" ? "pr-[3px] pl-4" : "pr-4 pl-[3px]"
          } text-heading whitespace-nowrap transition-colors duration-150 ${
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
export function WheelGroup({ children, centered = false }: { children: React.ReactNode; centered?: boolean }) {
  return (
    <div className={`relative flex ${centered ? "justify-center" : "gap-2"}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 rounded-tile bg-page"
        style={{ top: ((VISIBLE - 1) / 2) * ROW, height: ROW }}
      />
      {children}
    </div>
  );
}

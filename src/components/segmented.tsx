"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Pill toggle (mockup "Type" control): the selected option sits on a black pill with white text.
 *
 * Moving to another option, the pill stretches: its leading edge sets off first and the trailing
 * edge follows a moment later, catching up while the pill is still travelling (both ease in and
 * out). The labels are drawn twice: grey ones (the real buttons) and a white copy on top, cut to
 * the pill's shape, so a label is white exactly where the pill covers it, mid-move too.
 */
const MS = 280;
/** Share of the time each edge moves in: the leading edge first, the trailing one overlapping it. */
const LEAD_SPAN: [number, number] = [0, 0.8];
const TRAIL_SPAN: [number, number] = [0.18, 1];
const STEPS = 24;
/** Ease in and out (cubic). */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** How far an edge moving during `span` has got at time t (0–1). */
const progress = (t: number, [a, b]: [number, number]) => easeInOut(Math.min(1, Math.max(0, (t - a) / (b - a))));
/** A CSS length between two calc() lengths. */
const mix = (from: string, to: string, p: number) => `calc(${from} * ${(1 - p).toFixed(4)} + ${to} * ${p.toFixed(4)})`;

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  surface = "page",
  weights,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** "page" on white sheets; "card" (white with a line) on the grey page background. */
  surface?: "page" | "card";
  /** Relative widths when one label is much longer (Security: "Immediately" next to "1 min"). Default: equal. */
  weights?: number[];
}) {
  const n = options.length;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const pill = useRef<HTMLSpanElement>(null);
  const cut = useRef<HTMLSpanElement>(null);
  const last = useRef(index);

  // Edges of option i, as distances from the row's left and right sides (4 px padding, 4 px gaps).
  const w = options.map((_, i) => weights?.[i] ?? 1);
  const total = w.reduce((a, b) => a + b, 0);
  const before = (i: number) => w.slice(0, i).reduce((a, b) => a + b, 0);
  const unit = `((100% - 8px - ${(n - 1) * 4}px) / ${total})`;
  const leftOf = (i: number) => `calc(4px + ${before(i)} * ${unit} + ${i * 4}px)`;
  const rightOf = (i: number) => `calc(4px + ${total - before(i) - w[i]} * ${unit} + ${(n - 1 - i) * 4}px)`;
  const clipOf = (l: string, r: string) => `inset(4px ${r} 4px ${l} round 9999px)`;

  useLayoutEffect(() => {
    const from = last.current;
    last.current = index;
    if (from === index || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // The edge on the side we're heading moves first; the other one follows.
    const right = index > from;
    const L0 = leftOf(from), R0 = rightOf(from), L1 = leftOf(index), R1 = rightOf(index);
    // Each edge has its own timing, so the frames are worked out step by step (straight lines between).
    const lead = right ? "right" : "left";
    const frames = (key: "edges" | "clip") =>
      Array.from({ length: STEPS + 1 }, (_, k) => {
        const t = k / STEPS;
        const pl = progress(t, lead === "left" ? LEAD_SPAN : TRAIL_SPAN);
        const pr = progress(t, lead === "right" ? LEAD_SPAN : TRAIL_SPAN);
        const l = mix(L0, L1, pl);
        const r = mix(R0, R1, pr);
        return key === "edges" ? { left: l, right: r } : { clipPath: clipOf(l, r) };
      });
    const a = pill.current?.animate(frames("edges"), { duration: MS });
    const b = cut.current?.animate(frames("clip"), { duration: MS });
    return () => {
      a?.cancel();
      b?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the choice changes
  }, [index, n, weights?.join()]);

  return (
    <div
      role="group"
      aria-label={label}
      className={`relative flex gap-1 rounded-full p-1 ${surface === "card" ? "border border-line bg-card" : "bg-page"}`}
    >
      <span
        ref={pill}
        aria-hidden
        className="absolute top-1 bottom-1 rounded-full bg-ink"
        style={{ left: leftOf(index), right: rightOf(index) }}
      />
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          style={{ flex: `${w[i]} 1 0` }}
          className="relative h-11 min-w-0 rounded-full text-meta font-semibold whitespace-nowrap text-[#4A4A4A]"
        >
          {o.label}
        </button>
      ))}
      {/* White labels, shown only inside the pill. */}
      <span
        ref={cut}
        aria-hidden
        className="pointer-events-none absolute inset-0 flex gap-1 p-1 text-meta font-semibold text-white"
        style={{ clipPath: clipOf(leftOf(index), rightOf(index)) }}
      >
        {options.map((o, i) => (
          <span key={o.value} style={{ flex: `${w[i]} 1 0` }} className="flex h-11 min-w-0 items-center justify-center whitespace-nowrap">
            {o.label}
          </span>
        ))}
      </span>
    </div>
  );
}

/**
 * Second-level tabs (Target: Expense / Income / Saving under Plan / Goals): plain labels on a
 * hairline, the chosen one in ink with a 2.5 px ink underline. Lighter than Segmented, so the
 * page reads as one main switch with a list filter inside it.
 */
export function UnderlineTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-6 border-b border-line">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`-mb-px flex h-11 items-center border-b-[2.5px] text-body font-semibold transition-colors duration-150 ${
              on ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

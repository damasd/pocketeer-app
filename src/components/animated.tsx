"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Entrance animations for charts and numbers (Analytics). Each one plays when it first shows:
 * when the page opens (also coming back to it, since pages stay alive in the background and
 * re-run their effects when shown) and whenever `replay` changes, e.g. switching Expenses to
 * Income. Reduce Motion on: everything simply appears.
 */

export const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Quick start, long soft landing. */
export const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * A number that counts up from 0 to `value` when it shows, and from the old value to the new
 * one when only the value changes (picking another bar). React never renders the text itself,
 * so the frame-by-frame updates can't clash with it.
 */
export function CountUp({
  value,
  format,
  replay,
  duration = 900,
  className,
}: {
  value: number;
  format: (n: number) => string;
  replay: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const lastReplay = useRef<string | null>(null);
  const fresh = useRef(true);
  const formatRef = useRef(format);
  useLayoutEffect(() => {
    formatRef.current = format;
  });

  // Runs on first show and on every return to the page: start again from 0.
  useLayoutEffect(() => {
    fresh.current = true;
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const write = (n: number) => {
      shown.current = n;
      el.textContent = formatRef.current(Math.round(n));
    };
    const from = fresh.current || replay !== lastReplay.current ? 0 : shown.current;
    fresh.current = false;
    lastReplay.current = replay;
    if (reduceMotion() || from === value) return write(value);

    write(from);
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      write(from + (value - from) * easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      write(value); // hidden or replaced mid-count: leave the real number behind
    };
  }, [value, replay, duration]);

  return <span ref={ref} className={className} />;
}

/**
 * Play `keyframes` on the elements matching `selector` inside the returned ref, one after
 * another (left to right in document order) with `stagger` ms between them.
 */
export function useEntrance<T extends HTMLElement | SVGElement>(
  selector: string,
  keyframes: Keyframe[],
  {
    replay,
    duration = 700,
    stagger = 0,
    maxStagger = 400,
    easing = EASE_OUT,
  }: { replay: string; duration?: number; stagger?: number; maxStagger?: number; easing?: string },
) {
  const ref = useRef<T>(null);
  const frames = useRef(keyframes);
  useLayoutEffect(() => {
    frames.current = keyframes;
  });
  // Before paint, so the finished chart never flashes for a frame first.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || reduceMotion()) return;
    const els = Array.from(root.querySelectorAll<HTMLElement | SVGElement>(selector));
    // Many items: squeeze the gaps so the whole run never takes longer than maxStagger.
    const step = els.length > 1 ? Math.min(stagger, maxStagger / (els.length - 1)) : 0;
    const anims = els.map((el, i) =>
      el.animate(frames.current, { duration, delay: i * step, easing, fill: "backwards" }),
    );
    return () => anims.forEach((a) => a.cancel());
  }, [selector, replay, duration, stagger, maxStagger, easing]);
  return ref;
}

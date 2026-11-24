"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * One line of text that shrinks to fit the room it has, from `max` down to `min` px. Its parent
 * should be a flex row: the text takes what the other items (e.g. the eye button) leave over.
 * Used for the big Remaining budget amount on Home, which shares its line with the card stack.
 */
export function FitText({
  text,
  max,
  min,
  className,
}: {
  text: string;
  max: number;
  min: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const row = el?.parentElement;
    if (!el || !row) return;
    const fit = () => {
      // Room = the row minus its other items and the gaps between them.
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const others = Array.from(row.children).filter((c) => c !== el);
      const room = row.clientWidth - others.reduce((w, c) => w + (c as HTMLElement).offsetWidth + gap, 0);
      el.style.fontSize = `${max}px`;
      const natural = el.scrollWidth;
      const size = natural > room ? Math.max(min, Math.floor((max * room) / natural)) : max;
      el.style.fontSize = `${size}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(row);
    return () => ro.disconnect();
  }, [text, max, min]);

  return (
    <span ref={ref} className={`min-w-0 whitespace-nowrap ${className ?? ""}`} style={{ fontSize: max }}>
      {text}
    </span>
  );
}

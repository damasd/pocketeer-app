"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Two rows of tiles that slide sideways (Home's Budget): four tiles show at a time, swipe left for
 * the rest. Each column snaps to the left edge; dots under it show where you are.
 * Children are <li> elements.
 */
export function TilePager({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const columns = Math.ceil(count / 2);
  // Two columns fit on screen, so each extra column is one more stop.
  const stops = Math.max(1, columns - 1);

  function onScroll() {
    const el = ref.current;
    const first = el?.querySelector("li");
    if (!el || !first) return;
    const step = first.getBoundingClientRect().width + 20; // column + gap
    setAt(Math.min(stops - 1, Math.round(el.scrollLeft / step)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={ref}
        role="region"
        aria-label={`${label}, scroll sideways for more`}
        tabIndex={0}
        onScroll={onScroll}
        className="no-scrollbar -mx-5 snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-px-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime"
      >
        {/* Column width: half the panel's inner width (screen − 40 px padding − 20 px gap). The gap
            equals the page margin, so the next column starts exactly at the screen edge. */}
        <ul className="grid w-max auto-cols-[calc((min(100vw,480px)-60px)/2)] grid-flow-col grid-rows-2 gap-5 px-5 [&>li]:snap-start">
          {children}
        </ul>
      </div>
      {stops > 1 && (
        <div aria-hidden className="flex justify-center gap-1.5">
          {Array.from({ length: stops }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${i === at ? "w-4 bg-ink" : "w-1.5 bg-line"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

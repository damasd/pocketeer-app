"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

/** Drag past this (px), or flick down faster than FLICK (px/ms), and the sheet closes. */
const CLOSE_AT = 110;
const FLICK = 0.6;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * Bottom sheet on a native <dialog>: Escape, focus trap and an inert page come free.
 * Controlled by `open`; calls onClose when dismissed: swipe the handle / title bar down, tap the
 * backdrop, or press Escape. Screen readers also get a Close button.
 */
export function Sheet({
  open,
  onClose,
  title,
  tall = false,
  hideTitle = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Fixed 92% height, content fills it (Log sheet with the keypad at the bottom). */
  tall?: boolean;
  /** Only the handle shows; the title is still read out (Log sheet starts with its type switch). */
  hideTitle?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ id: number; y: number; t: number; dy: number; v: number } | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.style.transform = "";
      d.style.transition = "";
      d.showModal();
      // A child can ask for first focus (the Log sheet focuses the amount).
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  // ---- Swipe down to dismiss (on the handle and title bar).
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0, v: 0 };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // pointer already gone
    }
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    const d = ref.current;
    if (!g || g.id !== e.pointerId || !d) return;
    const dy = Math.max(0, e.clientY - g.y); // only downwards
    const dt = Math.max(1, e.timeStamp - g.t);
    g.v = (dy - g.dy) / dt;
    g.dy = dy;
    g.t = e.timeStamp;
    d.style.transition = "none";
    d.style.transform = `translateY(${dy}px)`;
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    const d = ref.current;
    if (!g || g.id !== e.pointerId || !d) return;
    drag.current = null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (g.dy > CLOSE_AT || g.v > FLICK) {
      // Carry on down out of sight, then close.
      d.style.transition = reduce ? "none" : `transform 220ms ${EASE}`;
      d.style.transform = "translateY(100%)";
      setTimeout(() => d.close(), reduce ? 0 : 220);
    } else {
      d.style.transition = reduce ? "none" : `transform 260ms ${EASE}`;
      d.style.transform = "";
    }
  };

  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={tall ? "sheet sheet-tall" : "sheet"}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className={`flex flex-col gap-4 px-5 pb-[max(24px,env(safe-area-inset-bottom))] ${tall ? "h-full min-h-0" : ""}`}>
        {/* Grab here and pull down to close. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className={`-mx-5 flex cursor-grab touch-none flex-col items-center gap-3 px-5 pt-2.5 select-none active:cursor-grabbing ${hideTitle ? "-mb-1 pb-3" : ""}`}
        >
          <div aria-hidden className="h-[5px] w-10 rounded-full bg-line" />
          {hideTitle ? (
            <h2 className="sr-only">{title}</h2>
          ) : (
            <h2 className="flex min-h-11 items-center text-center text-[17px] font-bold">{title}</h2>
          )}
        </div>
        <button type="button" onClick={() => ref.current?.close()} className="sr-only">
          Close
        </button>
        {open && children}
      </div>
    </dialog>
  );
}

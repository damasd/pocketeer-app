"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { X } from "lucide-react";

/** Drag past this (px), or flick down faster than FLICK (px/ms), and the sheet closes. */
const CLOSE_AT = 110;
const FLICK = 0.6;
/** Finger travel before a touch counts as a drag (taps stay taps). */
const SLOP = 8;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
/** Closing slide; the backdrop fades over the same time (.sheet-closing in globals.css). */
const DISMISS_MS = 220;
/** Dispatch on a sheet's <dialog> to close it with the slide: `dialog.dispatchEvent(new Event(DISMISS_EVENT))`. */
export const DISMISS_EVENT = "sheet-dismiss";

// ---- Page behind an open sheet stays still. iPhone Safari keeps scrolling the page under a
// modal <dialog>, so the body is pinned in place while any sheet is open and put back after.
let locks = 0;
let savedY = 0;
function lockPage() {
  if (locks++ > 0) return;
  savedY = window.scrollY;
  const b = document.body.style;
  b.position = "fixed";
  b.top = `-${savedY}px`;
  b.left = "0";
  b.right = "0";
  document.documentElement.style.overflow = "hidden";
}
function unlockPage() {
  if (--locks > 0) return;
  const b = document.body.style;
  b.position = b.top = b.left = b.right = "";
  document.documentElement.style.overflow = "";
  window.scrollTo(0, savedY);
}

/** Slide a sheet down and fade its backdrop, then close it (X, backdrop, Escape, a drag past the line). */
function slideClose(d: HTMLDialogElement | null) {
  if (!d || !d.open || d.classList.contains("sheet-closing")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return d.close();
  d.classList.add("sheet-closing");
  d.style.transition = `transform ${DISMISS_MS}ms ${EASE}`;
  d.style.transform = "translateY(100%)";
  setTimeout(() => {
    d.close();
    d.classList.remove("sheet-closing");
  }, DISMISS_MS);
}

/** The part under `el` that can scroll vertically (inside the sheet), if any. */
function scrollerOf(el: Element | null, sheet: HTMLElement): HTMLElement | null {
  for (let n = el as HTMLElement | null; n && n !== sheet; n = n.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(n).overflowY) && n.scrollHeight > n.clientHeight + 1) return n;
  }
  return sheet.scrollHeight > sheet.clientHeight + 1 ? sheet : null;
}

/**
 * Bottom sheet on a native <dialog>: Escape, focus trap and an inert page come free.
 * Controlled by `open`; calls onClose when dismissed: drag the sheet down anywhere (a part that
 * scrolls first scrolls back to its top), tap the backdrop, or press Escape. Screen readers also
 * get a Close button.
 */
export function Sheet({
  open,
  onClose,
  title,
  tall = false,
  hideTitle = false,
  closeButton = false,
  leading,
  heading,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Fixed 92% height, content fills it (Log sheet with the keypad at the bottom). */
  tall?: boolean;
  /** Only the handle shows; the title is still read out (Log sheet starts with its type switch). */
  hideTitle?: boolean;
  /** A visible ✕ on the left of the title (Log transaction). */
  closeButton?: boolean;
  /** Replaces the X on the left of the title and must close the sheet itself (Log: X or back). */
  leading?: ReactNode;
  /** What the title bar shows in place of `title` (Log: "Enter an amount" while typing). */
  heading?: ReactNode;
  /** Buttons on the right of the title (Log transaction: voice and receipt). */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const toolbar = closeButton || leading !== undefined || actions !== undefined;
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

  // Freeze the page behind while open.
  useEffect(() => {
    if (!open) return;
    lockPage();
    return unlockPage;
  }, [open]);

  const dismiss = () => slideClose(ref.current);

  // Something outside this component (the Log sheet's own ✕) asks to close: same animation.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onDismiss = () => slideClose(d);
    d.addEventListener(DISMISS_EVENT, onDismiss);
    return () => d.removeEventListener(DISMISS_EVENT, onDismiss);
  }, []);

  /** Let go: carry on down and close, or settle back. */
  function finish(dy: number, v: number) {
    const d = ref.current;
    if (!d) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (dy > CLOSE_AT || v > FLICK) {
      slideClose(d);
    } else {
      d.style.transition = reduce ? "none" : `transform 260ms ${EASE}`;
      d.style.transform = "";
    }
  }
  function follow(dy: number) {
    const d = ref.current;
    if (!d) return;
    d.style.transition = "none";
    d.style.transform = `translateY(${dy}px)`;
  }

  // ---- Touch: drag down anywhere on the sheet to dismiss it. Starting on a part that is scrolled
  // down, the finger scrolls it first; sideways swipes (category chips) are left alone.
  useEffect(() => {
    const d = ref.current;
    if (!d || !open) return;
    let g: { x: number; y: number; t: number; scroller: HTMLElement | null; dragging: boolean; dy: number; v: number } | null = null;
    let swallowClick = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return (g = null);
      const t = e.touches[0];
      g = { x: t.clientX, y: t.clientY, t: e.timeStamp, scroller: scrollerOf(e.target as Element, d), dragging: false, dy: 0, v: 0 };
    };
    const onMove = (e: TouchEvent) => {
      if (!g) return;
      const t = e.touches[0];
      if (!g.dragging) {
        const dx = t.clientX - g.x;
        const dy = t.clientY - g.y;
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        // Sideways, upwards, or a part that can still scroll up: not ours.
        if (Math.abs(dx) > Math.abs(dy) || dy < 0 || (g.scroller && g.scroller.scrollTop > 0)) {
          g = null;
          return;
        }
        g.dragging = true;
        g.y = t.clientY;
        g.t = e.timeStamp;
      }
      e.preventDefault(); // the sheet moves, nothing scrolls
      const dy = Math.max(0, t.clientY - g.y);
      g.v = (dy - g.dy) / Math.max(1, e.timeStamp - g.t);
      g.dy = dy;
      g.t = e.timeStamp;
      follow(dy);
    };
    const onEnd = () => {
      if (g?.dragging) {
        swallowClick = true;
        setTimeout(() => (swallowClick = false), 0);
        finish(g.dy, g.v);
      }
      g = null;
    };
    // A drag is not a tap on whatever it started on.
    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return;
      e.preventDefault();
      e.stopPropagation();
    };

    d.addEventListener("touchstart", onStart, { passive: true });
    d.addEventListener("touchmove", onMove, { passive: false });
    d.addEventListener("touchend", onEnd);
    d.addEventListener("touchcancel", onEnd);
    d.addEventListener("click", onClick, true);
    return () => {
      d.removeEventListener("touchstart", onStart);
      d.removeEventListener("touchmove", onMove);
      d.removeEventListener("touchend", onEnd);
      d.removeEventListener("touchcancel", onEnd);
      d.removeEventListener("click", onClick, true);
    };
  }, [open]);

  // ---- Mouse (laptop): drag the handle / title bar. Touch is handled above.
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" || (e.pointerType === "mouse" && e.button !== 0)) return;
    if ((e.target as Element).closest("button")) return; // buttons in the title bar stay clickable
    drag.current = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0, v: 0 };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // pointer already gone
    }
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    if (!g || g.id !== e.pointerId) return;
    const dy = Math.max(0, e.clientY - g.y); // only downwards
    g.v = (dy - g.dy) / Math.max(1, e.timeStamp - g.t);
    g.dy = dy;
    g.t = e.timeStamp;
    follow(dy);
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    if (!g || g.id !== e.pointerId) return;
    drag.current = null;
    finish(g.dy, g.v);
  };

  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={tall ? "sheet sheet-tall" : "sheet"}
      onClose={onClose}
      onCancel={(e) => {
        // Escape: slide away instead of vanishing.
        e.preventDefault();
        dismiss();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className={`flex flex-col gap-4 px-5 pb-[max(24px,env(safe-area-inset-bottom))] ${tall ? "h-full min-h-0" : ""}`}>
        {/* Handle; on a laptop, grab here and pull down to close. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className={`-mx-5 flex cursor-grab touch-none flex-col items-center gap-3 px-5 pt-2.5 select-none active:cursor-grabbing ${hideTitle ? "-mb-1 pb-3" : ""}`}
        >
          <div aria-hidden className="h-[5px] w-10 rounded-full bg-line" />
          {toolbar ? (
            // Title centred on the sheet whatever sits either side of it.
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex justify-start">
                {leading}
                {!leading && closeButton && (
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={dismiss}
                    className="flex size-11 items-center justify-center rounded-full bg-page text-ink"
                  >
                    <X aria-hidden size={18} strokeWidth={2.25} />
                  </button>
                )}
              </div>
              <h2 className="text-center text-heading font-bold">{heading ?? title}</h2>
              <div className="flex justify-end gap-2">{actions}</div>
            </div>
          ) : hideTitle ? (
            <h2 className="sr-only">{title}</h2>
          ) : (
            <h2 className="flex min-h-11 items-center text-center text-heading font-bold">{title}</h2>
          )}
        </div>
        {!closeButton && !leading && (
          <button type="button" onClick={dismiss} className="sr-only">
            Close
          </button>
        )}
        {open && children}
      </div>
    </dialog>
  );
}

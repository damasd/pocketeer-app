"use client";

import Link from "next/link";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { CARD_STYLES } from "@/components/account-card";
import type { AccountColour } from "@/lib/accounts";

/** Geometry of the peeking stack (unchanged from the Home mockup). */
const PEEK_WIDTH = 84; // visible strip at the right edge
const STEP = 26; // gap between card edges
const CARD_W = 140;
/** How far the front card travels before the next card has fully taken its place. */
const FULL_DRAG = 120;
/** Swipe distance that counts as "open Accounts". */
const COMMIT_AT = 60;
/** iOS-like curve: quick start, long natural deceleration. */
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const SLIDE_MS = 460;
const SNAP_MS = 320;
/** Open Accounts while the slide is finishing, so the two motions blend. */
const NAVIGATE_AFTER_MS = 340;

const FALLBACK: AccountColour[] = ["lime", "white", "grey", "black"];
/** Left edge of each card inside the peek strip; the 4th waits just past the right edge. */
const POS = [0, STEP, STEP * 2, PEEK_WIDTH + 4];

/**
 * Colours of the four cards in the stack: the first three accounts, plus the next one waiting
 * just off the right edge (it slides into view as the front card leaves). Fewer accounts loop round.
 */
export function stackColours(accounts: { colour: AccountColour }[]): AccountColour[] {
  if (accounts.length === 0) return FALLBACK;
  return [0, 1, 2, 3].map((i) => (i < accounts.length ? accounts[i].colour : i < 3 ? FALLBACK[i] : accounts[0].colour));
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Swipe-left gesture for the Home header: the front card follows the finger, the cards behind
 * move up one place, and on release past the threshold the front card slides away and
 * Accounts opens. A short swipe springs back. Only the cards move; the header stays still.
 */
export function useAccountSwipe(open: () => void) {
  const stackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; dx: number; active: boolean } | null>(null);
  const busy = useRef(false);
  const swallowClick = useRef(false);

  const cards = () => Array.from(stackRef.current?.querySelectorAll<HTMLElement>("[data-card]") ?? []);

  /** frontX: offset of the front card; p: 0..1, how far the others have moved up one place. */
  function place(frontX: number, p: number, transition: string | null, stagger = 0) {
    cards().forEach((el, i) => {
      el.style.transition = transition ? `transform ${transition}` : "none";
      el.style.transitionDelay = transition ? `${i * stagger}ms` : "0ms";
      // Each card behind moves up into the place of the one in front of it.
      el.style.transform = `translate3d(${i === 0 ? frontX : (POS[i - 1] - POS[i]) * p}px,0,0)`;
    });
  }

  function commit() {
    busy.current = true;
    if (reducedMotion()) {
      open();
      busy.current = false;
      return;
    }
    const width = stackRef.current?.clientWidth ?? 400;
    // Past the left edge of the screen, whatever the screen width.
    place(-(width - PEEK_WIDTH + CARD_W + 24), 1, `${SLIDE_MS}ms ${EASE}`, 35);
    setTimeout(open, NAVIGATE_AFTER_MS);
    // Put the cards back once Accounts has taken over, ready for the next visit to Home.
    setTimeout(() => {
      place(0, 0, null);
      busy.current = false;
    }, SLIDE_MS + 500);
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (busy.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, active: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.active) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null; // vertical: let the page scroll
        return;
      }
      if (Math.abs(dx) < 8) return;
      d.active = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId); // keep the drag if the finger leaves the header
      } catch {
        // pointer already gone; the drag still works without capture
      }
    }
    d.dx = dx;
    if (reducedMotion()) return;
    // Left: follow the finger. Right: a little give, then resistance.
    const frontX = dx < 0 ? dx : dx * 0.15;
    place(frontX, Math.min(1, Math.max(0, -dx / FULL_DRAG)), null);
  };

  const end = (e: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.active) return;
    // A drag is not a tap: ignore the click the browser may send right after it.
    swallowClick.current = true;
    setTimeout(() => (swallowClick.current = false), 0);
    if (!cancelled && d.dx < -COMMIT_AT) commit();
    else place(0, 0, `${SNAP_MS}ms ${EASE}`);
  };

  return {
    stackRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: ReactPointerEvent<HTMLElement>) => end(e, false),
      onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => end(e, true),
      onClickCapture: (e: React.MouseEvent) => {
        if (swallowClick.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
    },
  };
}

/**
 * The card stack peeking in at the right edge of the Home header. The layer spans the whole
 * header so the front card can slide across it; only the strip at the right takes taps.
 */
export function AccountStack({
  colours,
  stackRef,
}: {
  colours: AccountColour[];
  stackRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <div ref={stackRef} aria-hidden className="pointer-events-none absolute inset-x-0 top-[100px] h-40 overflow-hidden">
        {colours.map((c, i) => {
          const s = CARD_STYLES[c];
          return (
            <span
              key={i}
              data-card
              className="absolute top-0 h-40 rounded-[18px] border will-change-transform"
              style={{
                width: CARD_W,
                left: `calc(100% - ${PEEK_WIDTH}px + ${POS[i]}px)`,
                background: s.bg,
                borderColor: s.bg === "#111111" ? "#2E2E2E" : "transparent",
                boxShadow: "-6px 0 14px rgba(0,0,0,0.3)",
              }}
            />
          );
        })}
      </div>
      <Link
        href="/account"
        transitionTypes={["nav-forward"]}
        aria-label="Open accounts"
        className="absolute top-[100px] right-0 block h-40 rounded-l-[18px]"
        style={{ width: PEEK_WIDTH }}
      />
    </>
  );
}

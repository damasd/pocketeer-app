"use client";

import Link from "next/link";
import { useRef, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { AccountCardFace, CARD_STYLES } from "@/components/account-card";
import type { Account } from "@/lib/accounts";
import { cardTransitionName, setHandoff } from "@/lib/card-handoff";

/** Peek strip at the right edge, and the gap between card edges inside it (unchanged look). */
const PEEK_WIDTH = 84;
const STEP = 26;
/** Real card height on Accounts; on Home the same card is shown smaller. */
const CARD_H = 216;
const SMALL_H = 160;
const SCALE = SMALL_H / CARD_H;
/** Column the cards line up in while pulled: left edge and vertical gap. */
const COLUMN_X = 20;
const COLUMN_GAP = 12;
/** Swipe distance that counts as "open Accounts". */
const COMMIT_AT = 60;
/** iOS-like curve: quick start, long natural deceleration. */
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const ARRANGE_MS = 380;
const SNAP_MS = 320;
const STAGGER_MS = 30;
/** How long the zoom into Accounts takes (matches ::view-transition-group(.acct-card) in globals.css). */
const ZOOM_MS = 520;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** The first three cards in the order the Accounts page shows them: Spending, then Saving. */
export function topCards<T extends Pick<Account, "group" | "archived">>(accounts: T[]): T[] {
  const active = accounts.filter((a) => !a.archived);
  return [...active.filter((a) => a.group === "spending"), ...active.filter((a) => a.group === "saving")].slice(0, 3);
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Swipe-left gesture for the Home header. While pulled, all cards come out of the stack and line
 * up top to bottom, their details fading in; on release past the threshold they finish lining up,
 * then each card zooms into its place on the Accounts page. A short swipe springs back.
 * Only the cards move; the header stays still.
 */
export function useAccountSwipe(open: () => void) {
  const stackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; dx: number; active: boolean } | null>(null);
  const busy = useRef(false);
  const swallowClick = useRef(false);

  const cards = () => Array.from(stackRef.current?.querySelectorAll<HTMLElement>("[data-card]") ?? []);

  /** Card i at progress p: 0 = resting in the stack, 1 = lined up in the column. */
  function place(p: number, transition: string | null) {
    const width = stackRef.current?.clientWidth ?? 390;
    const travel = width - PEEK_WIDTH - COLUMN_X; // front card's distance, so it tracks the finger
    cards().forEach((el, i) => {
      // The front card leads; the ones behind follow a little later.
      const q = clamp01(p * 1.25 - i * 0.125);
      const x = -(travel + i * STEP) * q;
      const y = i * (SMALL_H + COLUMN_GAP) * q;
      el.style.transition = transition ? `transform ${transition}` : "none";
      el.style.transitionDelay = transition ? `${i * STAGGER_MS}ms` : "0ms";
      el.style.transform = `translate3d(${x}px,${y}px,0) scale(${SCALE})`;
      const content = el.querySelectorAll<HTMLElement>(".card-content");
      content.forEach((c) => {
        c.style.transition = transition ? `opacity ${transition}` : "none";
        c.style.opacity = String(clamp01((q - 0.25) / 0.5));
      });
    });
    return travel;
  }

  function nameCards(on: boolean) {
    cards().forEach((el) => {
      el.style.viewTransitionName = on ? cardTransitionName(el.dataset.card ?? "") : "";
    });
  }

  function commit() {
    busy.current = true;
    const ids = cards().map((el) => el.dataset.card ?? "");
    if (reducedMotion() || ids.length === 0) {
      open();
      busy.current = false;
      return;
    }
    place(1, `${ARRANGE_MS}ms ${EASE}`);
    const lined = ARRANGE_MS + STAGGER_MS * (ids.length - 1);
    setTimeout(() => {
      // Same names here and on Accounts: the browser zooms each card into its new place.
      nameCards(true);
      setHandoff(ids);
      open();
    }, lined);
    // Once Accounts has taken over: put the stack back for the next visit to Home.
    setTimeout(() => {
      nameCards(false);
      setHandoff([]);
      place(0, null);
      busy.current = false;
    }, lined + ZOOM_MS + 400);
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
    const width = stackRef.current?.clientWidth ?? 390;
    const travel = width - PEEK_WIDTH - COLUMN_X;
    // Left: the front card follows the finger. Right: no movement (nothing to pull).
    place(clamp01(-dx / travel), null);
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
    else place(0, `${SNAP_MS}ms ${EASE}`);
  };

  return {
    stackRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: ReactPointerEvent<HTMLElement>) => end(e, false),
      onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => end(e, true),
      onClickCapture: (e: MouseEvent) => {
        if (swallowClick.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
    },
  };
}

type StackAccount = Pick<Account, "id" | "name" | "accountNumber" | "colour"> & { balance: number; saved: number };

/**
 * The top three account cards peeking in at the right edge of the Home header: the real cards,
 * shown smaller, with only their coloured edges visible until pulled. The layer spans the whole
 * header so the cards can travel across it; only the strip at the right takes taps.
 */
export function AccountStack({
  accounts,
  masked,
  stackRef,
}: {
  accounts: StackAccount[];
  masked: boolean;
  stackRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <div
        ref={stackRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[100px] z-10 overflow-x-clip"
        style={{ height: SMALL_H }}
      >
        {accounts.map((a, i) => {
          const dark = CARD_STYLES[a.colour].bg === "#111111";
          return (
            <div
              key={a.id}
              data-card={a.id}
              className="acct-card absolute top-0 rounded-3xl will-change-transform"
              style={{
                width: "calc(100% - 40px)",
                height: CARD_H,
                left: `calc(100% - ${PEEK_WIDTH}px + ${i * STEP}px)`,
                transformOrigin: "0 0",
                transform: `scale(${SCALE})`,
                // A thin edge keeps a black card visible on the black header; soft shadow for depth.
                boxShadow: `${dark ? "0 0 0 1.5px #2E2E2E, " : ""}-8px 0 18px rgba(0,0,0,0.32)`,
              }}
            >
              <AccountCardFace
                name={a.name}
                accountNumber={a.accountNumber}
                colour={a.colour}
                balance={a.balance}
                saved={a.saved}
                masked={masked}
                contentHidden
              />
            </div>
          );
        })}
      </div>
      <Link
        href="/account"
        aria-label="Open accounts"
        className="absolute top-[100px] right-0 z-10 block rounded-l-[18px]"
        style={{ width: PEEK_WIDTH, height: SMALL_H }}
      />
    </>
  );
}

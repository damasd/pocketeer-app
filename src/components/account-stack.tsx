"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { AccountCardFace, CARD_STYLES } from "@/components/account-card";
import type { Account } from "@/lib/accounts";
import { cardTransitionName, estimatedSlots, measuredSlots, setHandoff } from "@/lib/card-handoff";
import { STATUS_BAR, keepStatusBarColour, setStatusBarColour } from "@/lib/status-bar";

/** Peek strip at the right edge, and the gap between card edges inside it (unchanged look). */
const PEEK_WIDTH = 84;
const STEP = 26;
/** Real card height on Accounts; on Home the same card is shown smaller. */
const CARD_H = 216;
// Matches the height of the Remaining budget block beside it (home-screen.tsx).
const SMALL_H = 124;
const SCALE = SMALL_H / CARD_H;
/** Swipe distance that counts as "open Accounts". */
const COMMIT_AT = 60;
/** Ease out: moves off at once, then slows to a long, soft stop. */
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const ARRANGE_MS = 1400;
const SNAP_MS = 700;
/** Edge shadow that separates the cards in the resting stack; it fades as they come out. */
const stackShadow = (strength: number, dark: boolean) =>
  `${dark ? `0 0 0 1.5px rgba(46,46,46,${strength.toFixed(3)}), ` : ""}-6px 0 14px rgba(0,0,0,${(0.28 * strength).toFixed(3)})`;
/** How long the hand-over into Accounts takes (matches ::view-transition-group(.acct-card) in globals.css). */
const ZOOM_MS = 1300;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Slide the nav bar's selected circle (nav-bar.tsx) from Home toward Account by p, following the
 * finger (no transition) or finishing with the cards. p = null hands it back to the nav bar.
 */
function moveNavCircle(p: number | null, transition: string | null) {
  const circle = document.querySelector<HTMLElement>("[data-nav-circle]");
  if (!circle) return;
  if (p === null) {
    circle.style.transition = "";
    return;
  }
  const from = document.querySelector<HTMLElement>('nav a[href="/"]');
  const to = document.querySelector<HTMLElement>('nav a[href="/account"]');
  if (!from || !to) return;
  circle.style.transition = transition ? `left ${transition}` : p > 0 ? "none" : "";
  circle.style.left = `${from.offsetLeft + (to.offsetLeft - from.offsetLeft) * p}px`;
}

/** The first three cards in the order the Accounts page shows them: Spending, then Saving. */
export function topCards<T extends Pick<Account, "group" | "archived">>(accounts: T[]): T[] {
  const active = accounts.filter((a) => !a.archived);
  return [...active.filter((a) => a.group === "spending"), ...active.filter((a) => a.group === "saving")].slice(0, 3);
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The Accounts page's top padding: max(8px, safe area at the top), as in src/app/account/page.tsx. */
function accountsTopPadding() {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;visibility:hidden;padding-top:max(8px, env(safe-area-inset-top))";
  document.body.appendChild(probe);
  const px = parseFloat(getComputedStyle(probe).paddingTop) || 8;
  probe.remove();
  return px;
}

/** What the gesture needs to know about the cards in the stack. */
export type StackLayout = { cards: { id: string; group: "spending" | "saving" }[]; spending: number };

/**
 * Swipe-left gesture for the Home header. While pulled, Home slides left and a copy of the
 * Accounts page slides in from the right; the cards come out of the stack and move to the exact
 * places and size they have on Accounts, their details fading in. On release past the threshold
 * everything finishes the move, each card is set down in its place, and the real Accounts page
 * takes over. A short swipe springs back.
 */
export function useAccountSwipe(open: () => void, layout: StackLayout) {
  const stackRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; dx: number; active: boolean } | null>(null);
  const busy = useRef(false);
  const swallowClick = useRef(false);
  const layoutRef = useRef(layout);
  const topPad = useRef<number | null>(null);
  /** How far Home is currently slid left (px, negative). */
  const shift = useRef(0);
  useLayoutEffect(() => {
    layoutRef.current = layout;
  });

  const cards = () => Array.from(stackRef.current?.querySelectorAll<HTMLElement>("[data-card]") ?? []);
  const pageWidth = () => pageRef.current?.clientWidth ?? 390;

  /**
   * Where each card goes: measured on the last visit to Accounts; else the gap left for it in the
   * sliding copy of the page; else calculated from the page layout.
   */
  function targets() {
    const { cards: list, spending } = layoutRef.current;
    const vw = window.innerWidth;
    const measured = measuredSlots(
      list.map((c) => c.id),
      vw,
    );
    if (measured) return measured;
    topPad.current ??= accountsTopPadding();
    const estimate = estimatedSlots(list, spending, vw, topPad.current);
    return estimate.map((slot, i) => {
      const gap = previewRef.current?.querySelector<HTMLElement>(`[data-preview-slot="${list[i].id}"]`);
      return gap ? { ...slot, y: gap.getBoundingClientRect().top } : slot;
    });
  }

  /** Offset that takes card i from its resting place (Home not slid) to its place on Accounts. */
  function moves() {
    const box = stackRef.current?.getBoundingClientRect();
    const width = stackRef.current?.clientWidth ?? 390;
    const cardW = width - 40;
    const left = (box?.left ?? 0) - shift.current;
    return targets().map((t, i) => ({
      x: t.x - (left + width - PEEK_WIDTH + i * STEP),
      y: t.y - (box?.top ?? 0),
      scale: t.width / cardW,
    }));
  }

  /** Progress p: 0 = resting stack on Home, 1 = Accounts page in place with the cards on it. */
  function place(p: number, transition: string | null, els = cards(), nav = true) {
    const to = p > 0 ? moves() : [];
    const w = pageWidth();
    const pageX = -p * w;
    const css = (prop: string) => (transition ? `${prop} ${transition}` : "none");

    // Home slides left; the copy of Accounts comes in from the right, touching its edge.
    const page = pageRef.current;
    if (page) {
      page.style.transition = css("transform");
      page.style.transform = p > 0 ? `translate3d(${pageX}px,0,0)` : "";
    }
    const preview = previewRef.current;
    if (preview) {
      preview.style.transition = css("transform");
      preview.style.transform = `translate3d(${w + pageX}px,0,0)`;
      if (p > 0) preview.style.visibility = "visible";
      else if (!transition) preview.style.visibility = "hidden";
      else setTimeout(() => shift.current === 0 && (preview.style.visibility = "hidden"), SNAP_MS);
    }
    shift.current = pageX;
    // The nav bar's grey circle travels from Home to Account with the pull.
    if (nav) moveNavCircle(p, transition);
    // Band behind the iPhone status bar: Home's black until Accounts covers most of the screen.
    setStatusBarColour(p > 0.5 ? STATUS_BAR.light : null);
    // At rest the stack is clipped at the screen edge; while pulled, cards travel beyond Home.
    // The page clips them instead, so it never grows wider than the screen (no sideways scroll or zoom).
    const pulled = p > 0 || transition !== null;
    const stack = stackRef.current;
    if (stack) stack.style.overflowX = pulled ? "visible" : "";
    document.documentElement.style.overflowX = pulled ? "clip" : "";
    document.body.style.overflowX = pulled ? "clip" : "";

    els.forEach((el, i) => {
      // The front card leads; the ones behind follow a little later.
      const q = clamp01(p * 1.25 - i * 0.125);
      const m = to[i] ?? { x: 0, y: 0, scale: SCALE };
      const scale = SCALE + (m.scale - SCALE) * q;
      // The cards sit inside Home, so undo Home's slide to keep them on their own path.
      el.style.transition = transition ? `transform ${transition}, box-shadow ${transition}` : "none";
      el.style.transform = `translate3d(${m.x * q - pageX}px,${m.y * q}px,0) scale(${scale})`;
      el.style.boxShadow = stackShadow(1 - q, el.dataset.dark === "true");
      el.querySelectorAll<HTMLElement>(".card-content").forEach((c) => {
        c.style.transition = css("opacity");
        c.style.opacity = String(clamp01((q - 0.25) / 0.5));
      });
    });
  }

  function nameCards(on: boolean, els = cards()) {
    els.forEach((el) => {
      el.style.viewTransitionName = on ? cardTransitionName(el.dataset.card ?? "") : "";
    });
  }

  /** Back to the resting stack, with no leftovers from a swipe. */
  function reset(els = cards()) {
    nameCards(false, els);
    // Not the nav circle: by now it belongs to whichever page is showing.
    place(0, null, els, false);
    moveNavCircle(null, null);
    busy.current = false;
  }

  // Home stays alive in the background after a swipe; whenever it is shown again,
  // start from the resting stack (the pulled cards belong to Accounts now).
  useLayoutEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit() {
    busy.current = true;
    const els = cards(); // keep hold of them: Home may be hidden before the clean-up runs
    const ids = els.map((el) => el.dataset.card ?? "");
    if (reducedMotion() || ids.length === 0) {
      open();
      busy.current = false;
      return;
    }
    place(1, `${ARRANGE_MS}ms ${EASE}`, els);
    setTimeout(() => {
      // Same names here and on Accounts: each card hands over to its twin on the real page.
      nameCards(true, els);
      setHandoff(ids);
      keepStatusBarColour(); // Accounts sets its own colour from here

      open();
      setTimeout(() => {
        setHandoff([]);
        reset(els);
      }, ZOOM_MS + 400);
    }, ARRANGE_MS);
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
    // Left: the front card follows the finger. Right: no movement (nothing to pull).
    const travel = Math.max(1, -(moves()[0]?.x ?? -300) / 1.25);
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
    else {
      busy.current = true; // let it settle before the next pull
      place(0, `${SNAP_MS}ms ${EASE}`);
      setTimeout(() => {
        place(0, null); // settled: clip the stack again and hide the Accounts copy
        busy.current = false;
      }, SNAP_MS);
    }
  };

  return {
    stackRef,
    pageRef,
    previewRef,
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
        className="pointer-events-none absolute -inset-x-5 top-0 z-10 overflow-x-clip"
        style={{ height: SMALL_H }}
      >
        {accounts.map((a, i) => {
          const dark = CARD_STYLES[a.colour].bg === "#111111";
          return (
            <div
              key={a.id}
              data-card={a.id}
              data-dark={dark}
              className="acct-card absolute top-0 rounded-3xl will-change-transform"
              style={{
                width: "calc(100% - 40px)",
                height: CARD_H,
                left: `calc(100% - ${PEEK_WIDTH}px + ${i * STEP}px)`,
                transformOrigin: "0 0",
                transform: `scale(${SCALE})`,
                // A thin edge keeps a black card visible on the black header; edge shadow for depth.
                boxShadow: stackShadow(1, dark),
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
        className="absolute top-0 -right-5 z-10 block rounded-l-[14px]"
        style={{ width: PEEK_WIDTH, height: SMALL_H }}
      />
    </>
  );
}

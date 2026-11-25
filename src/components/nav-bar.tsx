"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import {
  ChartNoAxesColumn,
  House,
  Plus,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { LogForm } from "@/components/log-sheet";
import { Sheet } from "@/components/sheet";

type Tab = { href: string; label: string; Icon: LucideIcon };

const LEFT: Tab[] = [
  { href: "/", label: "Home", Icon: House },
  { href: "/account", label: "Account", Icon: Wallet },
];
const RIGHT: Tab[] = [
  { href: "/analytics", label: "Analytics", Icon: ChartNoAxesColumn },
  { href: "/plan", label: "Target: plan and goals", Icon: Target },
];

function isActive(pathname: string, href: string) {
  // History opens from Home, so Home stays selected there (mockup).
  if (href === "/") return pathname === "/" || pathname.startsWith("/history");
  return pathname.startsWith(href);
}

/** Tabs in bar order, for the slide direction between them. */
const ORDER = [...LEFT, ...RIGHT].map((t) => t.href);

/**
 * Page transition direction: a tab to the right of the current one slides forward, to the left
 * slides back. From a page that isn't a tab (Settings, …) the page just crossfades.
 */
function directionTo(pathname: string, href: string): string[] | undefined {
  const from = ORDER.findIndex((h) => isActive(pathname, h));
  const to = ORDER.indexOf(href);
  if (from < 0 || from === to) return undefined;
  return [to > from ? "nav-forward" : "nav-back"];
}

function TabLink({ tab, active, pathname, linkRef }: { tab: Tab; active: boolean; pathname: string; linkRef: Ref<HTMLAnchorElement> }) {
  const { href, label, Icon } = tab;
  return (
    <Link
      ref={linkRef}
      href={href}
      transitionTypes={directionTo(pathname, href)}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={[
        // The grey circle behind the selected icon is the sliding one in NavBar.
        "relative z-10 flex size-12 items-center justify-center rounded-full transition-colors duration-300",
        active ? "text-white" : "text-nav-idle hover:text-white",
      ].join(" ")}
    >
      <Icon aria-hidden size={24} strokeWidth={active ? 2.25 : 2} />
    </Link>
  );
}

/** Fields that bring up the on-screen keyboard (not buttons, checkboxes, sliders, …). */
const NO_KEYBOARD = new Set(["button", "checkbox", "radio", "range", "color", "file", "submit", "reset", "image", "hidden"]);
function bringsKeyboard(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLInputElement) return !NO_KEYBOARD.has(el.type);
  return el instanceof HTMLTextAreaElement || (el instanceof HTMLElement && el.isContentEditable);
}

/** True while a text field has focus, i.e. the keyboard is up on the phone. */
function useTyping(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const check = () => setTyping(bringsKeyboard(document.activeElement));
    // On blur, wait a moment: the keyboard's up/down arrows move focus straight to the next field.
    let t: ReturnType<typeof setTimeout> | undefined;
    const onOut = () => {
      clearTimeout(t);
      t = setTimeout(check, 50);
    };
    document.addEventListener("focusin", check);
    document.addEventListener("focusout", onOut);
    return () => {
      clearTimeout(t);
      document.removeEventListener("focusin", check);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  return typing;
}

export function NavBar() {
  const pathname = usePathname();
  const [logOpen, setLogOpen] = useState(false);
  const typing = useTyping();

  // The selected tab's grey circle slides to the tab you open. It jumps into place on first
  // show, and fades out on pages that aren't a tab (Settings, …).
  const links = useRef(new Map<string, HTMLAnchorElement>());
  const [circle, setCircle] = useState<{ x: number; animate: boolean } | null>(null);
  const activeHref = ORDER.find((h) => isActive(pathname, h)) ?? null;
  useLayoutEffect(() => {
    const el = activeHref ? links.current.get(activeHref) : undefined;
    if (!el) return setCircle((c) => (c ? { ...c, animate: true } : c));
    const x = el.offsetLeft;
    setCircle((c) => ({ x, animate: c !== null }));
  }, [activeHref]);
  const linkRef = (href: string) => (el: HTMLAnchorElement | null) => {
    if (el) links.current.set(href, el);
    else links.current.delete(href);
  };

  if (pathname === "/login") return null;

  return (
    <>
      <nav
        aria-label="Main"
        inert={typing}
        className={`fixed left-1/2 z-40 flex h-16 w-[336px] -translate-x-1/2 select-none items-center justify-between rounded-full bg-ink px-2 shadow-[0_10px_30px_rgba(17,17,17,0.28)] transition-[translate,opacity] duration-200 ease-out motion-reduce:transition-none ${
          // Out of the way while typing: the keyboard covers the bottom of the screen anyway.
          typing ? "pointer-events-none translate-y-[calc(100%+48px)] opacity-0" : ""
        }`}
        style={{ bottom: "max(16px, env(safe-area-inset-bottom))", viewTransitionName: "nav-bar" }}
      >
        {circle && (
          <span
            aria-hidden
            data-nav-circle
            className={`absolute top-2 z-0 size-12 rounded-full bg-nav-selected ${
              // Moved with left, not transform: Safari draws a transformed, animating element on its
              // own layer above the icons whatever the stacking order.
              circle.animate ? "transition-[left,opacity] duration-[300ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none" : ""
            } ${activeHref ? "" : "opacity-0"}`}
            style={{ left: circle.x }}
          />
        )}
        {LEFT.map((tab) => (
          <TabLink key={tab.href} tab={tab} active={isActive(pathname, tab.href)} pathname={pathname} linkRef={linkRef(tab.href)} />
        ))}
        <button
          type="button"
          aria-label="Log transaction"
          aria-haspopup="dialog"
          onClick={() => setLogOpen(true)}
          className="relative z-10 flex size-[68px] flex-none -translate-y-3 items-center justify-center rounded-full bg-lime text-ink shadow-[0_6px_16px_rgba(17,17,17,0.25)] transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          <Plus aria-hidden size={30} strokeWidth={2.5} />
        </button>
        {RIGHT.map((tab) => (
          <TabLink key={tab.href} tab={tab} active={isActive(pathname, tab.href)} pathname={pathname} linkRef={linkRef(tab.href)} />
        ))}
      </nav>
      <Sheet open={logOpen} onClose={() => setLogOpen(false)} title="Log transaction" hideTitle>
        <LogForm onDone={() => setLogOpen(false)} />
      </Sheet>
    </>
  );
}

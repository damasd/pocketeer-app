"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

function TabLink({ tab, active, pathname }: { tab: Tab; active: boolean; pathname: string }) {
  const { href, label, Icon } = tab;
  return (
    <Link
      href={href}
      transitionTypes={directionTo(pathname, href)}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={[
        "flex size-12 items-center justify-center rounded-full transition-colors duration-150",
        active
          ? "bg-nav-selected text-white"
          : "text-nav-idle hover:text-white",
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
        {LEFT.map((tab) => (
          <TabLink key={tab.href} tab={tab} active={isActive(pathname, tab.href)} pathname={pathname} />
        ))}
        <button
          type="button"
          aria-label="Log transaction"
          aria-haspopup="dialog"
          onClick={() => setLogOpen(true)}
          className="flex size-[68px] flex-none items-center justify-center rounded-full bg-lime text-ink shadow-[0_6px_16px_rgba(17,17,17,0.25)] transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          <Plus aria-hidden size={30} strokeWidth={2.5} />
        </button>
        {RIGHT.map((tab) => (
          <TabLink key={tab.href} tab={tab} active={isActive(pathname, tab.href)} pathname={pathname} />
        ))}
      </nav>
      <Sheet open={logOpen} onClose={() => setLogOpen(false)} title="Log transaction" tall>
        <LogForm onDone={() => setLogOpen(false)} />
      </Sheet>
    </>
  );
}

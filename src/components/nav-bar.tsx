"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  { href: "/plan", label: "Plan: budget and goals", Icon: Target },
];

function isActive(pathname: string, href: string) {
  // History opens from Home, so Home stays selected there (mockup).
  if (href === "/") return pathname === "/" || pathname.startsWith("/history");
  return pathname.startsWith(href);
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  const { href, label, Icon } = tab;
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={[
        "flex size-11 items-center justify-center rounded-full transition-colors duration-150",
        active
          ? "bg-nav-selected text-white"
          : "text-nav-idle hover:text-white",
      ].join(" ")}
    >
      <Icon aria-hidden size={24} strokeWidth={active ? 2.25 : 2} />
    </Link>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const [logOpen, setLogOpen] = useState(false);

  if (pathname === "/login") return null;

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed left-1/2 z-40 flex h-14 w-[320px] -translate-x-1/2 select-none items-center justify-between rounded-full bg-ink px-3 shadow-[0_10px_30px_rgba(17,17,17,0.28)]"
        style={{ bottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        {LEFT.map((tab) => (
          <TabLink key={tab.href} tab={tab} active={isActive(pathname, tab.href)} />
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
          <TabLink key={tab.href} tab={tab} active={isActive(pathname, tab.href)} />
        ))}
      </nav>
      <Sheet open={logOpen} onClose={() => setLogOpen(false)} title="Log transaction" tall>
        <LogForm onDone={() => setLogOpen(false)} />
      </Sheet>
    </>
  );
}

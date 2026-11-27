import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

/** Page shell for the light tabs: title at top, room at the bottom for the floating nav bar. */
export function Screen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pt-[max(8px,env(safe-area-inset-top))] pb-36">
      <header className="pt-3">
        <PageTitle>{title}</PageTitle>
      </header>
      {children}
    </main>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="mt-6 text-meta font-medium text-muted">{children}</p>;
}

/** Title of a tab page (Accounts, Analytics, Target): 24 px bold, left. */
export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-title font-bold tracking-[-0.02em]">{children}</h1>;
}

/**
 * Header of a page reached with a back button (Budget, Transactions, every Settings page):
 * 44 px back button on the left, 17 px title in the centre, an optional 44 px action on the right.
 */
export function SubHeader({
  title,
  back,
  backLabel,
  action,
}: {
  title: string;
  back: string;
  backLabel: string;
  action?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[44px_1fr_44px] items-center gap-2 pt-3">
      <Link
        href={back}
        aria-label={backLabel}
        className="flex size-11 items-center justify-center rounded-full border border-line bg-card"
      >
        <ChevronLeft aria-hidden size={18} strokeWidth={2.25} />
      </Link>
      <h1 className="truncate text-center text-heading font-bold">{title}</h1>
      {action ?? <span aria-hidden />}
    </header>
  );
}

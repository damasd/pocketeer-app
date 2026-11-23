import type { ReactNode } from "react";

/** Page shell for the light tabs: title at top, room at the bottom for the floating nav bar. */
export function Screen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pt-[max(12px,env(safe-area-inset-top))] pb-36">
      <header className="pt-3">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">{title}</h1>
      </header>
      {children}
    </main>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="mt-6 text-[13px] font-medium text-muted">{children}</p>;
}

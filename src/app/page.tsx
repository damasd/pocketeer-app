import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "Home" };
export const viewport: Viewport = { themeColor: "#111111" };

/** Home: dark header over a white sheet with rounded top corners (brief, Screens). Content arrives in slice 8. */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-ink">
      <header className="px-5 pt-[max(32px,env(safe-area-inset-top))] pb-7 text-white">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Home</h1>
      </header>
      <section
        aria-label="Budget and transactions"
        className="flex-1 rounded-t-[28px] bg-card px-5 pt-3 pb-36"
      >
        <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-line" />
        <p className="mt-6 text-[13px] font-medium text-muted">
          Budget and recent transactions will show here.
        </p>
      </section>
    </main>
  );
}

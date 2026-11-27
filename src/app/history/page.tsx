import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { Suspense } from "react";
import { HistoryScreen } from "./history-screen";

export const metadata: Metadata = { title: "Transactions" };

export default function HistoryPage() {
  return (
    <PageTransition>
      <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pt-[max(8px,env(safe-area-inset-top))] pb-36">
        {/* Reads ?account= from the URL, so it renders in the browser. */}
        <Suspense fallback={<h1 className="pt-6 text-center text-heading font-bold">Transactions</h1>}>
          <HistoryScreen />
        </Suspense>
      </main>
    </PageTransition>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoryScreen } from "./history-screen";

export const metadata: Metadata = { title: "Transactions" };

export default function HistoryPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pt-[max(8px,env(safe-area-inset-top))] pb-36">
      {/* Reads ?account= from the URL, so it renders in the browser. */}
      <Suspense fallback={<h1 className="pt-6 text-center text-[17px] font-bold">Transactions</h1>}>
        <HistoryScreen />
      </Suspense>
    </main>
  );
}

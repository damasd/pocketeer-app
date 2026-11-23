import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { AnalyticsScreen } from "./analytics-screen";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <PageTransition>
      <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pt-[max(8px,env(safe-area-inset-top))] pb-36">
        <AnalyticsScreen />
      </main>
    </PageTransition>
  );
}

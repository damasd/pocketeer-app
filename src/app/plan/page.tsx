import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { PlanScreen } from "./plan-screen";

export const metadata: Metadata = { title: "Target" };

export default function PlanPage() {
  return (
    <PageTransition>
      <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pt-[max(8px,env(safe-area-inset-top))] pb-36">
        <PlanScreen />
      </main>
    </PageTransition>
  );
}

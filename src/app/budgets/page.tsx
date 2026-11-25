import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { BudgetsScreen } from "./budgets-screen";

export const metadata: Metadata = { title: "Budget" };

export default function BudgetsPage() {
  return (
    <PageTransition>
      <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pt-[max(8px,env(safe-area-inset-top))] pb-36">
        <BudgetsScreen />
      </main>
    </PageTransition>
  );
}

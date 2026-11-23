import type { Metadata } from "next";
import { PlanScreen } from "./plan-screen";

export const metadata: Metadata = { title: "Budget & goals" };

export default function PlanPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pt-[max(8px,env(safe-area-inset-top))] pb-36">
      <PlanScreen />
    </main>
  );
}

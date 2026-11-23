import type { Metadata } from "next";
import { PeriodsScreen } from "./periods-screen";

export const metadata: Metadata = { title: "Pay periods" };

export default function PeriodsPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pt-[max(12px,env(safe-area-inset-top))] pb-36">
      <PeriodsScreen />
    </main>
  );
}

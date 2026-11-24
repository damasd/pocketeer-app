import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { SecurityScreen } from "./security-screen";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <PageTransition>
      <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pt-[max(12px,env(safe-area-inset-top))] pb-36">
        <SecurityScreen />
      </main>
    </PageTransition>
  );
}

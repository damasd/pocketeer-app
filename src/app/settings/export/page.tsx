import type { Metadata } from "next";
import { ExportScreen } from "./export-screen";

export const metadata: Metadata = { title: "Export" };

export default function ExportPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pt-[max(12px,env(safe-area-inset-top))] pb-36">
      <ExportScreen />
    </main>
  );
}

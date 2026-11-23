import type { Metadata } from "next";
import { EmptyNote, Screen } from "@/components/screen";

export const metadata: Metadata = { title: "Budget & goals" };

export default function PlanPage() {
  return (
    <Screen title="Budget & goals">
      <EmptyNote>Monthly budgets and saving goals will show here.</EmptyNote>
    </Screen>
  );
}

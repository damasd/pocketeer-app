import type { Metadata } from "next";
import { EmptyNote, Screen } from "@/components/screen";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <Screen title="Analytics">
      <EmptyNote>Spending, income and saving over time will show here.</EmptyNote>
    </Screen>
  );
}

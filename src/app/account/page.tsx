import type { Metadata } from "next";
import { EmptyNote, Screen } from "@/components/screen";

export const metadata: Metadata = { title: "Accounts" };

export default function AccountPage() {
  return (
    <Screen title="Accounts">
      <EmptyNote>Your accounts and total balance will show here.</EmptyNote>
    </Screen>
  );
}

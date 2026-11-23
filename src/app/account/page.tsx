import type { Metadata } from "next";
import { AccountsScreen } from "./accounts-screen";

export const metadata: Metadata = { title: "Accounts" };

export default function AccountPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pt-[max(8px,env(safe-area-inset-top))] pb-36">
      <AccountsScreen />
    </main>
  );
}

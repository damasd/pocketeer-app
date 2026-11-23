import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { ProfileSettings } from "./profile-settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PageTransition>
      <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pt-[max(12px,env(safe-area-inset-top))] pb-36">
        <ProfileSettings />
      </main>
    </PageTransition>
  );
}

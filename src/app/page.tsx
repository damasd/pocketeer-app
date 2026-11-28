import type { Metadata, Viewport } from "next";
import { PageTransition } from "@/components/page-transition";
import { HomeScreen } from "./home-screen";

export const metadata: Metadata = { title: "Home" };
export const viewport: Viewport = { themeColor: "#060316" };

export default function HomePage() {
  return (
    <PageTransition>
      <HomeScreen />
    </PageTransition>
  );
}

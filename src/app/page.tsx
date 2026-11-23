import type { Metadata, Viewport } from "next";
import { HomeScreen } from "./home-screen";

export const metadata: Metadata = { title: "Home" };
export const viewport: Viewport = { themeColor: "#111111" };

export default function HomePage() {
  return <HomeScreen />;
}

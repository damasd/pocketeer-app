import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
import { LockScreen } from "@/components/lock-screen";
import { Toaster } from "@/components/toast";
import { PRE_HIDE_SCRIPT } from "@/lib/lock-rules";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Pocketeer", template: "%s · Pocketeer" },
  description: "Expenses, income, transfers and savings, per pay period.",
  applicationName: "Pocketeer",
  appleWebApp: {
    capable: true,
    title: "Pocketeer",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F3F3F2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the inline scripts may add data-theme / data-locked to <html> before React loads.
    <html lang="en" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <head>
        {/* Dark theme before first paint, so it never flashes light. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* Hide the app before first paint when an app lock is set, so no numbers flash. */}
        <script dangerouslySetInnerHTML={{ __html: PRE_HIDE_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <NavBar />
        <Toaster />
        <LockScreen />
      </body>
    </html>
  );
}

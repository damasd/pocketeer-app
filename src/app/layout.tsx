import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
import { Toaster } from "@/components/toast";
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
  themeColor: "#F2F2F2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh">
        {children}
        <NavBar />
        <Toaster />
      </body>
    </html>
  );
}

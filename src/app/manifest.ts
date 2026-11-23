import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Money",
    short_name: "Money",
    description: "Expenses, income, transfers and savings, per pay period.",
    start_url: "/",
    display: "standalone",
    background_color: "#F2F2F2",
    theme_color: "#F2F2F2",
    icons: [
      { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

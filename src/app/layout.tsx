import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vinify.example";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Vinify — Vehicle History. Made Simple.", template: "%s · Vinify" },
  description:
    "Decode any VIN free and check vehicle history before you buy. Clear, affordable used-car reports from Vinify.",
  applicationName: "Vinify",
  openGraph: {
    type: "website",
    siteName: "Vinify",
    title: "Vinify — Vehicle History. Made Simple.",
    description: "Decode any VIN free and check vehicle history before you buy.",
  },
  twitter: { card: "summary_large_image" },
  robots: process.env.VINIFY_INDEXABLE === "true" ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0a1733", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800&f[]=satoshi@400,500,700&display=swap"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600&display=swap"
        />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

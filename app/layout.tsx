import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import Navbar from "./components/Navbar";
import FooterSupport from "./components/FooterSupport";
import SupportCTA from "./components/SupportCTA";
import TopBar from "./components/TopBar";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  metadataBase: new URL("https://basescreener.fun"),
  title: {
    default: "BaseScreener — Base Token Screener & Tracker",
    template: "%s | BaseScreener",
  },
  description:
    "Track Base tokens in real-time: price, volume, liquidity, and smart activity. Fast Base token screener.",
  alternates: { canonical: "https://basescreener.fun" },
  openGraph: {
    type: "website",
    url: "https://basescreener.fun",
    title: "BaseScreener — Base Token Screener & Tracker",
    description:
      "Track Base tokens in real-time: price, volume, liquidity, and smart activity.",
    siteName: "BaseScreener",
  },
  twitter: {
    card: "summary_large_image",
    title: "BaseScreener — Base Token Screener & Tracker",
    description:
      "Track Base tokens in real-time: price, volume, liquidity, and smart activity.",
    creator: "@basescreenfun",
  },
  other: {
    "google-adsense-account": "ca-pub-2273778994224812",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "BaseScreener",
  url: "https://basescreener.fun",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://basescreener.fun/dashboard?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen">
        {/* ✅ Google AdSense (Next.js-safe) */}
        <Script
          id="adsense"
          async
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2273778994224812"
          crossOrigin="anonymous"
        />

        {/* ✅ SEO Structured Data (no hydration mismatch) */}
        <Script
          id="json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <TopBar />

        <Suspense fallback={<div className="h-14" />}>
          <Navbar />
        </Suspense>

        <main className="min-h-screen">
          {children}
          <SupportCTA />
        </main>

        <FooterSupport />

        {/* ✅ Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}

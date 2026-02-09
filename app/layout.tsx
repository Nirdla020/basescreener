import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import Navbar from "./components/Navbar";
import FooterSupport from "./components/FooterSupport";
import SupportCTA from "./components/SupportCTA";
import TopBar from "./components/TopBar";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import Providers from "./providers";
import TrackView from "./components/TrackView";

/* ✅ Global SEO Metadata */
export const metadata: Metadata = {
  metadataBase: new URL("https://basescreener.fun"),
  title: {
    default: "BaseScreener — Real-Time Base Token Screener",
    template: "%s | BaseScreener",
  },
  description:
    "Track Base tokens in real-time with live price, volume, liquidity, and trending movers. Fast Base token screener and analytics.",
  keywords: [
    "Base screener",
    "Base token screener",
    "Base token tracker",
    "Base tokens",
    "DEX screener Base",
    "crypto screener",
    "Base chain tokens",
    "Base analytics",
    "onchain analytics Base",
  ],
  alternates: {
    canonical: "https://basescreener.fun",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "https://basescreener.fun",
    title: "BaseScreener — Real-Time Base Token Screener",
    description:
      "Track Base tokens in real-time with live price, volume, liquidity, and trending movers.",
    siteName: "BaseScreener",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "BaseScreener — Real-Time Base Token Screener",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BaseScreener — Real-Time Base Token Screener",
    description:
      "Track Base tokens in real-time with live price, volume, liquidity, and trending movers.",
    creator: "@basescreenfun",
    images: ["/og.png"],
  },
  other: {
    "google-adsense-account": "ca-pub-2273778994224812",
  },
};

/* ✅ Structured Data */
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[#020617] text-white overflow-x-hidden">
        {/* ✅ Google AdSense */}
        <Script
          id="adsense"
          async
          strategy="lazyOnload"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2273778994224812"
          crossOrigin="anonymous"
        />

        {/* ✅ Structured Data */}
        <Script
          id="json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* ✅ IMPORTANT: Wrap everything with Providers so Wagmi works in Navbar */}
        <Providers>
          {/* ✅ Track page views (client) */}
          <Suspense fallback={null}>
            <TrackView />
          </Suspense>

          <div className="min-h-screen flex flex-col">
            <TopBar />

            <Suspense fallback={<div className="h-14" />}>
              <Navbar />
            </Suspense>

            <main className="flex-1 w-full">{children}</main>

            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <SupportCTA />
            </div>

            <FooterSupport />
          </div>
        </Providers>

        <Analytics />
      </body>
    </html>
  );
}
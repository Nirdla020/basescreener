import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import Navbar from "./components/Navbar";
import FooterSupport from "./components/FooterSupport";
import SupportCTA from "./components/SupportCTA";
import TopBar from "./components/TopBar";

export const metadata: Metadata = {
  title: "BaseScreener",
  description: "Base token analytics for aggressive traders",
  other: {
    "google-adsense-account": "ca-pub-2273778994224812",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2273778994224812"
          crossOrigin="anonymous"
        ></script>
      </head>

      <body>
        {/* ✅ Premium top strip */}
        <TopBar />

        <Suspense fallback={<div className="h-14" />}>
          <Navbar />
        </Suspense>

        {/* ✅ Consistent background + spacing */}
        <main className="min-h-screen bg-[#020617] text-white">
          {children}

          {/* ✅ Monetization CTA */}
          <SupportCTA />
        </main>

        {/* ✅ Donations footer */}
        <FooterSupport />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import Navbar from "./components/Navbar";

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
        <Suspense fallback={<div className="h-14" />}>
          <Navbar />
        </Suspense>

        {children}
      </body>
    </html>
  );
}

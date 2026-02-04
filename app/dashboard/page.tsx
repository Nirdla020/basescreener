import type { Metadata } from "next";
import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

/* ✅ SEO for Dashboard Page */
export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Explore trending Base tokens, top gainers, and newly listed coins with real-time price, volume, and liquidity on BaseScreener.",
  alternates: {
    canonical: "https://basescreener.fun/dashboard",
  },
};

function DashboardFallback() {
  return (
    <main className="min-h-screen text-white">
      <div className="page-container py-10">
        {/* ✅ Publisher content during fallback (AdSense-safe) */}
        <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <h1 className="text-2xl font-extrabold text-blue-400">Base Token Dashboard</h1>

          <p className="mt-2 text-sm text-white/70 leading-relaxed">
            BaseScreener dashboard shows trending tokens, newly listed pairs, and top liquidity pools on Base using
            DexScreener data. You can filter by symbol/name/address, compare 24h volume and transactions, and open a
            token page to see pools in detail.
          </p>

          <p className="mt-2 text-xs text-white/50">
            Disclaimer: This is informational only and not financial advice.
          </p>

          {/* ✅ Loading skeleton */}
          <div className="mt-6 space-y-3">
            <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardClient />
    </Suspense>
  );
}

import { Suspense } from "react";
import TokenClient from "./TokenClient";

function TokenFallback({ address }: { address: string }) {
  return (
    <main className="min-h-screen text-white">
      <div className="page-container py-10">
        <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <h1 className="text-2xl font-extrabold text-blue-400">Token Lookup (Base)</h1>

          <p className="mt-2 text-sm text-white/70 leading-relaxed">
            This page shows liquidity pools and market activity for a Base token using DexScreener data.
            Paste a token contract address to view price, liquidity, 24h volume, and transactions per pool.
          </p>

          {address ? (
            <p className="mt-3 text-xs text-white/60 break-all">
              Loading pools for: <span className="font-mono text-white/80">{address}</span>
            </p>
          ) : (
            <p className="mt-3 text-xs text-white/60">Loading token page…</p>
          )}

          <p className="mt-2 text-xs text-white/50">
            Disclaimer: This is informational only and not financial advice.
          </p>

          <div className="mt-6 space-y-3">
            <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-40 rounded-2xl bg-white/5 animate-pulse" />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function TokenPage({ params }: { params: { address: string } }) {
  const address = decodeURIComponent(params?.address || "").trim().toLowerCase();

  return (
    <Suspense fallback={<TokenFallback address={address} />}>
      <TokenClient addressFromRoute={address} />
    </Suspense>
  );
}

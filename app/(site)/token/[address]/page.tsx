import { Suspense } from "react";
import TokenClient from "../TokenClient"; // ✅ correct path

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Extract first 0x..40hex from ANY input */
function extractAddress(input: string) {
  const cleaned = safeDecode(String(input || ""))
    .trim()
    .replace(/\s+/g, "")
    .replace(/\/+$/, "");

  const m = cleaned.match(/0x[a-fA-F0-9]{40}/);
  return m ? m[0].toLowerCase() : "";
}

function TokenFallback({ address }: { address: string }) {
  return (
    <main className="min-h-screen text-white">
      <div className="page-container py-10">
        <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <h1 className="text-2xl font-extrabold text-blue-400">Token Lookup (Base)</h1>

          <p className="mt-2 text-sm text-white/70 leading-relaxed">
            Loading token pools from DexScreener…
          </p>

          {address ? (
            <p className="mt-3 text-xs text-white/60 break-all">
              Loading pools for: <span className="font-mono text-white/80">{address}</span>
            </p>
          ) : (
            <p className="mt-3 text-xs text-white/60">Loading token page…</p>
          )}

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
  const address = extractAddress(params?.address || "");

  return (
    <Suspense fallback={<TokenFallback address={address} />}>
      <TokenClient addressFromRoute={address} />
    </Suspense>
  );
}

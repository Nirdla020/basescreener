import { Suspense } from "react";
import TokenClient from "./TokenClient";

/* ---------------- Utils ---------------- */

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function extractAddress(input: string) {
  const cleaned = safeDecode(String(input || ""))
    .trim()
    .replace(/\s+/g, "")
    .replace(/\/+$/, "");

  const m = cleaned.match(/0x[a-fA-F0-9]{40}/);
  return m ? m[0].toLowerCase() : "";
}

/* ---------------- Loading UI ---------------- */

function TokenFallback({ address }: { address: string }) {
  return (
    <main className="min-h-screen text-white">
      <div className="page-container py-10">
        <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <h1 className="text-2xl font-extrabold text-blue-400">
            Loading Token…
          </h1>

          <p className="mt-2 text-sm text-white/70">
            Fetching pools and market data from DexScreener.
          </p>

          {address && (
            <p className="mt-3 text-xs text-white/50 break-all">
              {address}
            </p>
          )}

          <div className="mt-6 space-y-3">
            <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-40 rounded-xl bg-white/5 animate-pulse" />
          </div>
        </section>
      </div>
    </main>
  );
}

/* ---------------- SEO ---------------- */

export const metadata = {
  title: "Base Token Analytics | BaseScreener",
  description:
    "Live Base token prices, liquidity, volume, pools, and trading activity.",
};

/* ---------------- Page ---------------- */

export default function TokenPage({
  params,
}: {
  params: { address: string };
}) {
  const address = extractAddress(params?.address || "");

  /* ❌ Invalid address */
  if (!address) {
    return (
      <main className="min-h-screen text-white">
        <div className="page-container py-10">
          <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h1 className="text-2xl font-extrabold text-red-400">
              Invalid Token Address
            </h1>

            <p className="mt-2 text-sm text-white/70">
              Please use a valid Base token contract address.
            </p>

            <p className="mt-2 text-xs text-white/50">
              Example: /token/0x1234...
            </p>
          </section>
        </div>
      </main>
    );
  }

  /* ✅ Valid address */
  return (
    <Suspense fallback={<TokenFallback address={address} />}>
      <TokenClient addressFromRoute={address} />
    </Suspense>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";

type DexPair = {
  chainId?: string;
  url?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
};

function pickBestBasePair(pairs: DexPair[]) {
  const basePairs = pairs.filter(
    (p) => String(p?.chainId || "") === "base" && typeof p?.url === "string"
  );

  basePairs.sort((a, b) => {
    const la = a?.liquidity?.usd ?? 0;
    const lb = b?.liquidity?.usd ?? 0;

    if (lb !== la) return lb - la;
    return (b?.volume?.h24 ?? 0) - (a?.volume?.h24 ?? 0);
  });

  return basePairs[0];
}

export default function DexTokenView({ address }: { address: string }) {
  const [pairUrl, setPairUrl] = useState("");

  const fallbackUrl = useMemo(
    () => `https://dexscreener.com/base/${address}`,
    [address]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${address}`,
          { cache: "no-store" }
        );

        const json = await res.json().catch(() => null);

        const pairs: DexPair[] = Array.isArray(json?.pairs)
          ? json.pairs
          : [];

        const best = pickBestBasePair(pairs);

        if (!cancelled) {
          setPairUrl(best?.url || "");
        }
      } catch {
        if (!cancelled) setPairUrl("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  function openDex() {
    window.open(pairUrl || fallbackUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen text-white">
      <div className="page-container py-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="min-w-0">
            <div className="text-xs text-white/60">Token</div>
            <div className="font-semibold truncate">{address}</div>
          </div>

          <button
            onClick={openDex}
            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm"
          >
            Open on Dexscreener
          </button>
        </div>

        {/* Chart */}
        {!pairUrl ? (
          <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-white/60">
            Loading chart…
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
            <iframe
              src={pairUrl}
              className="w-full h-[82vh]"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        )}
      </div>
    </div>
  );
}
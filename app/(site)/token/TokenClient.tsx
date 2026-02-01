"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type DexPair = {
  chainId: string;
  dexId?: string;
  pairAddress: string;
  url: string;

  baseToken: { address: string; symbol: string; name: string };
  quoteToken: { address: string; symbol: string; name: string };

  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
};

function isAddress(a: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(a.trim());
}

function fmtUsd(n?: number) {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n).toLocaleString()}`;
  return `$${n.toFixed(2)}`;
}

function fmtPriceUsd(s?: string) {
  if (!s) return "—";
  const n = Number(s);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 8 })}`;
}

function readWatchlist(): string[] {
  try {
    const raw = localStorage.getItem("watchlist_base") || "[]";
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
}

function writeWatchlist(list: string[]) {
  localStorage.setItem("watchlist_base", JSON.stringify(list));
}

export default function TokenClient() {
  const sp = useSearchParams();

  const [address, setAddress] = useState("");
  const [pairs, setPairs] = useState<DexPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [watchlistCount, setWatchlistCount] = useState(0);

  const normalized = useMemo(() => address.trim(), [address]);

  // ✅ Pull ?q= from URL (from Navbar) and auto-run search once
  useEffect(() => {
    const q = (sp.get("q") || "").trim();
    if (!q) return;

    setAddress(q);

    // auto-search only if it's an address
    if (isAddress(q)) {
      // small delay so state is updated before fetch
      setTimeout(() => {
        searchBaseToken(q);
      }, 0);
    } else {
      setError("Search on Token page needs a 0x address. Paste a token address.");
      setPairs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // ✅ watchlist count
  useEffect(() => {
    setWatchlistCount(readWatchlist().length);
  }, []);

  async function searchBaseToken(forced?: string) {
    const a = (forced ?? normalized).trim();

    if (!isAddress(a)) {
      setError("Invalid address. Must be 0x + 40 hex characters.");
      setPairs([]);
      return;
    }

    setLoading(true);
    setError("");
    setPairs([]);

    try {
      const res = await fetch(`https://api.dexscreener.com/token-pairs/v1/base/${a}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${text}`);
      }

      const data = (await res.json()) as DexPair[];
      setPairs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch DexScreener data");
    } finally {
      setLoading(false);
    }
  }

  function addToWatchlist() {
    const a = normalized.toLowerCase();
    if (!isAddress(a)) {
      setError("Invalid address. Cannot add.");
      return;
    }

    const current = readWatchlist().map((x) => x.toLowerCase());
    if (current.includes(a)) {
      setError("Already in watchlist.");
      return;
    }

    if (current.length >= 30) {
      setError("Max 30 in watchlist.");
      return;
    }

    const next = [...current, a];
    writeWatchlist(next);
    setWatchlistCount(next.length);
    setError("");
    alert("Added to watchlist ✅ (Go to /dashboard → Saved tab)");
  }

  const topPairs = useMemo(() => {
    return [...pairs].sort((a, b) => {
      const la = a.liquidity?.usd ?? 0;
      const lb = b.liquidity?.usd ?? 0;
      if (lb !== la) return lb - la;
      const va = a.volume?.h24 ?? 0;
      const vb = b.volume?.h24 ?? 0;
      return vb - va;
    });
  }, [pairs]);

  return (
    <main className="min-h-screen bg-[#020617] text-white px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-extrabold text-blue-400 mb-2">Token Lookup (Base)</h1>
        <p className="text-blue-200 mb-6">
          Paste Base token address. Add it to your watchlist. (Saved locally)
        </p>

        {/* ✅ More visible search bar */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 rounded-2xl border border-blue-500/40 bg-black/40 px-4 py-3 focus-within:border-blue-400">
                <span className="text-white/70">🔎</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") searchBaseToken();
                  }}
                  placeholder="Paste Base token address (0x...)"
                  className="w-full bg-transparent outline-none text-white placeholder:text-white/55"
                />
              </div>
              <div className="mt-2 text-xs text-white/50">
                Tip: Token page accepts only a <span className="font-mono">0x...</span> address.
              </div>
            </div>

            <button
              onClick={() => searchBaseToken()}
              className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition"
            >
              Search
            </button>

            <button
              onClick={addToWatchlist}
              className="px-6 py-3 bg-white text-[#020617] rounded-xl font-bold hover:opacity-90 transition"
            >
              Add to Watchlist ({watchlistCount})
            </button>
          </div>

          {loading && <div className="mt-4 text-blue-100">Loading pools…</div>}
          {error && <div className="mt-4 text-red-300 break-words">{error}</div>}
        </div>

        {/* RESULTS */}
        {topPairs.length > 0 && (
          <div className="mt-6 space-y-4">
            {topPairs.slice(0, 10).map((p) => (
              <a
                key={p.pairAddress}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
                title="Open on DexScreener"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xl font-extrabold">
                      {p.baseToken.symbol}/{p.quoteToken.symbol}
                      <span className="text-white/50 text-sm font-normal">
                        {" "}
                        • {p.dexId || "dex"} • Base
                      </span>
                    </div>

                    <div className="text-white/60 text-sm mt-1 break-all">
                      Pair: <span className="font-mono">{p.pairAddress}</span>
                    </div>

                    <div className="text-white/70 text-sm mt-1">
                      PriceUSD: <span className="font-bold">{fmtPriceUsd(p.priceUsd)}</span>
                    </div>
                  </div>

                  <div className="text-sm text-white/70 md:text-right">
                    <div>Liquidity: <span className="font-bold">{fmtUsd(p.liquidity?.usd)}</span></div>
                    <div>Vol 24h: <span className="font-bold">{fmtUsd(p.volume?.h24)}</span></div>
                    <div>
                      Buys/Sells:{" "}
                      <span className="font-bold">{p.txns?.h24?.buys ?? 0}</span>/
                      <span className="font-bold">{p.txns?.h24?.sells ?? 0}</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

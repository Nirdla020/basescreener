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

export default function TokenPage() {
  const sp = useSearchParams();

  const [address, setAddress] = useState("");
  const [pairs, setPairs] = useState<DexPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalized = useMemo(() => address.trim(), [address]);

  // keep count reactive
  const watchlistCount = useMemo(() => {
    if (typeof window === "undefined") return 0;
    return readWatchlist().length;
  }, [pairs, address]);

  async function searchBaseToken(addr?: string) {
    const a = (addr ?? normalized).trim();

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
      setPairs(data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch DexScreener data");
    } finally {
      setLoading(false);
    }
  }

  // ✅ NEW: read ?q= from Navbar and auto-search
  useEffect(() => {
    const q = (sp.get("q") || "").trim();
    if (!q) return;

    // If q is an address, auto-search immediately
    setAddress(q);
    if (isAddress(q)) {
      searchBaseToken(q);
    } else {
      setError("Paste a token contract address (0x...) to search on Base.");
      setPairs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

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
      setError("Max 30 in watchlist. Remove some first.");
      return;
    }

    const next = [...current, a];
    writeWatchlist(next);
    setError("");
    alert("Added to watchlist ✅ (Go to Dashboard → Saved tab)");
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
    <main className="min-h-screen bg-[#020617] text-white px-4 sm:px-8 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-400 mb-2">
          Token Lookup (Base)
        </h1>
        <p className="text-blue-200/90 mb-6">
          Paste a Base token contract address. Add it to your watchlist (saved locally).
        </p>

        {/* Input Card (more visible) */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 max-w-4xl">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") searchBaseToken();
              }}
              placeholder="Paste Base token address (0x...)"
              className="flex-1 px-4 py-3 rounded-xl bg-black/40 border border-white/15 outline-none focus:border-blue-400"
            />

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

          <div className="mt-3 text-xs text-white/55">
            Tip: You can also use the Navbar search. It will open <span className="font-mono">/token?q=...</span>.
          </div>
        </div>

        {loading && <div className="mt-4 text-blue-100">Loading pools…</div>}
        {error && <div className="mt-4 text-red-300 break-words">{error}</div>}

        {/* Results */}
        {topPairs.length > 0 && (
          <div className="mt-8 space-y-4">
            {topPairs.slice(0, 10).map((p) => {
              const buys = p.txns?.h24?.buys ?? 0;
              const sells = p.txns?.h24?.sells ?? 0;

              return (
                <a
                  key={p.pairAddress}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="
                    block rounded-2xl border border-white/10 bg-white/5 p-5
                    hover:bg-white/10 transition
                    shadow-[0_0_0_1px_rgba(255,255,255,0.03)]
                    hover:shadow-[0_0_0_1px_rgba(59,130,246,0.25)]
                  "
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    <div className="min-w-0">
                      <div className="text-lg font-extrabold">
                        {p.baseToken.symbol}/{p.quoteToken.symbol}
                        <span className="text-white/50 text-sm font-normal">
                          {" "}
                          • {p.dexId || "dex"} • Base
                        </span>
                      </div>

                      <div className="text-white/60 text-sm mt-1 break-all">
                        Pair: <span className="font-mono">{p.pairAddress}</span>
                      </div>

                      <div className="text-white/60 text-sm mt-2">
                        PriceUSD: <span className="font-bold text-white">{fmtPriceUsd(p.priceUsd)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="rounded-xl bg-black/25 border border-white/10 p-3">
                        <div className="text-[11px] text-white/55">LIQ</div>
                        <div className="font-extrabold">{fmtUsd(p.liquidity?.usd)}</div>
                      </div>
                      <div className="rounded-xl bg-black/25 border border-white/10 p-3">
                        <div className="text-[11px] text-white/55">VOL 24H</div>
                        <div className="font-extrabold">{fmtUsd(p.volume?.h24)}</div>
                      </div>
                      <div className="rounded-xl bg-black/25 border border-white/10 p-3">
                        <div className="text-[11px] text-white/55">BUYS</div>
                        <div className="font-extrabold">{buys.toLocaleString()}</div>
                      </div>
                      <div className="rounded-xl bg-black/25 border border-white/10 p-3">
                        <div className="text-[11px] text-white/55">SELLS</div>
                        <div className="font-extrabold">{sells.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-white/50">Open on DexScreener →</div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

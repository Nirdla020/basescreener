"use client";

import { useMemo, useState } from "react";

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
  return /^0x[a-fA-F0-9]{40}$/.test(a);
}

function fmtUsd(n?: number) {
  if (n === undefined || n === null) return "—";
  return `$${Math.round(n).toLocaleString()}`;
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
  const [address, setAddress] = useState("");
  const [pairs, setPairs] = useState<DexPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalized = useMemo(() => address.trim(), [address]);

  const watchlistCount = useMemo(() => readWatchlist().length, [pairs, address]);

  async function searchBaseToken() {
    const a = normalized;

    if (!isAddress(a)) {
      setError("Invalid address. Dapat 0x + 40 hex characters.");
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

  function addToWatchlist() {
    const a = normalized.toLowerCase();
    if (!isAddress(a)) {
      setError("Invalid address. Hindi ma-add.");
      return;
    }

    const current = readWatchlist().map((x) => x.toLowerCase());
    if (current.includes(a)) {
      setError("Nasa watchlist na yan.");
      return;
    }

    if (current.length >= 30) {
      setError("Max 30 sa watchlist. Bawasan muna sa Dashboard textarea.");
      return;
    }

    const next = [...current, a];
    writeWatchlist(next);
    setError("");
    alert("Added to watchlist ✅ (Go to /dashboard and click Load Watchlist)");
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
    <main className="min-h-screen bg-[#020617] text-white p-8">
      <h1 className="text-4xl font-extrabold text-blue-400 mb-2">Token Lookup (Base)</h1>
      <p className="text-blue-200 mb-6">
        Paste Base token address. Add it to your watchlist. (Saved locally)
      </p>

      <div className="flex flex-col md:flex-row gap-3 max-w-3xl mb-4">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Paste Base token address (0x...)"
          className="flex-1 px-4 py-3 rounded-xl bg-black/40 border border-blue-500/30 outline-none focus:border-blue-400"
        />

        <button
          onClick={searchBaseToken}
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

      {loading && <div className="text-blue-100">Loading pools…</div>}
      {error && <div className="text-red-300 break-words">{error}</div>}

      {topPairs.length > 0 && (
        <div className="mt-6 space-y-4 max-w-5xl">
          {topPairs.slice(0, 10).map((p) => (
            <a
              key={p.pairAddress}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="block bg-[#0A1AFF] p-6 rounded-2xl shadow-lg hover:scale-[1.01] transition-all"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-xl font-extrabold">
                    {p.baseToken.symbol}/{p.quoteToken.symbol}
                    <span className="text-blue-100 text-sm font-normal"> • {p.dexId || "dex"} • Base</span>
                  </div>

                  <div className="text-blue-100 text-sm mt-1 break-all">Pair: {p.pairAddress}</div>
                  <div className="text-blue-100 text-sm mt-1">
                    PriceUSD: <span className="font-bold">{fmtPriceUsd(p.priceUsd)}</span>
                  </div>
                </div>

                <div className="text-right text-sm text-blue-100">
                  <div>Liquidity: {fmtUsd(p.liquidity?.usd)}</div>
                  <div>Vol 24h: {fmtUsd(p.volume?.h24)}</div>
                  <div>
                    Buys/Sells: {p.txns?.h24?.buys ?? 0}/{p.txns?.h24?.sells ?? 0}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}

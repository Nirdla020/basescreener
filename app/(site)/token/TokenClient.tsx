"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdUnit from "../../components/AdUnit"; // ✅ FIXED PATH (from app/(site)/token -> app/components)

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
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
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

export default function TokenClient({ addressFromRoute }: { addressFromRoute?: string }) {
  const sp = useSearchParams();
  const lastAutoRef = useRef<string>(""); // ✅ prevent repeated auto-search

  const [address, setAddress] = useState("");
  const [pairs, setPairs] = useState<DexPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [watchCount, setWatchCount] = useState(0);

  const normalized = useMemo(() => address.trim(), [address]);

  // ✅ Put your REAL AdSense slot IDs here (from AdSense)
  const AD_SLOT_TOP = "PUT_SLOT_ID_HERE";
  const AD_SLOT_BOTTOM = "PUT_SLOT_ID_HERE";

  // ✅ AdSense-safe gating: show ads ONLY when there are real results
  const hasContent = pairs.length > 0;
  const canShowAds = !loading && error === "" && hasContent;

  useEffect(() => {
    setWatchCount(readWatchlist().length);
  }, []);

  // ✅ auto-fill from route param OR ?q=
  useEffect(() => {
    const fromRoute = (addressFromRoute || "").trim();
    const fromQuery = (sp.get("q") || "").trim();
    const qRaw = fromRoute || fromQuery;
    if (!qRaw) return;

    const q = qRaw.toLowerCase().trim();
    setAddress(q);

    if (!isAddress(q)) {
      setError("Token page accepts only a 0x address.");
      setPairs([]);
      return;
    }

    // ✅ avoid repeating auto-search
    if (lastAutoRef.current === q) return;
    lastAutoRef.current = q;

    setTimeout(() => {
      searchToken(q);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressFromRoute, sp]);

  async function searchToken(forced?: string) {
    const a = (forced ?? normalized).trim().toLowerCase();

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
      const arr = Array.isArray(data) ? data : [];
      setPairs(arr);

      if (arr.length === 0) {
        setError("No pools found for this token on Base (DexScreener returned 0 pairs).");
      }
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
    setWatchCount(next.length);
    setError("");
    alert("Added to watchlist ✅ (Go to /dashboard → Saved tab)");
  }

  const sortedPairs = useMemo(() => {
    return [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  }, [pairs]);

  return (
    <div className="page-container py-10 text-white">
      <div className="text-white/60 text-sm mb-2">Token page loaded ✅</div>

      <h1 className="text-4xl font-extrabold text-blue-400 mb-2">Token Lookup (Base)</h1>
      <p className="text-blue-200 mb-6">Paste a Base token address. Add it to your watchlist (saved locally).</p>

      {/* ✅ Publisher content */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-sm text-white/70 leading-relaxed mb-4">
        <p>
          This page shows liquidity pools and market activity for a Base token using DexScreener data. Results include
          price, liquidity, 24h volume, and transaction counts per pool.
        </p>
        <p className="mt-2 text-white/50">Disclaimer: This is informational only and not financial advice.</p>
      </div>

      {/* ✅ Top Ad (ONLY when real results exist) */}
      {AD_SLOT_TOP && (
        <div className="mb-4">
          <AdUnit slot={AD_SLOT_TOP} enabled={canShowAds} className="glass ring-soft rounded-2xl p-3" />
        </div>
      )}

      {/* Search bar */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 rounded-2xl border border-blue-500/40 bg-black/40 px-4 py-3 focus-within:border-blue-400">
              <span className="text-white/70">🔎</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchToken();
                }}
                placeholder="Paste Base token address (0x...)"
                className="w-full bg-transparent outline-none text-white placeholder:text-white/55"
              />
            </div>
            <div className="mt-2 text-xs text-white/50">
              Tip: This page accepts only a <span className="font-mono">0x...</span> address.
            </div>
          </div>

          <button
            onClick={() => searchToken()}
            className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition"
          >
            Open Token
          </button>

          <button
            onClick={addToWatchlist}
            className="px-6 py-3 bg-white text-[#020617] rounded-xl font-bold hover:opacity-90 transition"
          >
            Add to Watchlist ({watchCount})
          </button>
        </div>

        {loading && <div className="mt-4 text-blue-100">Loading pools…</div>}
        {error && <div className="mt-4 text-red-300 break-words">{error}</div>}
      </div>

      {/* Results */}
      {sortedPairs.length > 0 && (
        <div className="mt-6 space-y-4">
          {sortedPairs.slice(0, 12).map((p) => {
            const txns = (p.txns?.h24?.buys ?? 0) + (p.txns?.h24?.sells ?? 0);

            return (
              <a
                key={p.pairAddress}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xl font-extrabold">
                      {p.baseToken.symbol}/{p.quoteToken.symbol}
                      <span className="text-white/50 text-sm font-normal"> • {p.dexId || "dex"} • Base</span>
                    </div>

                    <div className="text-white/60 text-sm mt-1 break-all">
                      Pair: <span className="font-mono">{p.pairAddress}</span>
                    </div>

                    <div className="text-white/70 text-sm mt-1">
                      PriceUSD: <span className="font-bold">{fmtPriceUsd(p.priceUsd)}</span>
                    </div>
                  </div>

                  <div className="text-sm text-white/70 md:text-right">
                    <div>
                      Liquidity: <span className="font-bold">{fmtUsd(p.liquidity?.usd)}</span>
                    </div>
                    <div>
                      Vol 24h: <span className="font-bold">{fmtUsd(p.volume?.h24)}</span>
                    </div>
                    <div>
                      Txns: <span className="font-bold">{txns.toLocaleString()}</span>
                    </div>
                    <div>
                      Buys/Sells: <span className="font-bold">{p.txns?.h24?.buys ?? 0}</span>/
                      <span className="font-bold">{p.txns?.h24?.sells ?? 0}</span>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* ✅ Bottom Ad (ONLY when real results exist) */}
      {AD_SLOT_BOTTOM && (
        <div className="mt-6">
          <AdUnit slot={AD_SLOT_BOTTOM} enabled={canShowAds} className="glass ring-soft rounded-2xl p-3" />
        </div>
      )}
    </div>
  );
}

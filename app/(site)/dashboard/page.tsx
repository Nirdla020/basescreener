"use client";

import { useEffect, useMemo, useState } from "react";

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

type SortKey = "liquidity" | "volume" | "buys";

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

export default function Dashboard() {
  const [input, setInput] = useState<string>("");

  const [pairs, setPairs] = useState<DexPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [sortKey, setSortKey] = useState<SortKey>("liquidity");

  // Load watchlist from localStorage on first mount
  useEffect(() => {
    const stored = readWatchlist();
    if (stored.length > 0) setInput(stored.join("\n"));
  }, []);

  // Parse addresses from textarea (comma / space / newline)
  const addresses = useMemo(() => {
    const raw = input
      .split(/[\s,]+/g)
      .map((x) => x.trim())
      .filter(Boolean);

    const seen = new Set<string>();
    const uniq: string[] = [];
    for (const a of raw) {
      const lower = a.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniq.push(a);
      }
    }
    return uniq;
  }, [input]);

  const watchSet = useMemo(() => new Set(addresses.map((a) => a.toLowerCase())), [addresses]);

  // Best pair per token
  const bestByToken = useMemo(() => {
    const map = new Map<string, DexPair>();

    for (const p of pairs) {
      const baseAddr = p.baseToken?.address?.toLowerCase();
      const quoteAddr = p.quoteToken?.address?.toLowerCase();

      const key =
        (baseAddr && watchSet.has(baseAddr) && baseAddr) ||
        (quoteAddr && watchSet.has(quoteAddr) && quoteAddr) ||
        null;

      if (!key) continue;

      const current = map.get(key);

      const liq = p.liquidity?.usd ?? 0;
      const vol = p.volume?.h24 ?? 0;
      const buys = p.txns?.h24?.buys ?? 0;

      if (!current) {
        map.set(key, p);
        continue;
      }

      const curLiq = current.liquidity?.usd ?? 0;
      const curVol = current.volume?.h24 ?? 0;
      const curBuys = current.txns?.h24?.buys ?? 0;

      // still pick strongest by liquidity then volume
      if (liq > curLiq || (liq === curLiq && vol > curVol) || (liq === curLiq && vol === curVol && buys > curBuys)) {
        map.set(key, p);
      }
    }

    return map;
  }, [pairs, watchSet]);

  // Cards (best pools) sorted by sortKey
  const sortedCards = useMemo(() => {
    const rows = addresses.map((addr) => {
      const key = addr.toLowerCase();
      const best = bestByToken.get(key);
      return { addr, best };
    });

    const score = (best?: DexPair) => {
      if (!best) return -1;
      if (sortKey === "liquidity") return best.liquidity?.usd ?? 0;
      if (sortKey === "volume") return best.volume?.h24 ?? 0;
      return best.txns?.h24?.buys ?? 0;
    };

    return rows.sort((a, b) => score(b.best) - score(a.best));
  }, [addresses, bestByToken, sortKey]);

  async function loadWatchlist() {
    setError("");

    if (addresses.length === 0) {
      setError("Walang address. Paste Base token addresses (0x...)");
      setPairs([]);
      return;
    }

    const invalid = addresses.filter((a) => !isAddress(a));
    if (invalid.length > 0) {
      setError(`Invalid address(es): ${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "..." : ""}`);
      setPairs([]);
      return;
    }

    if (addresses.length > 30) {
      setError("Max 30 addresses lang. Bawasan mo muna.");
      setPairs([]);
      return;
    }

    setLoading(true);
    setPairs([]);

    try {
      const joined = addresses.join(",");
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/base/${joined}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${txt}`);
      }

      const data = (await res.json()) as DexPair[];
      setPairs(data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch DexScreener data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white p-8">
      <h1 className="text-4xl font-extrabold text-blue-400 mb-2">Watchlist (Base)</h1>
      <p className="text-blue-200 mb-6">
        Paste up to 30 Base token addresses. We show best pool per token.
      </p>

      <div className="max-w-3xl">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste addresses (comma/newline)\n0x...\n0x..."
          className="w-full h-36 px-4 py-3 rounded-xl bg-black/40 border border-blue-500/30 outline-none focus:border-blue-400"
        />

        <div className="mt-3 flex flex-col md:flex-row items-start md:items-center gap-3">
          <button
            onClick={loadWatchlist}
            className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition"
          >
            Load Watchlist
          </button>

          <div className="text-sm text-blue-100">
            Addresses: <span className="font-bold">{addresses.length}</span> / 30
          </div>

          {/* Sorting buttons */}
          <div className="md:ml-auto flex gap-2">
            <button
              onClick={() => setSortKey("liquidity")}
              className={`px-4 py-2 rounded-xl border border-blue-500/30 ${
                sortKey === "liquidity" ? "bg-white text-[#020617] font-bold" : "bg-white/5 text-blue-100"
              }`}
            >
              Liquidity
            </button>
            <button
              onClick={() => setSortKey("volume")}
              className={`px-4 py-2 rounded-xl border border-blue-500/30 ${
                sortKey === "volume" ? "bg-white text-[#020617] font-bold" : "bg-white/5 text-blue-100"
              }`}
            >
              Volume
            </button>
            <button
              onClick={() => setSortKey("buys")}
              className={`px-4 py-2 rounded-xl border border-blue-500/30 ${
                sortKey === "buys" ? "bg-white text-[#020617] font-bold" : "bg-white/5 text-blue-100"
              }`}
            >
              Buys
            </button>
          </div>
        </div>

        {loading && <div className="mt-4 text-blue-100">Loading pools…</div>}
        {error && <div className="mt-4 text-red-300 break-words">Error: {error}</div>}
      </div>

      {!loading && !error && addresses.length > 0 && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedCards.map(({ addr, best }) => (
            <div key={addr} className="bg-[#0A1AFF] p-6 rounded-2xl shadow-lg hover:scale-[1.01] transition-all">
              <div className="text-xs text-blue-100 break-all">{addr}</div>

              {best ? (
                <>
                  <div className="mt-2 text-xl font-extrabold">
                    {best.baseToken.symbol}/{best.quoteToken.symbol}
                    <span className="text-blue-100 text-sm font-normal"> • {best.dexId || "dex"}</span>
                  </div>

                  <div className="mt-2 text-sm text-blue-100">
                    PriceUSD: <span className="font-bold">{fmtPriceUsd(best.priceUsd)}</span>
                  </div>

                  <div className="mt-1 text-sm text-blue-100">
                    Liquidity: <span className="font-bold">{fmtUsd(best.liquidity?.usd)}</span> • Vol 24h:{" "}
                    <span className="font-bold">{fmtUsd(best.volume?.h24)}</span>
                  </div>

                  <div className="mt-1 text-sm text-blue-100">
                    Buys/Sells 24h:{" "}
                    <span className="font-bold">
                      {best.txns?.h24?.buys ?? 0}/{best.txns?.h24?.sells ?? 0}
                    </span>
                  </div>

                  <a
                    href={best.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-4 px-4 py-2 bg-white text-[#0A1AFF] font-bold rounded-xl hover:opacity-90 transition"
                  >
                    Open on DexScreener
                  </a>
                </>
              ) : (
                <div className="mt-3 text-blue-100">No pool found for this token on Base.</div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

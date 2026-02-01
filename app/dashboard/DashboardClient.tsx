"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Highlights from "../components/Highlights";

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
  fdv?: number;

  // ✅ If dex returns it, we can show % columns like DexCheck
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };

  pairCreatedAt?: number;
  info?: { imageUrl?: string };
};

type Tab = "trending" | "new" | "top" | "saved";
type TF = "5m" | "1h" | "6h" | "24h";
type RankBy = "trending" | "volume" | "txns" | "liquidity" | "gainers";

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

function normalizeTs(ts?: number) {
  if (!ts || !Number.isFinite(ts)) return undefined;
  return ts < 1_000_000_000_000 ? ts * 1000 : ts;
}

function fmtAge(ts?: number) {
  const ms = normalizeTs(ts);
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 0) return "—";

  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h`;

  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function readSaved(): string[] {
  try {
    const raw = localStorage.getItem("watchlist_base") || "[]";
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
}

function trendingScore(p: DexPair) {
  const vol = p.volume?.h24 ?? 0;
  const liq = p.liquidity?.usd ?? 0;
  const buys = p.txns?.h24?.buys ?? 0;
  const sells = p.txns?.h24?.sells ?? 0;
  const txns = buys + sells;

  const lv = Math.log10(vol + 1);
  const ll = Math.log10(liq + 1);
  const lt = Math.log10(txns + 1);

  const lowLiqPenalty = liq < 2000 ? 1.5 : liq < 10000 ? 0.7 : 0;
  return lv * 2.2 + lt * 1.6 + ll * 1.0 - lowLiqPenalty;
}

function pctCell(v?: number) {
  if (typeof v !== "number") return <div className="text-white/35">—</div>;
  return (
    <div className={v >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
      {v >= 0 ? "+" : ""}
      {v.toFixed(2)}%
    </div>
  );
}

export default function DashboardClient() {
  const sp = useSearchParams();

  const [tab, setTab] = useState<Tab>("trending");
  const [tf, setTf] = useState<TF>("24h");

  const [rankBy, setRankBy] = useState<RankBy>("trending");

  const [auto, setAuto] = useState(true);
  const [autoSec, setAutoSec] = useState(12);

  const [query, setQuery] = useState("");
  const [tokenAddr, setTokenAddr] = useState("");

  const [rows, setRows] = useState<DexPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Filters panel
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minLiq, setMinLiq] = useState<number>(0);
  const [minVol, setMinVol] = useState<number>(0);
  const [minTxns, setMinTxns] = useState<number>(0);
  const [onlyWithIcon, setOnlyWithIcon] = useState(false);

  useEffect(() => {
    const qp = sp.get("q") || "";
    if (qp) setQuery(qp);
  }, [sp]);

  async function loadFromSearch() {
    const queries = ["base", "base usdc", "base weth", "base meme", "base ai", "base degen"];

    const results = await Promise.all(
      queries.map(async (q) => {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data?.pairs) ? (data.pairs as DexPair[]) : [];
      })
    );

    const pairs = results.flat().filter((p) => (p.chainId || "").toLowerCase() === "base");

    // Dedup pairAddress: keep best liq
    const map = new Map<string, DexPair>();
    for (const p of pairs) {
      const key = (p.pairAddress || "").toLowerCase();
      if (!key) continue;
      const cur = map.get(key);
      const liq = p.liquidity?.usd ?? 0;
      const curLiq = cur?.liquidity?.usd ?? -1;
      if (!cur || liq > curLiq) map.set(key, p);
    }

    setRows(Array.from(map.values()).slice(0, 200));
  }

  async function loadFromTokensEndpoint(addrs: string[]) {
    const joined = addrs.join(",");
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/base/${joined}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const data = (await res.json()) as DexPair[];
    setRows(data || []);
  }

  async function loadData() {
    setErr("");
    setLoading(true);

    try {
      const addr = tokenAddr.trim();

      if (addr) {
        if (!isAddress(addr)) throw new Error("Invalid address (0x...)");
        await loadFromTokensEndpoint([addr.toLowerCase()]);
        return;
      }

      if (tab === "saved") {
        const saved = readSaved().slice(0, 30).map((x) => x.toLowerCase());
        if (saved.length === 0) {
          setRows([]);
          setErr("No saved tokens yet. Add to watchlist (localStorage).");
          return;
        }
        await loadFromTokensEndpoint(saved);
        return;
      }

      await loadFromSearch();
    } catch (e: any) {
      setRows([]);
      setErr(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => loadData(), autoSec * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, autoSec, tab, tokenAddr]);

  // Text filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const s = r.baseToken?.symbol?.toLowerCase() || "";
      const n = r.baseToken?.name?.toLowerCase() || "";
      const a = r.baseToken?.address?.toLowerCase() || "";
      return s.includes(q) || n.includes(q) || a.includes(q);
    });
  }, [rows, query]);

  // Best pair per token (highest liq)
  const bestRows = useMemo(() => {
    const map = new Map<string, DexPair>();
    for (const r of filtered) {
      const key = r.baseToken.address.toLowerCase();
      const cur = map.get(key);
      const liq = r.liquidity?.usd ?? 0;
      const curLiq = cur?.liquidity?.usd ?? -1;
      if (!cur || liq > curLiq) map.set(key, r);
    }
    return Array.from(map.values());
  }, [filtered]);

  // Apply numeric filters
  const filteredByPanel = useMemo(() => {
    return bestRows.filter((r) => {
      const liq = r.liquidity?.usd ?? 0;
      const vol = r.volume?.h24 ?? 0;
      const txns = (r.txns?.h24?.buys ?? 0) + (r.txns?.h24?.sells ?? 0);

      if (minLiq > 0 && liq < minLiq) return false;
      if (minVol > 0 && vol < minVol) return false;
      if (minTxns > 0 && txns < minTxns) return false;
      if (onlyWithIcon && !r.info?.imageUrl) return false;

      return true;
    });
  }, [bestRows, minLiq, minVol, minTxns, onlyWithIcon]);

  // Rank/sort
  const rankedRows = useMemo(() => {
    const arr = [...filteredByPanel];

    const txns24 = (p: DexPair) => (p.txns?.h24?.buys ?? 0) + (p.txns?.h24?.sells ?? 0);
    const gain24 = (p: DexPair) => p.priceChange?.h24 ?? 0;

    arr.sort((a, b) => {
      if (rankBy === "trending") return trendingScore(b) - trendingScore(a);
      if (rankBy === "volume") return (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0);
      if (rankBy === "txns") return txns24(b) - txns24(a);
      if (rankBy === "liquidity") return (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0);
      if (rankBy === "gainers") return gain24(b) - gain24(a);
      return 0;
    });

    return arr.slice(0, 120);
  }, [filteredByPanel, rankBy]);

  const totals = useMemo(() => {
    let vol = 0;
    let txns = 0;
    for (const r of rankedRows) {
      vol += r.volume?.h24 ?? 0;
      txns += (r.txns?.h24?.buys ?? 0) + (r.txns?.h24?.sells ?? 0);
    }
    return { vol, txns };
  }, [rankedRows]);

  // Helpers
  function onGo() {
    loadData();
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 sm:p-8">
      {/* TOP STATS (DexCheck-like) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-xs text-white/60">24H VOLUME</div>
          <div className="mt-1 text-2xl font-extrabold">{fmtUsd(totals.vol)}</div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-xs text-white/60">24H TXNS</div>
          <div className="mt-1 text-2xl font-extrabold">
            {Math.round(totals.txns).toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-xs text-white/60">LATEST BLOCK</div>
          <div className="mt-1 text-2xl font-extrabold">—</div>
          <div className="text-xs text-white/40 mt-0.5">Not connected</div>
        </div>
      </div>

      {/* ✅ HIGHLIGHTS (hide when searching a specific token) */}
      {tokenAddr.trim() === "" && rankedRows.length >= 5 && (
        <Highlights
          tokens={rankedRows.map((r) => ({
            symbol: r.baseToken?.symbol,
            name: r.baseToken?.name,
            address: r.baseToken?.address,
            icon: r.info?.imageUrl,
            // "gainers" placeholder if no % change data is returned
            change:
              typeof r.priceChange?.h24 === "number"
                ? r.priceChange.h24
                : (r.txns?.h24?.buys ?? 0) - (r.txns?.h24?.sells ?? 0),
            volume: r.volume?.h24 ?? 0,
          }))}
        />
      )}

      {/* TOOLBAR (DexCheck-like) */}
      <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
          {/* Address Search */}
          <div className="flex flex-1 gap-2">
            <input
              value={tokenAddr}
              onChange={(e) => setTokenAddr(e.target.value)}
              placeholder="Paste token address (0x...)"
              className="flex-1 px-4 py-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-blue-400"
            />
            <button
              onClick={onGo}
              className="px-5 py-3 rounded-xl bg-blue-600 font-bold hover:bg-blue-500 transition"
            >
              GO
            </button>
            <button
              onClick={() => {
                setTokenAddr("");
                setQuery("");
                loadData();
              }}
              className="px-4 py-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition"
              title="Reset"
            >
              ↻
            </button>
          </div>

          {/* TF Buttons */}
          <div className="flex gap-2 flex-wrap items-center">
            {(["5m", "1h", "6h", "24h"] as TF[]).map((k) => (
              <button
                key={k}
                onClick={() => setTf(k)}
                className={`px-4 py-3 rounded-xl border border-white/10 text-sm ${
                  tf === k ? "bg-white text-[#020617] font-bold" : "bg-white/5 text-white/80 hover:bg-white/10"
                }`}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap items-center">
            {(
              [
                ["trending", "🔥 TRENDING"],
                ["new", "✨ NEW"],
                ["top", "📈 TOP"],
                ["saved", "🔖 SAVED"],
              ] as Array<[Tab, string]>
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-4 py-3 rounded-xl border border-white/10 text-sm ${
                  tab === k ? "bg-blue-600 font-bold" : "bg-white/5 text-white/80 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary row: Auto + Rank + Filter input + Filters button */}
        <div className="mt-3 flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-sm text-white/70">
              AUTO: <span className="font-bold text-white">{auto ? `${autoSec}s` : "OFF"}</span>
            </div>

            <button
              onClick={() => setAuto(!auto)}
              className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition text-sm"
            >
              Toggle Auto
            </button>

            <input
              type="number"
              value={autoSec}
              onChange={(e) => setAutoSec(Math.max(5, Number(e.target.value) || 12))}
              className="w-24 px-3 py-2 rounded-xl bg-black/40 border border-white/10 outline-none text-sm"
              min={5}
            />

            <select
              value={rankBy}
              onChange={(e) => setRankBy(e.target.value as RankBy)}
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 outline-none text-sm"
            >
              <option value="trending">Rank by: Trending</option>
              <option value="gainers">Rank by: Gainers (24h %)</option>
              <option value="volume">Rank by: Volume</option>
              <option value="txns">Rank by: Txns</option>
              <option value="liquidity">Rank by: Liquidity</option>
            </select>

            <button
              onClick={() => setFiltersOpen(true)}
              className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition text-sm"
            >
              ☰ Filters
            </button>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by symbol/name/address..."
            className="w-full lg:w-[420px] px-4 py-2 rounded-xl bg-black/40 border border-white/10 outline-none"
          />
        </div>
      </div>

      {/* TABLE (DexCheck-ish) */}
      <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 overflow-x-auto">
        <div className="min-w-[1280px]">
          <div className="grid grid-cols-14 gap-0 px-4 py-3 text-xs font-bold text-white/70 border-b border-white/10">
            <div>#</div>
            <div className="col-span-3">TOKEN</div>
            <div>PRICE</div>
            <div>AGE</div>
            <div>TXNS</div>
            <div>VOLUME</div>
            <div>LIQ</div>
            <div>5M</div>
            <div>1H</div>
            <div>6H</div>
            <div>24H</div>
            <div>MCAP/FDV</div>
          </div>

          {loading && <div className="px-4 py-6 text-white/70">Loading…</div>}
          {err && <div className="px-4 py-6 text-red-300">{err}</div>}

          {!loading &&
            !err &&
            rankedRows.map((r, i) => {
              const buys = r.txns?.h24?.buys ?? 0;
              const sells = r.txns?.h24?.sells ?? 0;
              const txns = buys + sells;
              const pc = r.priceChange || {};

              return (
                <a
                  key={r.baseToken.address}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="grid grid-cols-14 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition items-center"
                >
                  <div className="text-white/80 font-bold">{i + 1}</div>

                  <div className="col-span-3 flex items-center gap-3 min-w-0">
                    {/* icon with fallback */}
                    <div className="h-9 w-9 shrink-0 rounded-xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
                      {r.info?.imageUrl ? (
                        <img
                          src={r.info.imageUrl}
                          alt=""
                          className="h-9 w-9 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="font-extrabold text-white">
                          {(r.baseToken?.symbol || "?").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold truncate">{r.baseToken.symbol}</div>
                      <div className="text-xs text-white/50 truncate">{r.baseToken.name}</div>
                    </div>
                  </div>

                  <div className="font-bold">{fmtPriceUsd(r.priceUsd)}</div>
                  <div className="text-white/80 font-bold">{fmtAge(r.pairCreatedAt)}</div>

                  <div className="text-white/80">
                    <span className="font-bold">{txns.toLocaleString()}</span>
                    <span className="text-xs text-white/40"> ({buys}/{sells})</span>
                  </div>

                  <div className="font-bold">{fmtUsd(r.volume?.h24)}</div>
                  <div className="font-bold">{fmtUsd(r.liquidity?.usd)}</div>

                  {/* % columns */}
                  {pctCell(pc.m5)}
                  {pctCell(pc.h1)}
                  {pctCell(pc.h6)}
                  {pctCell(pc.h24)}

                  <div className="text-white/80">{fmtUsd(r.fdv)}</div>
                </a>
              );
            })}
        </div>
      </div>

      {/* FILTERS PANEL (slide over) */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[999]">
          <button
            className="absolute inset-0 bg-black/60"
            onClick={() => setFiltersOpen(false)}
            aria-label="Close filters"
          />

          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-[#0b1220] border-l border-white/10 p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="text-lg font-extrabold">Filters</div>
              <button
                onClick={() => setFiltersOpen(false)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs text-white/60 mb-1">Min Liquidity (USD)</div>
                <input
                  type="number"
                  value={minLiq}
                  onChange={(e) => setMinLiq(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <div className="text-xs text-white/60 mb-1">Min 24h Volume (USD)</div>
                <input
                  type="number"
                  value={minVol}
                  onChange={(e) => setMinVol(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <div className="text-xs text-white/60 mb-1">Min 24h Txns</div>
                <input
                  type="number"
                  value={minTxns}
                  onChange={(e) => setMinTxns(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 outline-none"
                  placeholder="0"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyWithIcon}
                  onChange={(e) => setOnlyWithIcon(e.target.checked)}
                />
                Only tokens with icon
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setMinLiq(0);
                    setMinVol(0);
                    setMinTxns(0);
                    setOnlyWithIcon(false);
                  }}
                  className="flex-1 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15"
                >
                  Reset
                </button>

                <button
                  onClick={() => setFiltersOpen(false)}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500"
                >
                  Apply
                </button>
              </div>

              <div className="text-xs text-white/40 pt-2">
                Note: % columns (5m/1h/6h/24h) show only if DexScreener returns{" "}
                <span className="text-white/60">priceChange</span>. Otherwise you’ll see “—”.
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

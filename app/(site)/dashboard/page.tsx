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
  fdv?: number;

  // ✅ added
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
};

type Tab = "trending" | "new" | "top" | "saved";
type TF = "5m" | "1h" | "6h" | "24h";

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

// ✅ added
function normalizeTs(ts?: number) {
  if (!ts || !Number.isFinite(ts)) return undefined;
  return ts < 1_000_000_000_000 ? ts * 1000 : ts; // seconds → ms
}

// ✅ added
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

// "DexScreener-like" trending score using public metrics only
function trendingScore(p: DexPair) {
  const vol = p.volume?.h24 ?? 0;
  const liq = p.liquidity?.usd ?? 0;
  const buys = p.txns?.h24?.buys ?? 0;
  const sells = p.txns?.h24?.sells ?? 0;
  const txns = buys + sells;

  // log smoothing
  const lv = Math.log10(vol + 1);
  const ll = Math.log10(liq + 1);
  const lt = Math.log10(txns + 1);

  // penalty for extremely low liquidity (spam protection)
  const lowLiqPenalty = liq < 2000 ? 1.5 : liq < 10000 ? 0.7 : 0;

  // weights tuned for a "trending" feel
  return lv * 2.2 + lt * 1.6 + ll * 1.0 - lowLiqPenalty;
}

export default function Dashboard() {
  const sp = useSearchParams();

  const [tab, setTab] = useState<Tab>("trending");
  const [tf, setTf] = useState<TF>("24h"); // UI only (placeholder)

  const [auto, setAuto] = useState(true);
  const [autoSec, setAutoSec] = useState(12);

  const [query, setQuery] = useState(""); // filter rows by symbol/name/address
  const [tokenAddr, setTokenAddr] = useState(""); // direct token address search

  const [rows, setRows] = useState<DexPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ✅ read ?q= from URL (navbar search)
  useEffect(() => {
    const qp = sp.get("q") || "";
    if (qp) setQuery(qp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // ---- Multi-query DexScreener Search (bigger pool) ----
  async function loadFromSearch() {
    const queries = ["base", "base usdc", "base weth", "base coin", "base meme", "base ai", "base degen"];

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

    // dedupe by pairAddress (keep best liquidity version)
    const map = new Map<string, DexPair>();
    for (const p of pairs) {
      const key = (p.pairAddress || "").toLowerCase();
      if (!key) continue;
      const cur = map.get(key);
      const liq = p.liquidity?.usd ?? 0;
      const curLiq = cur?.liquidity?.usd ?? -1;
      if (!cur || liq > curLiq) map.set(key, p);
    }

    const basePairs = Array.from(map.values());

    const sorted = [...basePairs].sort((a, b) => {
      const av = a.volume?.h24 ?? 0;
      const bv = b.volume?.h24 ?? 0;
      const al = a.liquidity?.usd ?? 0;
      const bl = b.liquidity?.usd ?? 0;

      if (tab === "trending") return trendingScore(b) - trendingScore(a);

      if (tab === "new") {
        // surface "new-ish": low liquidity first, then higher txns
        const atx = (a.txns?.h24?.buys ?? 0) + (a.txns?.h24?.sells ?? 0);
        const btx = (b.txns?.h24?.buys ?? 0) + (b.txns?.h24?.sells ?? 0);
        if (al !== bl) return al - bl;
        return btx - atx;
      }

      // top: volume first, then liquidity
      if (bv !== av) return bv - av;
      return bl - al;
    });

    setRows(sorted.slice(0, 100));
  }

  // ---- Tokens endpoint (Saved or direct address) ----
  async function loadFromTokensEndpoint(addrs: string[]) {
    const joined = addrs.join(",");
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/base/${joined}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const data = (await res.json()) as DexPair[];
    setRows(data || []);
  }

  async function loadData() {
    setErr("");
    setLoading(true);

    try {
      const addr = tokenAddr.trim();

      // direct token address
      if (addr) {
        if (!isAddress(addr)) throw new Error("Invalid address (0x...)");
        await loadFromTokensEndpoint([addr.toLowerCase()]);
        return;
      }

      // saved tab
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

  // best pool per token (remove duplicates by base token)
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

  const totals = useMemo(() => {
    let vol = 0;
    let txns = 0;
    for (const r of bestRows) {
      vol += r.volume?.h24 ?? 0;
      txns += (r.txns?.h24?.buys ?? 0) + (r.txns?.h24?.sells ?? 0);
    }
    return { vol, txns };
  }, [bestRows]);

  function onGo() {
    loadData();
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 sm:p-8">
      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-blue-600 p-6 shadow-lg">
          <div className="text-xs font-bold text-blue-100">24H VOL</div>
          <div className="mt-1 text-3xl font-extrabold">{fmtUsd(totals.vol)}</div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 shadow-lg">
          <div className="text-xs font-bold text-blue-200">24H TXNS</div>
          <div className="mt-1 text-3xl font-extrabold">{Math.round(totals.txns).toLocaleString()}</div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-blue-200">ALERTS</div>
            <div className="mt-1 text-3xl font-extrabold">0 Active</div>
          </div>
          <div className="text-2xl opacity-80">🔔</div>
        </div>
      </div>

      {/* CONTROL BAR */}
      <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          {/* Token input */}
          <div className="flex flex-1 gap-2">
            <input
              value={tokenAddr}
              onChange={(e) => setTokenAddr(e.target.value)}
              placeholder="ENTER TOKEN ADDRESS..."
              className="flex-1 px-4 py-3 rounded-xl bg-black/40 border border-blue-500/30 outline-none focus:border-blue-400"
            />
            <button onClick={onGo} className="px-5 py-3 rounded-xl bg-blue-600 font-bold hover:bg-blue-500 transition">
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

          {/* Timeframes (UI only for now) */}
          <div className="flex gap-2 items-center justify-start">
            {(["5m", "1h", "6h", "24h"] as TF[]).map((k) => (
              <button
                key={k}
                onClick={() => setTf(k)}
                className={`px-4 py-3 rounded-xl border border-white/10 ${
                  tf === k ? "bg-white text-[#020617] font-bold" : "bg-white/5 text-blue-100"
                }`}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 items-center justify-start">
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
                className={`px-4 py-3 rounded-xl border border-white/10 ${
                  tab === k ? "bg-blue-600 font-bold" : "bg-white/5 text-blue-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* second row */}
        <div className="mt-4 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm text-blue-100">
              AUTO: <span className="font-bold">{auto ? `${autoSec}s` : "OFF"}</span>
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
              className="w-24 px-3 py-2 rounded-xl bg-black/40 border border-white/10 outline-none"
              min={5}
            />
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by symbol/name/address..."
            className="w-full md:w-96 px-4 py-2 rounded-xl bg-black/40 border border-white/10 outline-none"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 overflow-x-auto">
        <div className="min-w-[1120px]">
          {/* ✅ header updated: grid-cols-11 + AGE */}
          <div className="grid grid-cols-11 gap-0 px-4 py-3 text-xs font-bold text-blue-200 border-b border-white/10">
            <div>#</div>
            <div className="col-span-2">ASSET</div>
            <div className="col-span-2">ADDRESS</div>
            <div>AGE</div>
            <div>PRICE</div>
            <div>24H TXNS</div>
            <div>VOL</div>
            <div>LIQ</div>
            <div>MCAP/FDV</div>
          </div>

          {loading && <div className="px-4 py-6 text-blue-100">Loading…</div>}
          {err && <div className="px-4 py-6 text-red-300">{err}</div>}

          {!loading &&
            !err &&
            bestRows.map((r, i) => {
              const buys = r.txns?.h24?.buys ?? 0;
              const sells = r.txns?.h24?.sells ?? 0;
              const txns = buys + sells;

              return (
                <a
                  key={r.baseToken.address}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="grid grid-cols-11 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition"
                >
                  <div className="text-blue-100">{i + 1}</div>

                  {/* ✅ asset cell updated: logo + name */}
                  <div className="col-span-2 flex items-center gap-3 min-w-0">
                    <img
                      src={r.info?.imageUrl || "/token-placeholder.png"}
                      alt=""
                      className="h-9 w-9 rounded-xl bg-white/10 object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <div className="font-bold">{r.baseToken.symbol}</div>
                      <div className="text-xs text-blue-200 truncate">{r.baseToken.name}</div>
                    </div>
                  </div>

                  <div className="col-span-2 text-blue-100 font-mono text-xs break-all">
                    {r.baseToken.address}
                  </div>

                  {/* ✅ AGE */}
                  <div className="text-blue-100 font-bold">{fmtAge(r.pairCreatedAt)}</div>

                  <div className="font-bold">{fmtPriceUsd(r.priceUsd)}</div>

                  <div className="text-blue-100">
                    <span className="font-bold">{txns.toLocaleString()}</span>
                    <span className="text-xs text-blue-200"> ({buys}/{sells})</span>
                  </div>

                  <div className="font-bold">{fmtUsd(r.volume?.h24)}</div>
                  <div className="font-bold">{fmtUsd(r.liquidity?.usd)}</div>
                  <div className="text-blue-100">{fmtUsd(r.fdv)}</div>
                </a>
              );
            })}
        </div>
      </div>
    </main>
  );
}

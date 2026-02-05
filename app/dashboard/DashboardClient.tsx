"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Highlights from "../components/Highlights";
import AdUnit from "../components/AdUnit";

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

  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };

  pairCreatedAt?: number;
  info?: { imageUrl?: string };
};

type DexPairWithSeen = DexPair & { __seenAt?: number };

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

/** ===== Watchlist (localStorage) ===== */
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

function writeSaved(list: string[]) {
  try {
    localStorage.setItem("watchlist_base", JSON.stringify(list));
  } catch {}
}

function isSaved(addr?: string) {
  if (!addr) return false;
  const a = addr.toLowerCase();
  return readSaved().some((x) => x.toLowerCase() === a);
}

function toggleSaved(addr?: string) {
  if (!addr) return false;
  const a = addr.toLowerCase();
  const cur = readSaved().map((x) => x.toLowerCase());
  const exists = cur.includes(a);

  const next = exists ? cur.filter((x) => x !== a) : [a, ...cur];
  writeSaved(next);
  return !exists;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/** ===== Trending score ===== */
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

/** ===== Sparkline helpers (DexScreener search doesn't provide candles, so we synthesize) ===== */
function toSparkFromChange(pc?: DexPair["priceChange"]): number[] {
  const base = 100;
  const clamp = (x: number) => Math.max(-50, Math.min(50, x));

  const m5 = pc?.m5 ?? 0;
  const h1 = pc?.h1 ?? 0;
  const h6 = pc?.h6 ?? 0;
  const h24 = pc?.h24 ?? 0;

  const pts = [
    base,
    base * (1 + clamp(m5) / 100),
    base * (1 + clamp(h1) / 100),
    base * (1 + clamp(h6) / 100),
    base * (1 + clamp(h24) / 100),
  ];

  const out: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    out.push(a, a * 0.85 + b * 0.15, a * 0.6 + b * 0.4, a * 0.35 + b * 0.65);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function Sparkline({ data }: { data?: number[] }) {
  const pts = (data || []).filter((x) => Number.isFinite(x));
  if (pts.length < 2) return <div className="h-8 w-28" />;

  const w = 120;
  const h = 28;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;

  const d = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="h-8 w-28 text-green-400">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx={w} cy={h - ((pts[pts.length - 1] - min) / range) * h} r="3" className="fill-current" />
    </svg>
  );
}

function SocialsCell({ r }: { r: DexPair }) {
  const info: any = (r as any).info;
  const x = info?.socials?.find?.((s: any) => (s.type || "").toLowerCase() === "twitter")?.url;
  const tg = info?.socials?.find?.((s: any) => (s.type || "").toLowerCase() === "telegram")?.url;
  const web = info?.websites?.[0]?.url;

  const links = [
    x ? { label: "X", href: x } : null,
    tg ? { label: "TG", href: tg } : null,
    web ? { label: "WEB", href: web } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  if (!links.length) return <span className="text-white/35">—</span>;

  return (
    <div className="flex items-center gap-2">
      {links.slice(0, 3).map((l) => (
        <a
          key={l.href}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10"
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}

export default function DashboardClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("trending");
  const [tf, setTf] = useState<TF>("24h");
  const [rankBy, setRankBy] = useState<RankBy>("trending");

  const [auto, setAuto] = useState(true);
  const [autoSec, setAutoSec] = useState(12);

  const [query, setQuery] = useState("");
  const [tokenAddr, setTokenAddr] = useState("");

  const [rows, setRows] = useState<DexPairWithSeen[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minLiq, setMinLiq] = useState<number>(0);
  const [minVol, setMinVol] = useState<number>(0);
  const [minTxns, setMinTxns] = useState<number>(0);
  const [onlyWithIcon, setOnlyWithIcon] = useState(false);

  const [watchTick, setWatchTick] = useState(0);
  const [toast, setToast] = useState<string>("");

  function showToast(msg: string) {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(""), 1100);
  }

  const savedCount = useMemo(() => readSaved().length, [watchTick]);

  const poolRef = useRef<Map<string, DexPairWithSeen>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  // ✅ Zorbit-style: ?q= can be address OR text filter
  useEffect(() => {
    const qp = (sp.get("q") || "").trim();
    if (!qp) return;

    if (isAddress(qp)) {
      setTokenAddr(qp);
      setQuery("");
    } else {
      setQuery(qp);
    }
  }, [sp]);

  useEffect(() => {
    setTokenAddr("");
  }, [tab]);

  async function loadFromSearch() {
    const TRENDING_QUERIES = [
      "base",
      "base usdc",
      "base weth",
      "base degen",
      "base meme",
      "base ai",
      "aerodrome base",
      "base microcap",
      "base token",
    ];

    const NEW_DISCOVERY_QUERIES = [
      "base fair launch",
      "base launch",
      "base new token",
      "base presale",
      "base pump",
      "base community",
      "base telegram",
      "base ca",
      "base coin",
      "base low cap",
    ];

    const rotate = Math.floor(Date.now() / 60_000) % NEW_DISCOVERY_QUERIES.length;
    const rotatedNew = [...NEW_DISCOVERY_QUERIES.slice(rotate), ...NEW_DISCOVERY_QUERIES.slice(0, rotate)].slice(0, 6);

    const queries = [...TRENDING_QUERIES, ...rotatedNew];

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const results = await Promise.all(
      queries.map(async (q) => {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data?.pairs) ? (data.pairs as DexPair[]) : [];
      })
    );

    const now = Date.now();
    const pairs = results.flat().filter((p) => (p.chainId || "").toLowerCase() === "base");

    for (const p of pairs) {
      const key = (p.pairAddress || "").toLowerCase();
      if (!key) continue;

      const cur = poolRef.current.get(key);
      const liq = p.liquidity?.usd ?? 0;
      const curLiq = cur?.liquidity?.usd ?? -1;

      if (!cur) poolRef.current.set(key, { ...p, __seenAt: now });
      else if (liq > curLiq) poolRef.current.set(key, { ...p, __seenAt: cur.__seenAt ?? now });
    }

    const all = Array.from(poolRef.current.values());
    all.sort((a, b) => (b.__seenAt ?? 0) - (a.__seenAt ?? 0));
    const capped = all.slice(0, 1200);

    poolRef.current = new Map(capped.map((p) => [p.pairAddress.toLowerCase(), p]));
    setRows(capped.slice(0, 400));
  }

  async function loadFromTokensEndpoint(addrs: string[]) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const joined = addrs.join(",");
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/base/${joined}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const data = (await res.json()) as DexPair[];
    setRows((data || []) as DexPairWithSeen[]);
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
          setErr("No saved tokens yet. Add to watchlist (saved locally).");
          return;
        }
        await loadFromTokensEndpoint(saved);
        return;
      }

      await loadFromSearch();
    } catch (e: any) {
      if (e?.name === "AbortError") return;
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

  useEffect(() => {
    if (tab === "saved") loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchTick]);

  const filtered = useMemo(() => {
    const q2 = query.trim().toLowerCase();
    if (!q2) return rows;

    return rows.filter((r) => {
      const s = r.baseToken?.symbol?.toLowerCase() || "";
      const n = r.baseToken?.name?.toLowerCase() || "";
      const a = r.baseToken?.address?.toLowerCase() || "";
      return s.includes(q2) || n.includes(q2) || a.includes(q2);
    });
  }, [rows, query]);

  const bestRows = useMemo(() => {
    if (tokenAddr.trim()) return filtered;

    const map = new Map<string, DexPairWithSeen>();
    for (const r of filtered) {
      const key = (r.baseToken?.address || "").toLowerCase();
      if (!key) continue;

      const cur = map.get(key);
      const liq = r.liquidity?.usd ?? 0;
      const curLiq = cur?.liquidity?.usd ?? -1;

      if (!cur || liq > curLiq) map.set(key, r);
    }
    return Array.from(map.values());
  }, [filtered, tokenAddr]);

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

  const rankedRows = useMemo(() => {
    const arr = [...filteredByPanel];

    const txns24 = (p: DexPair) => (p.txns?.h24?.buys ?? 0) + (p.txns?.h24?.sells ?? 0);
    const gain24 = (p: DexPair) => p.priceChange?.h24 ?? 0;
    const created = (p: DexPairWithSeen) => normalizeTs(p.pairCreatedAt);
    const seen = (p: DexPairWithSeen) => p.__seenAt ?? 0;

    arr.sort((a, b) => {
      if (tab === "new") {
        const cb = created(b);
        const ca = created(a);

        if (cb && ca) return cb - ca;
        if (cb && !ca) return -1;
        if (!cb && ca) return 1;
        return seen(b) - seen(a);
      }

      if (tab === "top") {
        const bl = b.liquidity?.usd ?? 0;
        const al = a.liquidity?.usd ?? 0;
        if (bl !== al) return bl - al;

        const bv = b.volume?.h24 ?? 0;
        const av = a.volume?.h24 ?? 0;
        return bv - av;
      }

      if (rankBy === "trending") return trendingScore(b) - trendingScore(a);
      if (rankBy === "volume") return (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0);
      if (rankBy === "txns") return txns24(b) - txns24(a);
      if (rankBy === "liquidity") return (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0);
      if (rankBy === "gainers") return gain24(b) - gain24(a);

      return 0;
    });

    return arr.slice(0, 120);
  }, [filteredByPanel, rankBy, tab]);

  const totals = useMemo(() => {
    let vol = 0;
    let txns = 0;
    for (const r of rankedRows) {
      vol += r.volume?.h24 ?? 0;
      txns += (r.txns?.h24?.buys ?? 0) + (r.txns?.h24?.sells ?? 0);
    }
    return { vol, txns };
  }, [rankedRows]);

  function onGo() {
    loadData();
  }

  const AD_SLOT_TOP = process.env.NEXT_PUBLIC_AD_SLOT_TOP || "";
  const AD_SLOT_BOTTOM = process.env.NEXT_PUBLIC_AD_SLOT_BOTTOM || "";

  const topSlotOk = /^\d+$/.test(AD_SLOT_TOP);
  const bottomSlotOk = /^\d+$/.test(AD_SLOT_BOTTOM);

  const hasContent = rankedRows.length > 0;
  const canShowAds = !filtersOpen && !loading && err === "" && hasContent;

  const isDevHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname.endsWith(".vercel.app"));

  const adsEnabled = canShowAds && !isDevHost;

  return (
    <main className="min-h-screen text-white py-6">
      {/* Toast */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] transition-all duration-300 ease-out
        ${toast ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95 pointer-events-none"}`}
      >
        <div className="rounded-2xl bg-black/80 border border-white/15 px-5 py-2.5 text-sm text-white shadow-xl backdrop-blur">
          {toast}
        </div>
      </div>

      {/* Top Ad */}
      <div className="page-container">
        {topSlotOk && <AdUnit slot={AD_SLOT_TOP} enabled={adsEnabled} className="glass ring-soft rounded-2xl p-3 mb-4" />}
      </div>

      {/* TOP STATS */}
      <div className="page-container grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass ring-soft rounded-2xl p-4">
          <div className="text-xs text-white/60">24H VOLUME</div>
          <div className="mt-1 text-2xl font-extrabold">{fmtUsd(totals.vol)}</div>
        </div>

        <div className="glass ring-soft rounded-2xl p-4">
          <div className="text-xs text-white/60">24H TXNS</div>
          <div className="mt-1 text-2xl font-extrabold">{Math.round(totals.txns).toLocaleString()}</div>
        </div>

        <div className="glass ring-soft rounded-2xl p-4">
          <div className="text-xs text-white/60">LATEST BLOCK</div>
          <div className="mt-1 text-2xl font-extrabold">—</div>
          <div className="text-xs text-white/40 mt-0.5">Not connected</div>
        </div>
      </div>

      {/* Publisher content */}
      <div className="page-container mt-4">
        <section className="card-soft rounded-2xl p-5 text-sm text-white/70 leading-relaxed">
          <h2 className="text-white font-semibold text-base mb-2">Base Token Dashboard</h2>
          <p>
            BaseScreener tracks real-time market activity for tokens on the Base network. Data shown here includes price,
            24h volume, liquidity, and transaction counts to help you discover trending and newly listed tokens.
          </p>
          <p className="mt-2">
            Use the tabs to switch between Trending, New, Top Liquidity, and your Saved watchlist. Filters let you narrow
            results by minimum liquidity, volume, transactions, and whether a token has an icon.
          </p>
          <p className="mt-2 text-white/50">Disclaimer: This is informational only and not financial advice.</p>
        </section>
      </div>

      {/* Highlights */}
      {tokenAddr.trim() === "" && rankedRows.length >= 5 && (
        <div className="page-container mt-4">
          <Highlights
            tokens={rankedRows.map((r) => ({
              symbol: r.baseToken?.symbol,
              name: r.baseToken?.name,
              address: r.baseToken?.address,
              icon: r.info?.imageUrl,
              change:
                typeof r.priceChange?.h24 === "number"
                  ? r.priceChange.h24
                  : (r.txns?.h24?.buys ?? 0) - (r.txns?.h24?.sells ?? 0),
              volume: r.volume?.h24 ?? 0,
            }))}
          />
        </div>
      )}

      {/* TOOLBAR */}
      <div className="page-container mt-4">
        <div className="glass ring-soft rounded-2xl p-4">
          <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
            {/* Address Search */}
            <div className="flex flex-1 gap-2 min-w-0">
              <input
                value={tokenAddr}
                onChange={(e) => setTokenAddr(e.target.value)}
                placeholder="Paste token address (0x...)"
                className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-blue-400"
              />
              <button
                onClick={onGo}
                className="px-5 py-3 rounded-xl bg-blue-600 font-bold hover:bg-blue-500 transition shrink-0"
              >
                GO
              </button>
              <button
                onClick={() => {
                  setTokenAddr("");
                  setQuery("");
                  loadData();
                }}
                className="px-4 py-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition shrink-0"
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
                  <div className="flex items-center gap-2">
                    <span>{label}</span>
                    {k === "saved" && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] border border-white/15 ${
                          tab === "saved" ? "bg-white text-[#020617]" : "bg-white/10 text-white/80"
                        }`}
                        title="Saved tokens count"
                      >
                        {savedCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Secondary row */}
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
                disabled={tab === "new" || tab === "top"}
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
              className="w-full lg:w-[420px] min-w-0 px-4 py-2 rounded-xl bg-black/40 border border-white/10 outline-none"
            />
          </div>
        </div>
      </div>

      {/* LIST (Mobile cards) + TABLE (Desktop) */}
      <div className="page-container mt-4">
        {/* MOBILE */}
        <div className="md:hidden space-y-3">
          {loading && <div className="glass ring-soft rounded-2xl p-4 text-white/70">Loading…</div>}
          {err && <div className="glass ring-soft rounded-2xl p-4 text-red-300">{err}</div>}

          {!loading &&
            !err &&
            rankedRows.map((r, i) => {
              const addr = (r.baseToken?.address || "").toLowerCase();
              const marketCap = r.fdv ?? undefined;
              const h24 = r.priceChange?.h24;
              const marketCapDelta =
                typeof h24 === "number" && Number.isFinite(marketCap || NaN) ? ((marketCap as number) * h24) / 100 : undefined;
              const spark = toSparkFromChange(r.priceChange);

              return (
                <div
                  key={`${addr}:${r.pairAddress}`}
                  onClick={() => router.push(`/token/${addr}`)}
                  className="cursor-pointer glass ring-soft rounded-2xl p-4 hover:bg-white/10 transition"
                >
                  {/* Row 1: token + market cap */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
                        {r.info?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.info.imageUrl} alt="" className="h-10 w-10 object-cover" loading="lazy" />
                        ) : (
                          <span className="font-extrabold text-white">
                            {(r.baseToken?.symbol || "?").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-extrabold text-white truncate">
                          #{i + 1} {r.baseToken?.symbol || "—"}
                        </div>
                        <div className="text-xs text-white/50 truncate">{r.baseToken?.name || "—"}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-white/50">Market Cap</div>
                      <div className={typeof h24 === "number" && h24 > 0 ? "text-green-400 font-extrabold" : "text-white font-extrabold"}>
                        {fmtUsd(marketCap)}
                      </div>

                      {typeof marketCapDelta === "number" && marketCapDelta > 0 ? (
                        <div className="text-green-400 text-xs font-bold">▲ {fmtUsd(marketCapDelta)}</div>
                      ) : (
                        <div className="text-white/30 text-xs">&nbsp;</div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: volume + age */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                      <div className="text-white/60">24h Vol</div>
                      <div className="font-bold text-white">{fmtUsd(r.volume?.h24)}</div>
                    </div>

                    <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                      <div className="text-white/60">Age</div>
                      <div className="font-bold text-white">{fmtAge(r.pairCreatedAt)}</div>
                    </div>
                  </div>

                  {/* Row 3: socials + sparkline */}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-white/60 mb-1">Socials</div>
                      <SocialsCell r={r} />
                    </div>

                    <div className="shrink-0">
                      <div className="text-xs text-white/60 mb-1 text-right">Past 24 hours</div>
                      <div className="flex justify-end">
                        <Sparkline data={spark} />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="text-[10px] text-white/35 break-all truncate">{addr}</div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!addr) return;
                          const ok = await copyText(addr);
                          showToast(ok ? "Copied! 📋" : "Copy failed");
                        }}
                        className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-xs hover:bg-white/15 transition"
                        title="Copy contract address"
                      >
                        📋
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nowSaved = toggleSaved(addr);
                          setWatchTick((x) => x + 1);
                          showToast(nowSaved ? "Saved ⭐" : "Removed ❌");
                        }}
                        className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-xs hover:bg-white/15 transition"
                        title="Save to watchlist"
                      >
                        {isSaved(addr) ? "⭐" : "☆"}
                      </button>

                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-xs hover:bg-white/15 transition"
                        title="Open on DexScreener"
                      >
                        ↗
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* DESKTOP */}
        <div className="hidden md:block glass ring-soft rounded-2xl overflow-x-auto">
          <div className="min-w-[1120px]">
            {/* Header: add Name before Market Cap (fix alignment) */}
            <div className="grid grid-cols-[1.3fr_.8fr_.8fr_.5fr_1fr_1.1fr] gap-4 px-4 py-3 text-xs font-bold text-white/60 border-b border-white/10">
              <div>Name</div>
              <div>Market Cap</div>
              <div>24h Vol</div>
              <div>Age</div>
              <div>Socials</div>
              <div className="justify-self-end">Past 24 hours</div>
            </div>

            {loading && <div className="px-4 py-6 text-white/70">Loading…</div>}
            {err && <div className="px-4 py-6 text-red-300">{err}</div>}

            {!loading &&
              !err &&
              rankedRows.map((r) => {
                const addr = (r.baseToken?.address || "").toLowerCase();
                const marketCap = r.fdv ?? undefined; // proxy
                const h24 = r.priceChange?.h24;
                const marketCapDelta =
                  typeof h24 === "number" && Number.isFinite(marketCap || NaN) ? ((marketCap as number) * h24) / 100 : undefined;
                const spark = toSparkFromChange(r.priceChange);

                return (
                  <div
                    key={`${addr}:${r.pairAddress}`}
                    onClick={() => router.push(`/token/${addr}`)}
                    className="cursor-pointer grid grid-cols-[1.3fr_.8fr_.8fr_.5fr_1fr_1.1fr] items-center gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition"
                  >
                    {/* NAME (icon + symbol + full name) */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 shrink-0 rounded-xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
                        {r.info?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.info.imageUrl} alt="" className="h-9 w-9 object-cover" loading="lazy" />
                        ) : (
                          <span className="font-extrabold text-white">{(r.baseToken?.symbol || "?")[0]}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-extrabold text-white truncate">{r.baseToken?.symbol || "—"}</div>
                        <div className="text-xs text-white/50 truncate">{r.baseToken?.name || "—"}</div>
                      </div>
                    </div>

                    {/* MARKET CAP (green only when 24h change is positive) */}
                    <div className="flex flex-col items-start">
                      <div className={typeof h24 === "number" && h24 > 0 ? "text-green-400 font-semibold" : "text-white font-semibold"}>
                        {fmtUsd(marketCap)}
                      </div>
                      {typeof marketCapDelta === "number" && marketCapDelta > 0 ? (
                        <div className="text-green-400 text-xs font-bold">▲ {fmtUsd(marketCapDelta)}</div>
                      ) : (
                        <div className="text-white/30 text-xs">&nbsp;</div>
                      )}
                    </div>

                    {/* 24h Volume */}
                    <div className="text-white font-semibold">{fmtUsd(r.volume?.h24)}</div>

                    {/* Age */}
                    <div className="text-white/70 font-semibold">{fmtAge(r.pairCreatedAt)}</div>

                    {/* Socials */}
                    <div>
                      <SocialsCell r={r} />
                    </div>

                    {/* Sparkline */}
                    <div className="justify-self-end">
                      <Sparkline data={spark} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Bottom Ad */}
      <div className="page-container mt-4">
        {bottomSlotOk && <AdUnit slot={AD_SLOT_BOTTOM} enabled={adsEnabled} className="glass ring-soft rounded-2xl p-3" />}
      </div>

      {/* FILTERS PANEL */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[999]">
          <button className="absolute inset-0 bg-black/60" onClick={() => setFiltersOpen(false)} aria-label="Close filters" />

          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-[#0b1220] border-l border-white/10 p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="text-lg font-extrabold">Filters</div>
              <button onClick={() => setFiltersOpen(false)} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15">
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
                <input type="checkbox" checked={onlyWithIcon} onChange={(e) => setOnlyWithIcon(e.target.checked)} />
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
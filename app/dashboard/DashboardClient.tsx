"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Highlights from "../components/Highlights"; // ✅ ADD

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

export default function DashboardClient() {
  const sp = useSearchParams();

  const [tab, setTab] = useState<Tab>("trending");
  const [tf, setTf] = useState<TF>("24h");

  const [auto, setAuto] = useState(true);
  const [autoSec, setAutoSec] = useState(12);

  const [query, setQuery] = useState("");
  const [tokenAddr, setTokenAddr] = useState("");

  const [rows, setRows] = useState<DexPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

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
      if (tab === "trending") return trendingScore(b) - trendingScore(a);
      return (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0);
    });

    setRows(sorted.slice(0, 120));
  }

  useEffect(() => {
    loadFromSearch();
  }, [tab]);

  const bestRows = useMemo(() => {
    const map = new Map<string, DexPair>();
    for (const r of rows) {
      const key = r.baseToken.address.toLowerCase();
      const cur = map.get(key);
      const liq = r.liquidity?.usd ?? 0;
      const curLiq = cur?.liquidity?.usd ?? -1;
      if (!cur || liq > curLiq) map.set(key, r);
    }
    return Array.from(map.values());
  }, [rows]);

  const totals = useMemo(() => {
    let vol = 0;
    let txns = 0;
    for (const r of bestRows) {
      vol += r.volume?.h24 ?? 0;
      txns += (r.txns?.h24?.buys ?? 0) + (r.txns?.h24?.sells ?? 0);
    }
    return { vol, txns };
  }, [bestRows]);

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 sm:p-8">
      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-blue-600 p-6">
          <div className="text-xs font-bold text-blue-100">24H VOL</div>
          <div className="mt-1 text-3xl font-extrabold">{fmtUsd(totals.vol)}</div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <div className="text-xs font-bold text-blue-200">24H TXNS</div>
          <div className="mt-1 text-3xl font-extrabold">{totals.txns}</div>
        </div>
      </div>

      {/* 🔥 HIGHLIGHTS */}
      <Highlights
        tokens={bestRows.map((r) => ({
          symbol: r.baseToken.symbol,
          name: r.baseToken.name,
          address: r.baseToken.address,
          change: (r.txns?.h24?.buys ?? 0) - (r.txns?.h24?.sells ?? 0),
          volume: r.volume?.h24 ?? 0,
        }))}
      />

      {/* TABLE (unchanged) */}
      <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 overflow-x-auto">
        <div className="min-w-[1120px]">
          {bestRows.map((r, i) => (
            <a
              key={r.baseToken.address}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="grid grid-cols-11 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition"
            >
              <div>{i + 1}</div>
              <div className="col-span-2 font-bold">{r.baseToken.symbol}</div>
              <div className="col-span-2 text-xs">{r.baseToken.address}</div>
              <div>{fmtAge(r.pairCreatedAt)}</div>
              <div>{fmtPriceUsd(r.priceUsd)}</div>
              <div>{fmtUsd(r.volume?.h24)}</div>
              <div>{fmtUsd(r.liquidity?.usd)}</div>
              <div>{fmtUsd(r.fdv)}</div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCoin, getCoinSwaps } from "@zoralabs/coins-sdk";
import { base } from "viem/chains";
import WatchButton from "@/app/components/WatchButton";

export const runtime = "nodejs";
export const revalidate = 20;

/* ---------------- Utils ---------------- */

function isAddress(a: string) {
  return /^0x[a-f0-9]{40}$/.test(a);
}

function shortAddr(a?: string) {
  if (!a) return "—";
  const s = a.toLowerCase();
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function toNum(v: any): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function fmtUsd(n?: number) {
  if (!Number.isFinite(n ?? NaN)) return "—";
  if (n! >= 1_000_000_000) return `$${(n! / 1e9).toFixed(2)}B`;
  if (n! >= 1_000_000) return `$${(n! / 1e6).toFixed(2)}M`;
  if (n! >= 1_000) return `$${Math.round(n!).toLocaleString()}`;
  return `$${n!.toFixed(2)}`;
}

function fmtDate(v: any) {
  if (!v) return "—";
  const n = toNum(v);

  if (n) {
    const ms = n < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }

  const d = new Date(String(v));
  if (!Number.isNaN(d.getTime())) return d.toLocaleString();

  return "—";
}

function pickImage(c: any) {
  const list = [
    c?.mediaContent?.previewImage?.url,
    c?.mediaContent?.image?.url,
    c?.image?.url,
    c?.imageUrl,
    c?.icon,
    c?.iconUrl,
    c?.metadata?.image,
  ];
  return list.find((x) => typeof x === "string" && x.startsWith("http")) || "";
}

function pct(v?: number) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function pctClass(v?: number) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "text-white/60";
  return v >= 0 ? "text-green-300" : "text-red-300";
}

/* ---------------- Swap helpers (FIX) ---------------- */

function pickSwapWallet(s: any): string {
  const candidates = [
    s?.sender,
    s?.trader,
    s?.walletAddress,
    s?.from,
    s?.fromAddress,
    s?.to,
    s?.toAddress,

    // nested
    s?.actor?.address,
    s?.user?.address,
    s?.wallet?.address,

    // tx shapes
    s?.transaction?.from,
    s?.transaction?.fromAddress,
    s?.tx?.from,
    s?.tx?.fromAddress,
  ];

  const first = candidates.find(
    (x) => typeof x === "string" && /^0x[a-fA-F0-9]{40}$/.test(x)
  );
  return (first || "").toLowerCase();
}

function pickSwapKind(s: any): "BUY" | "SELL" | "SWAP" {
  const t = String(
    s?.type || s?.swapType || s?.activityType || s?.eventType || ""
  ).toLowerCase();

  if (t.includes("buy")) return "BUY";
  if (t.includes("sell")) return "SELL";

  // fallback
  if (t.includes("mint")) return "BUY";
  if (t.includes("redeem")) return "SELL";

  return "SWAP";
}

/* ---------------- DexScreener (chart + extra stats) ---------------- */

type DexTokenPair = {
  chainId: string;
  url: string;
  pairAddress: string;
  dexId?: string;
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  fdv?: number;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
};

async function getDexBestPairByToken(token: string): Promise<DexTokenPair | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token}`, {
      next: { revalidate: 20 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pairs: DexTokenPair[] = Array.isArray(data?.pairs) ? data.pairs : [];

    const basePairs = pairs.filter((p) => String(p.chainId || "").toLowerCase() === "base");
    const pickFrom = basePairs.length ? basePairs : pairs;

    if (!pickFrom.length) return null;
    pickFrom.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
    return pickFrom[0] || null;
  } catch {
    return null;
  }
}

/* ---------------- Sparkline ---------------- */

function Sparkline({
  priceUsd,
  pc,
}: {
  priceUsd?: string;
  pc?: { m5?: number; h1?: number; h6?: number; h24?: number };
}) {
  const p = Number(priceUsd || "0");
  const ok = Number.isFinite(p) && p > 0;

  const now = ok ? p : 1;

  const m5 = pc?.m5 ?? 0;
  const h1 = pc?.h1 ?? 0;
  const h6 = pc?.h6 ?? 0;
  const h24 = pc?.h24 ?? 0;

  const p24 = now / (1 + h24 / 100);
  const p6 = now / (1 + h6 / 100);
  const p1 = now / (1 + h1 / 100);
  const p05 = now / (1 + m5 / 100);

  const pts = [p24, p6, p1, p05, now].map((x) => (Number.isFinite(x) ? x : now));

  const w = 240;
  const h = 64;
  const pad = 6;

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;

  const xy = pts.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (pts.length - 1);
    const y = pad + (h - pad * 2) * (1 - (v - min) / span);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const up = pts[pts.length - 1] >= pts[0];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopOpacity="0.35" />
          <stop offset="1" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <polyline
        points={xy.join(" ")}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="currentColor"
      />

      <polygon
        points={`${xy.join(" ")} ${w - pad},${h - pad} ${pad},${h - pad}`}
        fill="url(#sparkFill)"
      />

      <text x={w - 8} y={14} textAnchor="end" fontSize="10" opacity="0.6" fill="currentColor">
        24h
      </text>

      <text x="8" y={14} fontSize="10" opacity="0.6" fill="currentColor">
        {up ? "↗" : "↘"}
      </text>
    </svg>
  );
}

/* ---------------- Page ---------------- */

export default async function ZoraCoinPage(props: { params: Promise<{ address: string }> }) {
  const { address: raw } = await props.params;
  const address = String(raw || "").toLowerCase();

  if (!isAddress(address)) notFound();

  const dexPair = await getDexBestPairByToken(address);
  const pc = dexPair?.priceChange;

  let coin: any = null;
  let swaps: any[] = [];
  let error = "";

  try {
    const res: any = await getCoin({ address, chain: base.id });
    coin = res?.data?.zora20Token ?? null;
  } catch (e: any) {
    error = e?.message || "Failed to load coin.";
  }

  if (!coin) notFound();

  try {
    const res: any = await getCoinSwaps({ address, chain: base.id, first: 30 });
    swaps = res?.data?.zora20Token?.swapActivities?.edges?.map((e: any) => e?.node) ?? [];
  } catch {
    swaps = [];
  }

  // ✅ fixed active wallets list
  const topTraders = (() => {
    const m = new Map<string, number>();
    for (const s of swaps) {
      const who = pickSwapWallet(s);
      if (!who) continue;
      m.set(who, (m.get(who) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  })();

  const img = pickImage(coin);

  const marketCap = toNum(coin?.marketCap);
  const volume24h = toNum(coin?.volume24h);
  const totalSupply = toNum(coin?.totalSupply);

  const holders = coin?.uniqueHolders ?? coin?.uniqueHoldersCount ?? "—";

  const zoraUrl = `https://zora.co/coin/base:${address}`;
  const uniUrl = `https://app.uniswap.org/swap?chain=base&outputCurrency=${address}`;
  const dexUrl = dexPair?.url || `https://dexscreener.com/base/${address}`;

  return (
    <main className="min-h-screen text-white">
      <div className="page-container py-8 space-y-4 max-w-5xl mx-auto px-4">
        {/* Top Nav */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15"
          >
            ← Back
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            <WatchButton address={address} name={coin?.name} symbol={coin?.symbol} />

            <a
              href={uniUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-blue-600/80 border border-white/10 hover:bg-blue-600 transition font-bold"
            >
              Trade (Uniswap) ↗
            </a>

            <a
              href={zoraUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15"
            >
              Open on Zora ↗
            </a>

            <a
              href={dexUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15"
            >
              DexScreener ↗
            </a>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-red-300">{error}</div>
        )}

        {/* Header */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 flex gap-4">
          <div className="h-16 w-16 rounded-xl overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center">
            {img ? (
              <img src={img} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold">{(coin?.symbol || "?")[0]}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold truncate">
              {coin?.name} <span className="text-white/60">({coin?.symbol})</span>
            </h1>

            <div className="text-sm text-white/60 mt-1">
              Address: <span className="font-mono">{shortAddr(address)}</span>
            </div>

            <div className="text-xs text-white/40 mt-1">
              Created: {fmtDate(coin?.createdAt || coin?.createdAtTimestamp)}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs text-white/60">MARKET CAP</div>
            <div className="text-xl font-bold mt-1">{fmtUsd(marketCap)}</div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs text-white/60">VOLUME 24H</div>
            <div className="text-xl font-bold mt-1">{fmtUsd(volume24h)}</div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs text-white/60">HOLDERS</div>
            <div className="text-xl font-bold mt-1">{holders}</div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs text-white/60">SUPPLY</div>
            <div className="text-xl font-bold mt-1">{totalSupply?.toLocaleString() ?? "—"}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="font-bold">Price Chart (Approx)</div>

            <div className="flex items-center gap-3 text-xs">
              <div className="text-white/60">
                Price:{" "}
                <span className="text-white font-bold">
                  {dexPair?.priceUsd
                    ? `$${Number(dexPair.priceUsd).toLocaleString(undefined, {
                        maximumFractionDigits: 8,
                      })}`
                    : "—"}
                </span>
              </div>

              <div className={`font-bold ${pctClass(pc?.h24)}`}>24h {pct(pc?.h24)}</div>
              <div className={`font-bold ${pctClass(pc?.h6)}`}>6h {pct(pc?.h6)}</div>
              <div className={`font-bold ${pctClass(pc?.h1)}`}>1h {pct(pc?.h1)}</div>
              <div className={`font-bold ${pctClass(pc?.m5)}`}>5m {pct(pc?.m5)}</div>
            </div>
          </div>

          <div className={`mt-3 ${pc?.h24 !== undefined && pc.h24 < 0 ? "text-red-300" : "text-green-300"}`}>
            <Sparkline priceUsd={dexPair?.priceUsd} pc={pc} />
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-black/25 border border-white/10 p-3">
              <div className="text-xs text-white/60">DEX LIQ</div>
              <div className="font-bold">{fmtUsd(dexPair?.liquidity?.usd)}</div>
            </div>

            <div className="rounded-xl bg-black/25 border border-white/10 p-3">
              <div className="text-xs text-white/60">DEX VOL 24H</div>
              <div className="font-bold">{fmtUsd(dexPair?.volume?.h24)}</div>
            </div>

            <div className="rounded-xl bg-black/25 border border-white/10 p-3">
              <div className="text-xs text-white/60">FDV</div>
              <div className="font-bold">{fmtUsd(dexPair?.fdv)}</div>
            </div>
          </div>
        </div>

        {/* Top wallets */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 font-bold">
            Top Active Wallets (from recent swaps)
          </div>

          {topTraders.length === 0 ? (
            <div className="px-4 py-6 text-white/60">No active wallets yet.</div>
          ) : (
            topTraders.map(([addr, count], idx) => (
              <div key={addr} className="flex items-center justify-between px-4 py-3 border-b border-white/10 text-sm">
                <div className="flex items-center gap-3">
                  <div className="text-white/60 font-bold w-8">#{idx + 1}</div>
                  <div className="font-mono text-white/80">{shortAddr(addr)}</div>
                </div>
                <div className="text-white/60">
                  Trades: <span className="text-white font-bold">{count}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Swaps */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 font-bold">Recent Swaps</div>

          {swaps.length === 0 ? (
            <div className="px-4 py-6 text-white/60">No swaps yet.</div>
          ) : (
            swaps.map((s: any, i: number) => {
              const kind = pickSwapKind(s);
              const who = pickSwapWallet(s);

              return (
                <div key={s?.id || i} className="flex justify-between px-4 py-3 border-b border-white/10 text-sm">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        kind === "BUY"
                          ? "bg-green-400/15 text-green-300"
                          : kind === "SELL"
                          ? "bg-red-400/15 text-red-300"
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      {kind === "BUY" && "↑ BUY"}
                      {kind === "SELL" && "↓ SELL"}
                      {kind === "SWAP" && "SWAP"}
                    </span>

                    <span className="font-mono text-white/70">{who ? shortAddr(who) : "—"}</span>
                  </div>

                  <div className="text-white/50">{fmtDate(s?.timestamp || s?.createdAt || s?.blockTimestamp)}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}

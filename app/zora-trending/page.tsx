import Link from "next/link";
import { getCoinsTopVolume24h, getCoins, setApiKey } from "@zoralabs/coins-sdk";
import crypto from "crypto";
import AvatarClient from "../components/AvatarClient";
import MiniSparkline from "../components/MiniSparkline";

export const runtime = "nodejs";

export const metadata = {
  title: "Zora Trending",
  description: "Trending coins on Zora (Top Volume 24h • Base preferred).",
  alternates: { canonical: "https://basescreener.fun/zora-trending" },
};

export const revalidate = 20;

if (process.env.ZORA_API_KEY) {
  setApiKey(process.env.ZORA_API_KEY);
}

function shortAddr(a?: string) {
  if (!a) return "—";
  const s = String(a).toLowerCase();
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function isBaseCoin(c: any) {
  const chainId =
    c?.chainId ??
    c?.chain?.id ??
    c?.networkId ??
    (typeof c?.chain === "number" ? c.chain : undefined);

  if (Number(chainId) === 8453) return true;

  const name = String(c?.chain?.name || c?.chain || c?.network || "").toLowerCase().trim();
  return name === "base";
}

function coinUrl(c: any) {
  const addr = c?.address ? String(c.address).toLowerCase() : "";
  const chainId = Number(c?.chainId ?? c?.chain?.id ?? c?.networkId ?? NaN);
  const chainName = String(c?.chain?.name || c?.chain || c?.network || "").toLowerCase().trim();

  const isBase = chainId === 8453 || chainName === "base";
  const prefix = isBase ? "base:" : "";

  return c?.zoraUrl || c?.url || (addr ? `https://zora.co/coin/${prefix}${addr}` : "https://zora.co");
}

function pickCoinIcon(c: any): string {
  const mediaPreview =
    c?.mediaContent?.previewImage?.medium ||
    c?.mediaContent?.previewImage?.small ||
    c?.mediaContent?.previewImage?.original ||
    c?.mediaContent?.previewImage?.url;

  if (typeof mediaPreview === "string" && mediaPreview.startsWith("http")) return mediaPreview;

  const candidates: any[] = [
    c?.icon,
    c?.iconUrl,
    c?.image,
    c?.image?.url,
    c?.imageUrl,
    c?.avatar,
    c?.avatarUrl,
    c?.media?.url,
    c?.media?.image?.url,
    c?.media?.thumbnail?.url,
    c?.metadata?.image,
    c?.metadata?.imageUrl,
    c?.metadata?.icon,
    c?.metadata?.iconUrl,
    c?.images?.[0]?.url,
    c?.images?.[0],
  ];

  const s = candidates.find((x) => typeof x === "string" && x.startsWith("http"));
  if (s) return s;

  const o = candidates.find((x) => x && typeof x === "object" && typeof x.url === "string");
  if (o?.url?.startsWith("http")) return o.url;

  return "";
}

function identiconDataUri(seed: string) {
  const h = crypto.createHash("sha256").update(seed).digest();
  const c1 = `hsl(${h[0] % 360} 80% 60%)`;
  const c2 = `hsl(${h[1] % 360} 80% 50%)`;
  const bg = `hsl(${h[2] % 360} 35% 12%)`;

  const size = 5;
  const cell = 18;
  const pad = 10;
  const w = pad * 2 + cell * size;

  let rects = "";
  let idx = 3;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < Math.ceil(size / 2); x++) {
      const on = (h[idx++ % h.length] & 1) === 1;
      if (!on) continue;

      const x1 = pad + x * cell;
      const x2 = pad + (size - 1 - x) * cell;
      const y1 = pad + y * cell;

      const fill = x % 2 === 0 ? c1 : c2;

      rects += `<rect x="${x1}" y="${y1}" width="${cell}" height="${cell}" rx="6" fill="${fill}" />`;
      if (x2 !== x1) {
        rects += `<rect x="${x2}" y="${y1}" width="${cell}" height="${cell}" rx="6" fill="${fill}" />`;
      }
    }
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 ${w} ${w}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}" stop-opacity="0.25"/>
      <stop offset="1" stop-color="${c2}" stop-opacity="0.25"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="24" fill="${bg}"/>
  <rect x="6" y="6" width="${w - 12}" height="${w - 12}" rx="20" fill="url(#g)" opacity="0.6"/>
  ${rects}
</svg>`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function creatorLabel(c: any) {
  const handle = c?.creator?.username || c?.creator?.handle || c?.creator?.ens || c?.creator?.name;
  const addr = c?.creatorAddress || c?.creator?.address || c?.creator?.id;

  if (typeof handle === "string" && handle.trim()) return handle.trim();
  if (typeof addr === "string" && addr.trim()) return shortAddr(addr.trim());
  return "—";
}

function fmtCompact(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  const abs = Math.abs(x);
  if (abs >= 1e12) return `${(x / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(x / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(x / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(x / 1e3).toFixed(2)}K`;
  return x.toFixed(2);
}

function fmtUsd(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  if (x >= 1) return `$${x.toFixed(4)}`;
  if (x >= 0.01) return `$${x.toFixed(6)}`;
  return `$${x.toPrecision(4)}`;
}

function pct(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return x;
}

async function fetchDexscreenerToken(addr: string) {
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addr}`, {
      // helps Vercel caching behave nicely
      next: { revalidate: 20 },
    });
    if (!r.ok) return null;
    const j: any = await r.json();
    const pairs: any[] = Array.isArray(j?.pairs) ? j.pairs : [];
    // prefer Base + highest liquidity
    const basePairs = pairs.filter((p) => String(p?.chainId || "").toLowerCase() === "base");
    const list = basePairs.length ? basePairs : pairs;

    const best = list
      .slice()
      .sort((a, b) => Number(b?.liquidity?.usd ?? 0) - Number(a?.liquidity?.usd ?? 0))[0];

    if (!best) return null;

    return {
      priceUsd: best?.priceUsd,
      change24h: best?.priceChange?.h24,
      low24h: best?.low24h ?? best?.priceLow24h ?? null,
      high24h: best?.high24h ?? best?.priceHigh24h ?? null,
    };
  } catch {
    return null;
  }
}

export default async function ZoraTrendingPage() {
  let coins: any[] = [];
  let error = "";

  try {
    const response: any = await getCoinsTopVolume24h({ count: 40 });
    const all = response?.data?.exploreList?.edges?.map((e: any) => e?.node).filter(Boolean) ?? [];

    const baseOnly = all.filter(isBaseCoin);
    const list = baseOnly.length > 0 ? baseOnly : all;

    // Zora official details (icons)
    const toFetch = list
      .map((c: any) => {
        const addr = String(c?.address || "").toLowerCase();
        const chainId = Number(c?.chainId ?? c?.chain?.id ?? 8453);
        if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;
        return { collectionAddress: addr, chainId: Number.isFinite(chainId) ? chainId : 8453 };
      })
      .filter(Boolean);

    let merged = list;

    if (toFetch.length) {
      try {
        const details: any = await getCoins({ coins: toFetch as any[] });
        const detailed = details?.data?.zora20Tokens ?? [];
        const byAddr = new Map<string, any>(
          detailed.filter((x: any) => x?.address).map((x: any) => [String(x.address).toLowerCase(), x])
        );
        merged = list.map((c: any) => {
          const addr = String(c?.address || "").toLowerCase();
          const d = byAddr.get(addr);
          return d ? { ...c, ...d } : c;
        });
      } catch {
        merged = list;
      }
    }

    // Market data (Dexscreener) — limit parallel calls to reduce rate issues
    const addrs = merged.map((c: any) => String(c?.address || "").toLowerCase());
    const market = await Promise.all(
  addrs.map(async (a: string) =>
    a && /^0x[a-fA-F0-9]{40}$/.test(a)
      ? fetchDexscreenerToken(a)
      : null
  )
);

const byAddrMarket = new Map<string, any>();
addrs.forEach((a: string, i: number) => {
  byAddrMarket.set(a, market[i]);
});

    coins = merged.map((c: any) => {
      const addr = String(c?.address || "").toLowerCase();
      const m = byAddrMarket.get(addr);
      return m ? { ...c, __m: m } : c;
    });
  } catch (e: any) {
    error = e?.message || "Failed to load Zora trending.";
  }

  return (
    <main className="min-h-screen text-white">
      <div className="page-container py-8 space-y-4">
        <div className="glass ring-soft rounded-2xl p-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold">🔥 Zora Trending</div>
            <div className="text-white/60 text-sm mt-1">Top Volume (24h) coins on Zora • Base preferred</div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/zora-new"
              className="rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15 transition"
            >
              🆕 New
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15 transition"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="glass ring-soft rounded-2xl p-5 text-red-300">
            {error}
            {!process.env.ZORA_API_KEY && (
              <div className="mt-2 text-white/60 text-sm">
                Note: <span className="font-mono">ZORA_API_KEY</span> is optional.
              </div>
            )}
          </div>
        )}

        {!error && coins.length === 0 && (
          <div className="glass ring-soft rounded-2xl p-5 text-white/70">No trending coins found.</div>
        )}

        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          {/* Desktop header row */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-b border-white/10 text-xs text-white/50">
            <div className="w-[44px]" />
            <div className="flex-1">Coin</div>
            <div className="w-[140px] text-right">Price</div>
            <div className="w-[160px] text-right">24h Range</div>
            <div className="w-[120px] text-right">Vol 24h</div>
            <div className="w-[120px] text-right">MCap</div>
            <div className="w-[140px] text-right">Chart</div>
            <div className="w-[96px] text-right hidden md:block">Address</div>
          </div>

          {coins.map((c, i) => {
            const addr = String(c?.address || "").toLowerCase();
            const icon = pickCoinIcon(c);
            const fallback = addr ? identiconDataUri(addr) : "";

            const vol24h =
              c?.volume24h ??
              c?.volume?.h24 ??
              c?.volume?.usd24h ??
              c?.volumeUsd24h ??
              c?.stats?.volume24h ??
              c?.stats?.volumeUsd24h;

            const mcap =
              c?.marketCap ??
              c?.marketCapUsd ??
              c?.marketCap?.usd ??
              c?.stats?.marketCap ??
              c?.stats?.marketCapUsd;

            const priceUsd = c?.__m?.priceUsd;
            const ch24 = pct(c?.__m?.change24h);
            const low24 = c?.__m?.low24h;
            const high24 = c?.__m?.high24h;

            const up = (ch24 ?? 0) >= 0;

            return (
              <a
                key={`${c?.address || i}`}
                href={coinUrl(c)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition"
              >
                <AvatarClient icon={icon} fallback={fallback} />

                <div className="min-w-0 flex-1">
                  <div className="font-extrabold truncate">
                    {c?.name || "Coin"} <span className="text-white/60 font-bold">({c?.symbol || "—"})</span>
                  </div>
                  <div className="text-sm text-white/60 truncate">{creatorLabel(c)}</div>

                  {/* Mobile (compact) */}
                  <div className="sm:hidden text-xs text-white/60 mt-1 truncate">
                    <span className="text-white/50">Price:</span>{" "}
                    <span className="font-semibold text-white/80">{fmtUsd(priceUsd)}</span>
                    {ch24 !== null && (
                      <>
                        <span className="mx-2 text-white/30">•</span>
                        <span className={up ? "text-emerald-400" : "text-rose-400"}>
                          {up ? "+" : ""}
                          {ch24.toFixed(2)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="hidden sm:block w-[140px] text-right">
                  <div className="text-sm font-extrabold">{fmtUsd(priceUsd)}</div>
                  <div className={up ? "text-xs text-emerald-400" : "text-xs text-rose-400"}>
                    {ch24 === null ? "—" : `${up ? "+" : ""}${ch24.toFixed(2)}%`}
                  </div>
                </div>

                {/* 24h Range */}
                <div className="hidden sm:block w-[160px] text-right">
                  <div className="text-sm font-extrabold">
                    {low24 != null && high24 != null ? `${fmtUsd(low24)} – ${fmtUsd(high24)}` : "—"}
                  </div>
                  <div className="text-xs text-white/50">Low – High</div>
                </div>

                {/* Vol 24h */}
                <div className="hidden sm:block w-[120px] text-right">
                  <div className="text-sm font-extrabold">{fmtCompact(vol24h)}</div>
                  <div className="text-xs text-white/50">Vol 24h</div>
                </div>

                {/* MCap */}
                <div className="hidden sm:block w-[120px] text-right">
                  <div className="text-sm font-extrabold">{fmtCompact(mcap)}</div>
                  <div className="text-xs text-white/50">MCap</div>
                </div>

                {/* Chart */}
                <div className="hidden sm:flex w-[140px] justify-end">
                  <MiniSparkline seed={addr || String(i)} change24h={ch24 ?? 0} />
                </div>

                <div className="text-xs text-white/50 font-mono hidden md:block w-[96px] text-right">
                  {shortAddr(c?.address)}
                </div>
              </a>
            );
          })}
        </div>

        <div className="text-xs text-white/50">
        </div>
      </div>
    </main>
  );
}
import Image from "next/image";
import Link from "next/link";

import ContractAddress from "./components/ContractAddress";
import ImgFallback from "./components/ImgFallback";
import HomeGainersTrending from "./components/HomeGainersTrending";

import { listFeatured, type FeaturedItem } from "@/lib/featuredStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- Types ---------------- */

type DexPair = {
  chainId?: string;
  url?: string;
  pairAddress?: string;

  baseToken?: {
    address?: string;
    symbol?: string;
    name?: string;
  };

  quoteToken?: {
    address?: string;
    symbol?: string;
    name?: string;
  };

  priceUsd?: string;
  priceChange?: { h24?: number };

  liquidity?: { usd?: number };
  volume?: { h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
  info?: { imageUrl?: string };
};

type Token = {
  symbol?: string;
  name?: string;
  address?: string;
  change?: number;
  volume?: number;
  icon?: string;
};

/* ---------------- Utils ---------------- */

function isAddr(a?: string) {
  return !!a && /^0x[a-fA-F0-9]{40}$/.test(String(a || "").trim());
}

function shortAddr(a?: string, head = 6, tail = 4) {
  const s = String(a || "");
  if (!s) return "—";
  if (s.length <= head + tail + 2) return s;
  return `${s.slice(0, head + 2)}…${s.slice(-tail)}`;
}

function fmtUsd(n?: number) {
  if (n == null) return "—";
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

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* ---------------- Dexscreener ---------------- */

async function getBasePairsRaw(): Promise<DexPair[]> {
  const queries = ["base", "base meme", "base degen", "base usdc", "base weth"];

  const results = await Promise.all(
    queries.map(async (q) => {
      try {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return [];
        const data = await res.json().catch(() => null);
        return Array.isArray(data?.pairs) ? (data.pairs as DexPair[]) : [];
      } catch {
        return [];
      }
    })
  );

  return results
    .flat()
    .filter((p) => String(p?.chainId || "").toLowerCase() === "base")
    .slice(0, 160);
}

function bestPairsByToken(pairs: DexPair[]) {
  const map = new Map<string, DexPair>();

  for (const p of pairs) {
    const key = (p.baseToken?.address || "").toLowerCase();
    if (!isAddr(key)) continue;

    const cur = map.get(key);

    const liq = p.liquidity?.usd ?? 0;
    const vol = p.volume?.h24 ?? 0;

    const curLiq = cur?.liquidity?.usd ?? -1;
    const curVol = cur?.volume?.h24 ?? -1;

    if (!cur || liq > curLiq || (liq === curLiq && vol > curVol)) {
      map.set(key, p);
    }
  }

  return Array.from(map.values());
}

async function fetchPairsForTokenAddrs(addrs: string[]): Promise<DexPair[]> {
  const clean = addrs.map((a) => a.toLowerCase()).filter(isAddr);
  if (!clean.length) return [];

  const batches = chunk(clean, 25);
  const out: DexPair[] = [];

  for (const b of batches) {
    try {
      const joined = b.join(",");
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/base/${joined}`, {
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json().catch(() => null)) as DexPair[] | null;
      if (Array.isArray(data)) out.push(...data);
    } catch {
      // ignore
    }
  }

  return out.filter((p) => String(p?.chainId || "").toLowerCase() === "base");
}

/* ---------------- Components ---------------- */

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-extrabold">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-white/60">{subtitle}</p> : null}
    </div>
  );
}

function TokenCard({
  p,
  promoted,
  promoTitle,
}: {
  p: DexPair;
  promoted?: boolean;
  promoTitle?: string;
}) {
  const addr = (p.baseToken?.address || "").toLowerCase();

  return (
    <div
      className={[
        "rounded-2xl border p-4 sm:p-5 backdrop-blur-md shadow-lg",
        promoted ? "border-yellow-400/40 bg-yellow-500/10" : "border-white/10 bg-white/5 hover:bg-white/10",
      ].join(" ")}
    >
      <Link href={`/token/${addr}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 min-w-0">
            <ImgFallback
              src={p.info?.imageUrl}
              fallback="/token-placeholder.png"
              alt={p.baseToken?.symbol || "Token"}
              className="h-10 w-10 rounded-xl object-cover border border-white/10"
            />

            <div className="min-w-0">
              <div className="font-extrabold truncate">
                {(p.baseToken?.symbol || "—") + " / " + (p.quoteToken?.symbol || "—")}
              </div>
              <div className="text-xs text-white/55 truncate">{promoTitle || p.baseToken?.name || "—"}</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] text-white/60">PRICE</div>
            <div className="font-extrabold">{fmtPriceUsd(p.priceUsd)}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="bg-black/30 p-2 rounded-xl border border-white/5">
            <div className="text-[11px] text-white/60">VOL</div>
            <div className="font-bold">{fmtUsd(p.volume?.h24)}</div>
          </div>

          <div className="bg-black/30 p-2 rounded-xl border border-white/5">
            <div className="text-[11px] text-white/60">LIQ</div>
            <div className="font-bold">{fmtUsd(p.liquidity?.usd)}</div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function FeaturedFallbackCard({ item }: { item: FeaturedItem }) {
  const addr = item.address.toLowerCase();
  const dexUrl = `https://dexscreener.com/base/${addr}`;

  return (
    <div
      className={[
        "rounded-2xl border p-4 sm:p-5 backdrop-blur-md shadow-lg",
        item.promoted ? "border-yellow-400/40 bg-yellow-500/10" : "border-white/10 bg-white/5 hover:bg-white/10",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3 min-w-0">
          <ImgFallback
            src={item.logoUrl || undefined}
            fallback="/token-placeholder.png"
            alt={item.title || "Featured token"}
            className="h-10 w-10 rounded-xl object-cover border border-white/10"
          />

          <div className="min-w-0">
            <div className="font-extrabold truncate">{item.title || shortAddr(addr)}</div>
            <div className="text-xs text-white/55 truncate">{shortAddr(addr)}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] text-white/60">STATUS</div>
          <div className="font-extrabold text-white/80">No pair yet</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/token/${addr}`} className="px-4 py-2 rounded-xl bg-blue-600 font-bold hover:bg-blue-500 transition">
          Open
        </Link>

        <a
          href={dexUrl}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition font-bold"
        >
          DexScreener ↗
        </a>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

export default async function Home() {
  const featured = await listFeatured();

  // ✅ promoted first, then weight
  const featuredItems = (featured || [])
    .filter((f) => f.chainId === 8453 && isAddr(f.address))
    .sort((a, b) => {
      const p = Number(!!b.promoted) - Number(!!a.promoted);
      if (p) return p;
      return (b.weight ?? 0) - (a.weight ?? 0);
    });

  const rawPairs = await getBasePairsRaw();
  const uniquePairs = bestPairsByToken(rawPairs);

  const featuredPairsRaw = await fetchPairsForTokenAddrs(featuredItems.map((f) => f.address));
  const featuredPairsBest = bestPairsByToken(featuredPairsRaw);

  const featuredPairMap = new Map<string, DexPair>();
  for (const p of featuredPairsBest) {
    const a = (p.baseToken?.address || "").toLowerCase();
    if (isAddr(a)) featuredPairMap.set(a, p);
  }

  const featuredTop = featuredItems.slice(0, 6).map((it) => {
    const addr = it.address.toLowerCase();
    const direct = featuredPairMap.get(addr);
    const fallback = uniquePairs.find((p) => (p.baseToken?.address || "").toLowerCase() === addr);
    return { item: it, pair: direct || fallback || null };
  });

  const tokens: Token[] = uniquePairs.slice(0, 80).map((p) => ({
    address: p.baseToken?.address,
    symbol: p.baseToken?.symbol,
    name: p.baseToken?.name,
    icon: p.info?.imageUrl,
    change: typeof p.priceChange?.h24 === "number" ? p.priceChange.h24 : undefined,
    volume: typeof p.volume?.h24 === "number" ? p.volume.h24 : undefined,
  }));

  return (
    <main className="relative min-h-screen bg-[#020617] text-white px-4 sm:px-6 py-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-200px] left-[-200px] h-[500px] w-[500px] rounded-full bg-blue-600/30 blur-[160px]" />
        <div className="absolute bottom-[-200px] right-[-200px] h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[160px]" />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <Image src="/logo.png" alt="BaseScreener" width={420} height={110} priority />

            <h1 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-extrabold">Track Base Tokens in Real-Time</h1>

            <p className="mt-4 text-blue-200">Watch liquidity, volume, and smart money instantly.</p>

            <div className="mt-6">
              <ContractAddress />
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/dashboard" className="px-6 py-3 rounded-xl bg-blue-600 font-extrabold hover:bg-blue-500">
                🚀 Dashboard
              </Link>

              <Link href="/token" className="px-6 py-3 bg-white text-black rounded-xl font-extrabold hover:bg-white/90">
                🔍 Lookup
              </Link>
            </div>
          </div>
        </div>

        <HomeGainersTrending tokens={tokens} />

        <section className="mt-12">
          <SectionTitle title="✨ Featured / Promoted" subtitle="Paid placements." />

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredTop.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
                No featured coins right now.
              </div>
            ) : (
              featuredTop.map(({ item, pair }) =>
                pair ? (
                  <TokenCard
                    key={pair.pairAddress || item.address}
                    p={pair}
                    promoted={!!item.promoted}
                    promoTitle={item.title}
                  />
                ) : (
                  <FeaturedFallbackCard key={item.address} item={item} />
                )
              )
            )}
          </div>
        </section>

        <footer className="mt-14 border-t border-white/10 pt-8 text-sm text-white/50">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <div>Live on-chain data</div>
            <div>Powered by BaseScreener</div>
          </div>
        </footer>
      </div>
    </main>
  );
}
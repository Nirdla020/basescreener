import Image from "next/image";
import Link from "next/link";
import ContractAddress from "./components/ContractAddress";
import ImgFallback from "./components/ImgFallback";

type DexPair = {
  chainId: string;
  url: string;
  pairAddress: string;

  baseToken: { address: string; symbol: string; name: string };
  quoteToken?: { address: string; symbol: string; name: string };

  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };

  info?: { imageUrl?: string };
};

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

async function getTrendingBasePairs(): Promise<DexPair[]> {
  const queries = ["base", "base usdc", "base weth", "base meme", "base degen"];

  const results = await Promise.all(
    queries.map(async (q) => {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`,
        { next: { revalidate: 30 } }
      );

      if (!res.ok) return [];

      const data = await res.json();
      return Array.isArray(data?.pairs) ? (data.pairs as DexPair[]) : [];
    })
  );

  const pairs = results.flat().filter((p) => (p.chainId || "").toLowerCase() === "base");

  const MIN_LIQ = 20_000;
  const MIN_VOL = 10_000;

  const filtered = pairs.filter((p) => {
    const liq = p.liquidity?.usd ?? 0;
    const vol = p.volume?.h24 ?? 0;
    return liq >= MIN_LIQ && vol >= MIN_VOL;
  });

  const bestByToken = new Map<string, DexPair>();

  for (const p of filtered) {
    const key = (p.baseToken?.address || "").toLowerCase();
    if (!key) continue;

    const cur = bestByToken.get(key);

    const liq = p.liquidity?.usd ?? 0;
    const vol = p.volume?.h24 ?? 0;

    const curLiq = cur?.liquidity?.usd ?? -1;
    const curVol = cur?.volume?.h24 ?? -1;

    if (!cur || liq > curLiq || (liq === curLiq && vol > curVol)) {
      bestByToken.set(key, p);
    }
  }

  const unique = Array.from(bestByToken.values());

  unique.sort((a, b) => {
    const av = a.volume?.h24 ?? 0;
    const bv = b.volume?.h24 ?? 0;
    const al = a.liquidity?.usd ?? 0;
    const bl = b.liquidity?.usd ?? 0;

    if (bv !== av) return bv - av;
    return bl - al;
  });

  return unique.slice(0, 6);
}

export default async function Home() {
  const trending = await getTrendingBasePairs();

  return (
    <main className="relative min-h-screen bg-[#020617] text-white px-6 py-14 md:py-20 overflow-hidden">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-220px] left-[-220px] h-[520px] w-[520px] rounded-full bg-blue-600/30 blur-[160px]" />
        <div className="absolute top-[80px] right-[-220px] h-[520px] w-[520px] rounded-full bg-cyan-500/20 blur-[160px]" />
        <div className="absolute bottom-[-260px] left-[20%] h-[560px] w-[560px] rounded-full bg-indigo-500/15 blur-[180px]" />
      </div>

      <div className="mx-auto max-w-6xl">
        {/* HERO */}
        <div className="max-w-3xl">
          <Image
            src="/logo.png"
            alt="BaseScreener"
            width={420}
            height={110}
            priority
          />

          <h1 className="mt-6 text-4xl md:text-5xl font-extrabold">
            Track Base Tokens in Real-Time
          </h1>

          <p className="mt-4 text-blue-200 text-lg">
            Watch liquidity, volume, holders, and smart money moves instantly.
          </p>

          <div className="mt-6">
            <ContractAddress />
          </div>

          <div className="mt-8 flex gap-3 flex-wrap">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-xl bg-blue-600 font-bold hover:bg-blue-500"
            >
              🚀 Dashboard
            </Link>

            <Link
              href="/token"
              className="px-6 py-3 bg-white text-black rounded-xl font-bold"
            >
              🔍 Lookup
            </Link>
          </div>
        </div>

        {/* TRENDING */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold mb-4">🔥 Trending on Base</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trending.length === 0 ? (
              <div className="text-white/60">No data.</div>
            ) : (
              trending.map((p) => {
                const buys = p.txns?.h24?.buys ?? 0;
                const sells = p.txns?.h24?.sells ?? 0;
                const txns = buys + sells;

                const pair = `${p.baseToken?.symbol ?? "—"} / ${
                  p.quoteToken?.symbol ?? "—"
                }`;

                const addr = p.baseToken?.address?.toLowerCase();

                return (
                  <div
                    key={p.pairAddress}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
                  >
                    <Link href={`/zora/coin/${addr}`} className="block">
                      {/* Header */}
                      <div className="flex justify-between gap-3">
                        <div className="flex gap-3 min-w-0">
                          <ImgFallback
                            src={p.info?.imageUrl}
                            fallback="/token-placeholder.png"
                            alt={pair}
                            className="h-10 w-10 rounded-xl object-cover border border-white/10"
                          />

                          <div className="min-w-0">
                            <div className="font-bold truncate">{pair}</div>
                            <div className="text-xs text-white/50 truncate">
                              {p.baseToken?.name}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs text-white/60">PRICE</div>
                          <div className="font-bold">
                            {fmtPriceUsd(p.priceUsd)}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                        <div className="bg-black/30 p-2 rounded-lg">
                          <div className="text-xs text-white/60">VOL</div>
                          {fmtUsd(p.volume?.h24)}
                        </div>

                        <div className="bg-black/30 p-2 rounded-lg">
                          <div className="text-xs text-white/60">LIQ</div>
                          {fmtUsd(p.liquidity?.usd)}
                        </div>

                        <div className="bg-black/30 p-2 rounded-lg">
                          <div className="text-xs text-white/60">TXNS</div>
                          {txns}
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-white/50">
                        View Token →
                      </div>
                    </Link>

                    {/* External */}
                    <div className="mt-2">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline text-white/50 hover:text-blue-400"
                      >
                        DexScreener ↗
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

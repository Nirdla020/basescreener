import Image from "next/image";
import Link from "next/link";
import ContractAddress from "./components/ContractAddress";

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

  // ✅ DexScreener token icon (often present)
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

/**
 * ✅ Popular-only trending:
 * - Pull bigger pool (multi queries)
 * - Filter spam (MIN_LIQ, MIN_VOL)
 * - Dedupe by base token (best pool per token)
 * - Sort by volume then liquidity
 */
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

  const pairs = results
    .flat()
    .filter((p) => (p.chainId || "").toLowerCase() === "base");

  // ✅ Popularity filters (tune anytime)
  const MIN_LIQ = 20_000; // $20k liquidity
  const MIN_VOL = 10_000; // $10k 24h volume

  const filtered = pairs.filter((p) => {
    const liq = p.liquidity?.usd ?? 0;
    const vol = p.volume?.h24 ?? 0;
    return liq >= MIN_LIQ && vol >= MIN_VOL;
  });

  // ✅ Dedupe: keep best pool per token (liquidity first, then volume)
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

  const uniqueTokens = Array.from(bestByToken.values());

  uniqueTokens.sort((a, b) => {
    const av = a.volume?.h24 ?? 0;
    const bv = b.volume?.h24 ?? 0;
    const al = a.liquidity?.usd ?? 0;
    const bl = b.liquidity?.usd ?? 0;

    if (bv !== av) return bv - av;
    return bl - al;
  });

  return uniqueTokens.slice(0, 6);
}

export default async function Home() {
  const trending = await getTrendingBasePairs();

  return (
    <main className="relative min-h-screen bg-[#020617] text-white px-6 py-14 md:py-20 overflow-hidden">
      {/* BACKGROUND GLOW */}
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
            className="object-contain"
          />

          <h1 className="mt-6 text-4xl md:text-5xl font-extrabold leading-tight drop-shadow-[0_0_25px_rgba(59,130,246,0.35)]">
            Track Base Tokens in Real-Time
          </h1>

          <p className="mt-4 text-blue-200 text-lg">
            Watch liquidity, volume, holders, and smart money moves instantly.
          </p>

          {/* FEATURE TILE */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wider text-white/80 font-semibold">
              What you can do
            </p>

            <ul className="mt-3 space-y-2 text-white/80">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400" />
                Live token metrics (price, volume, liquidity)
              </li>

              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400" />
                Quick token lookup via contract address
              </li>

              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400" />
                Trending & new pairs tracking
              </li>

              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400" />
                Fast filtering for gems & risks
              </li>
            </ul>
          </div>

          {/* CONTRACT */}
          <div className="mt-6">
            <ContractAddress />
          </div>

          {/* CTA BUTTONS */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/dashboard"
              className="relative inline-flex items-center justify-center
                         px-7 py-3 rounded-xl font-bold text-white
                         bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500
                         bg-[length:200%_200%] animate-gradient
                         shadow-lg shadow-blue-500/25
                         hover:shadow-cyan-500/40
                         hover:-translate-y-0.5
                         active:translate-y-0
                         transition-all duration-200 text-center"
            >
              🚀 Explore Live Dashboard
            </Link>

            <Link
              href="/token"
              className="px-6 py-3 bg-white text-[#020617]
                         rounded-xl font-bold hover:opacity-90
                         transition text-center"
            >
              Look Up a Token
            </Link>
          </div>
        </div>

        {/* TRENDING */}
        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold">🔥 Trending on Base</h2>
              <p className="mt-1 text-sm text-white/60">
                Popular pairs only (filtered). Auto refresh every ~30s.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="hidden sm:inline-flex px-4 py-2 rounded-xl
                         bg-white/10 border border-white/10
                         hover:bg-white/15 transition
                         text-sm font-bold"
            >
              View All →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trending.length === 0 ? (
              <div className="text-white/60">No data right now. Please refresh.</div>
            ) : (
              trending.map((p) => {
                const buys = p.txns?.h24?.buys ?? 0;
                const sells = p.txns?.h24?.sells ?? 0;
                const txns = buys + sells;

                const icon = p.info?.imageUrl || "/token-placeholder.png";
                const pairLabel = `${p.baseToken?.symbol ?? "—"} / ${p.quoteToken?.symbol ?? "—"}`;

                return (
                  <a
                    key={p.pairAddress}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition
                               shadow-[0_0_0_1px_rgba(255,255,255,0.03)]
                               hover:shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"
                    title="Open on DexScreener"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={icon}
                          alt=""
                          className="h-10 w-10 rounded-xl bg-black/30 border border-white/10 object-cover"
                          loading="lazy"
                        />

                        <div className="min-w-0">
                          <div className="text-sm text-white/60">PAIR</div>
                          <div className="text-lg font-extrabold truncate">{pairLabel}</div>
                          <div className="text-xs text-white/50 truncate">{p.baseToken?.name ?? ""}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs text-white/60">PRICE</div>
                        <div className="font-extrabold">{fmtPriceUsd(p.priceUsd)}</div>
                      </div>
                    </div>

                    {/* Stat chips */}
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl bg-black/25 border border-white/10 p-3">
                        <div className="text-[11px] tracking-wide text-white/60">24H VOL</div>
                        <div className="font-extrabold">{fmtUsd(p.volume?.h24)}</div>
                      </div>

                      <div className="rounded-xl bg-black/25 border border-white/10 p-3">
                        <div className="text-[11px] tracking-wide text-white/60">LIQ</div>
                        <div className="font-extrabold">{fmtUsd(p.liquidity?.usd)}</div>
                      </div>

                      <div className="rounded-xl bg-black/25 border border-white/10 p-3">
                        <div className="text-[11px] tracking-wide text-white/60">TXNS</div>
                        <div className="font-extrabold">{txns.toLocaleString()}</div>
                        <div className="text-[11px] text-white/50">
                          {buys}/{sells}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-white/50 group-hover:text-white/70 transition">
                      Click to open on DexScreener →
                    </div>
                  </a>
                );
              })
            )}
          </div>

          <div className="mt-5 sm:hidden">
            <Link
              href="/dashboard"
              className="inline-flex w-full justify-center px-4 py-3
                         rounded-xl bg-white/10 border border-white/10
                         hover:bg-white/15 transition text-sm font-bold"
            >
              View All →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

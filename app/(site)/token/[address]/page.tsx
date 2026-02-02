import type { Metadata } from "next";

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
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
};

function isAddress(a: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(a);
}

function normalizeTs(ts?: number) {
  if (!ts || !Number.isFinite(ts)) return undefined;
  return ts < 1_000_000_000_000 ? ts * 1000 : ts;
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

function fmtAge(ts?: number) {
  const ms = normalizeTs(ts);
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 0) return "—";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

async function fetchPairs(address: string): Promise<DexPair[]> {
  const res = await fetch(`https://api.dexscreener.com/tokens/v1/base/${address}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as DexPair[];
  return Array.isArray(data) ? data : [];
}

export async function generateMetadata({
  params,
}: {
  params: { address: string };
}): Promise<Metadata> {
  const addr = params.address?.toLowerCase() || "";
  return {
    title: isAddress(addr) ? `Token ${addr.slice(0, 6)}…${addr.slice(-4)}` : "Token",
    alternates: { canonical: `https://basescreener.fun/token/${addr}` },
  };
}

export default async function TokenPage({ params }: { params: { address: string } }) {
  const address = (params.address || "").toLowerCase();

  if (!isAddress(address)) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto max-w-5xl glass ring-soft rounded-2xl p-6 text-white">
          <div className="text-xl font-extrabold">Invalid address</div>
          <div className="text-white/60 mt-2">Use a valid 0x… token address.</div>
        </div>
      </main>
    );
  }

  const pairs = await fetchPairs(address);

  // pick best pair by liquidity
  const best =
    [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] || null;

  const token = best?.baseToken?.address?.toLowerCase() === address ? best?.baseToken : best?.baseToken;
  const icon = best?.info?.imageUrl;

  return (
    <main className="min-h-screen px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Header */}
        <div className="glass ring-soft rounded-2xl p-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
              {icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={icon} alt="" className="h-12 w-12 object-cover" />
              ) : (
                <span className="font-extrabold text-xl">
                  {(token?.symbol || "?").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-extrabold truncate">
                {token?.symbol || "TOKEN"}{" "}
                <span className="text-white/50 text-sm font-bold">
                  {token?.name || ""}
                </span>
              </div>
              <div className="text-xs text-white/60 break-all">{address}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {best?.url && (
                  <a
                    className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-sm hover:bg-white/15 transition"
                    href={best.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open DexScreener ↗
                  </a>
                )}

                <a
                  className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-sm hover:bg-white/15 transition"
                  href={`https://basescan.org/token/${address}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  BaseScan ↗
                </a>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-white/60">Price</div>
            <div className="text-2xl font-extrabold">{fmtPriceUsd(best?.priceUsd)}</div>
            <div className="text-xs text-white/50 mt-1">
              Age: <span className="text-white/70 font-bold">{fmtAge(best?.pairCreatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass ring-soft rounded-2xl p-4">
            <div className="text-xs text-white/60">Liquidity</div>
            <div className="text-xl font-extrabold">{fmtUsd(best?.liquidity?.usd)}</div>
          </div>

          <div className="glass ring-soft rounded-2xl p-4">
            <div className="text-xs text-white/60">24h Volume</div>
            <div className="text-xl font-extrabold">{fmtUsd(best?.volume?.h24)}</div>
          </div>

          <div className="glass ring-soft rounded-2xl p-4">
            <div className="text-xs text-white/60">24h Txns</div>
            <div className="text-xl font-extrabold">
              {((best?.txns?.h24?.buys ?? 0) + (best?.txns?.h24?.sells ?? 0)).toLocaleString()}
            </div>
          </div>

          <div className="glass ring-soft rounded-2xl p-4">
            <div className="text-xs text-white/60">FDV</div>
            <div className="text-xl font-extrabold">{fmtUsd(best?.fdv)}</div>
          </div>
        </div>

        {/* Pairs table */}
        <div className="glass ring-soft rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="font-extrabold">Pairs</div>
            <div className="text-xs text-white/50">
              Showing {pairs.length} pair(s)
            </div>
          </div>

          <div className="min-w-[900px]">
            <div className="grid grid-cols-8 px-4 py-3 text-xs font-bold text-white/60 border-b border-white/10">
              <div className="col-span-2">PAIR</div>
              <div>DEX</div>
              <div>PRICE</div>
              <div>VOL</div>
              <div>LIQ</div>
              <div>TXNS</div>
              <div>AGE</div>
            </div>

            {pairs
              .slice()
              .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))
              .slice(0, 30)
              .map((p) => {
                const txns = (p.txns?.h24?.buys ?? 0) + (p.txns?.h24?.sells ?? 0);
                return (
                  <a
                    key={p.pairAddress}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="grid grid-cols-8 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition items-center"
                  >
                    <div className="col-span-2 font-bold truncate">
                      {p.baseToken.symbol}/{p.quoteToken.symbol}
                    </div>
                    <div className="text-white/70">{p.dexId || "—"}</div>
                    <div className="font-bold">{fmtPriceUsd(p.priceUsd)}</div>
                    <div className="font-bold">{fmtUsd(p.volume?.h24)}</div>
                    <div className="font-bold">{fmtUsd(p.liquidity?.usd)}</div>
                    <div className="text-white/80">{txns.toLocaleString()}</div>
                    <div className="text-white/80">{fmtAge(p.pairCreatedAt)}</div>
                  </a>
                );
              })}
          </div>
        </div>
      </div>
    </main>
  );
}

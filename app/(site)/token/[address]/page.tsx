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

function cleanAddress(raw: string) {
  // ✅ decode url + trim spaces/newlines
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return (raw || "").trim().toLowerCase();
  }
}

function isAddress(a: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(a.trim());
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

/* ✅ More reliable pairs endpoint */
async function fetchPairs(address: string): Promise<DexPair[]> {
  const res = await fetch(`https://api.dexscreener.com/token-pairs/v1/base/${address}`, {
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
  const addr = cleanAddress(params.address || "");
  return {
    title: isAddress(addr) ? `Token ${addr.slice(0, 6)}…${addr.slice(-4)}` : "Token",
    alternates: { canonical: `https://basescreener.fun/token/${addr}` },
  };
}

export default async function TokenPage({ params }: { params: { address: string } }) {
  const address = cleanAddress(params.address || "");

  if (!isAddress(address)) {
    return (
      <main className="min-h-screen text-white">
        <div className="page-container py-10">
          <div className="glass ring-soft rounded-2xl p-6">
            <div className="text-xl font-extrabold">Invalid address</div>
            <div className="text-white/60 mt-2">
              Use a valid 0x… token address.
            </div>

            {/* ✅ Helpful debug (you can remove later) */}
            <div className="mt-3 text-xs text-white/40 break-all">
              Received: <span className="text-white/70">{String(params.address || "")}</span>
            </div>
            <div className="mt-1 text-xs text-white/40 break-all">
              Cleaned: <span className="text-white/70">{address}</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const pairs = await fetchPairs(address);

  const sortedPairs = pairs
    .slice()
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));

  const best = sortedPairs[0] || null;
  const token = best?.baseToken;
  const icon = best?.info?.imageUrl;

  // ✅ If valid address but API returns nothing, show message (NOT invalid)
  if (pairs.length === 0) {
    return (
      <main className="min-h-screen text-white">
        <div className="page-container py-10">
          <div className="glass ring-soft rounded-2xl p-6">
            <div className="text-xl font-extrabold">No pools found</div>
            <div className="text-white/60 mt-2">
              This address is valid, but DexScreener didn’t return any Base pools for it.
            </div>
            <div className="mt-3 text-xs text-white/50 break-all">
              Address: <span className="text-white/70">{address}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-sm hover:bg-white/15 transition"
                href={`https://basescan.org/token/${address}`}
                target="_blank"
                rel="noreferrer"
              >
                Check on BaseScan ↗
              </a>
              <a
                className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-sm hover:bg-white/15 transition"
                href={`https://dexscreener.com/base/${address}`}
                target="_blank"
                rel="noreferrer"
              >
                Try DexScreener ↗
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-white">
      <div className="page-container py-8 space-y-4">
        {/* Header */}
        <div className="glass ring-soft rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
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
                <span className="text-white/50 text-sm font-bold">{token?.name || ""}</span>
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

          <div className="sm:text-right">
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

        {/* Pairs */}
        <div className="glass ring-soft rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="font-extrabold">Pairs</div>
            <div className="text-xs text-white/50">Showing {pairs.length} pair(s)</div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden p-4 space-y-3">
            {sortedPairs.slice(0, 30).map((p) => {
              const txns = (p.txns?.h24?.buys ?? 0) + (p.txns?.h24?.sells ?? 0);
              return (
                <a
                  key={p.pairAddress}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-extrabold truncate">
                        {p.baseToken.symbol}/{p.quoteToken.symbol}
                      </div>
                      <div className="text-xs text-white/60">
                        {p.dexId || "—"} • Age {fmtAge(p.pairCreatedAt)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold">{fmtPriceUsd(p.priceUsd)}</div>
                      <div className="text-xs text-white/60">Txns {txns.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                      <div className="text-white/60">Vol 24h</div>
                      <div className="font-bold">{fmtUsd(p.volume?.h24)}</div>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                      <div className="text-white/60">Liquidity</div>
                      <div className="font-bold">{fmtUsd(p.liquidity?.usd)}</div>
                    </div>
                  </div>

                  <div className="mt-3 text-[10px] text-white/35 break-all">{p.pairAddress}</div>
                </a>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
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

              {sortedPairs.slice(0, 30).map((p) => {
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
      </div>
    </main>
  );
}

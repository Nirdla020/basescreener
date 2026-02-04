"use client";

import Link from "next/link";

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

function fmtUsd(n?: number) {
  if (!n || !isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPrice(s?: string) {
  const n = Number(s);
  if (!s || !isFinite(n)) return "—";
  if (n >= 1) return `$${n.toFixed(6)}`;
  return `$${n.toPrecision(6)}`;
}

function pctClass(n?: number) {
  if (n === undefined || !isFinite(n)) return "text-white/70";
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-rose-400";
  return "text-white/70";
}

export default function TokenListResponsive({
  pairs,
}: {
  pairs: DexPair[];
}) {
  if (!pairs?.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/70">
        No tokens found.
      </div>
    );
  }

  return (
    <>
      {/* ================= MOBILE CARDS ================= */}
      <div className="md:hidden space-y-3">
        {pairs.map((p) => {
          const chg = p.priceChange?.h24;

          return (
            <Link
              key={p.pairAddress}
              href={`/token?q=${p.baseToken.address}`}
              className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
            >
              <div className="flex justify-between">
                <div>
                  <div className="font-bold">{p.baseToken.symbol}</div>
                  <div className="text-xs text-white/60">
                    {p.baseToken.name}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold">
                    {fmtPrice(p.priceUsd)}
                  </div>
                  <div className={`text-xs ${pctClass(chg)}`}>
                    {chg?.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-white/60">Liquidity</div>
                  {fmtUsd(p.liquidity?.usd)}
                </div>

                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-white/60">Volume 24h</div>
                  {fmtUsd(p.volume?.h24)}
                </div>
              </div>

              <div className="mt-2 text-[10px] text-white/40 break-all">
                {p.pairAddress}
              </div>
            </Link>
          );
        })}
      </div>

      {/* ================= DESKTOP TABLE ================= */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-white/10 text-white/60">
            <tr>
              <th className="p-3 text-left">Token</th>
              <th className="p-3 text-left">Price</th>
              <th className="p-3 text-left">24h</th>
              <th className="p-3 text-left">Liquidity</th>
              <th className="p-3 text-left">Volume</th>
              <th className="p-3 text-left">Pair</th>
            </tr>
          </thead>

          <tbody>
            {pairs.map((p) => {
              const chg = p.priceChange?.h24;

              return (
                <tr
                  key={p.pairAddress}
                  className="border-b border-white/5 hover:bg-white/5"
                >
                  <td className="p-3 font-bold">
                    {p.baseToken.symbol}
                  </td>

                  <td className="p-3">
                    {fmtPrice(p.priceUsd)}
                  </td>

                  <td className={`p-3 ${pctClass(chg)}`}>
                    {chg?.toFixed(2)}%
                  </td>

                  <td className="p-3">
                    {fmtUsd(p.liquidity?.usd)}
                  </td>

                  <td className="p-3">
                    {fmtUsd(p.volume?.h24)}
                  </td>

                  <td className="p-3 text-xs text-white/50 break-all">
                    {p.pairAddress}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

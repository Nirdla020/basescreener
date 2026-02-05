"use client";

export default function TradeButtons({ address }: { address: string }) {
  const a = address.toLowerCase();
  return (
    <div className="flex flex-wrap gap-2">
      <a
        className="px-3 py-2 rounded-lg bg-white text-black text-sm font-semibold"
        href={`https://app.uniswap.org/swap?outputCurrency=${a}&chain=base`}
        target="_blank"
        rel="noreferrer"
      >
        Trade on Uniswap
      </a>

      <a
        className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/10"
        href={`https://dexscreener.com/base/${a}`}
        target="_blank"
        rel="noreferrer"
      >
        View on Dexscreener
      </a>

      <a
        className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/10"
        href={`https://zora.co/coin/base:${a}`}
        target="_blank"
        rel="noreferrer"
      >
        View on Zora
      </a>
    </div>
  );
}
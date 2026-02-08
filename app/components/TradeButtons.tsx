"use client";

export default function TradeButtons({ address }: { address: string }) {
  const a = address.toLowerCase();

  // 🔁 Change this to YOUR Zora username
  const ZORA_USERNAME = "basescreener"; // <-- edit this

  return (
    <div className="flex flex-wrap gap-2">
      {/* Uniswap */}
      <a
        className="px-3 py-2 rounded-lg bg-white text-black text-sm font-semibold"
        href={`https://app.uniswap.org/swap?outputCurrency=${a}&chain=base`}
        target="_blank"
        rel="noreferrer"
      >
        Trade on Uniswap
      </a>

      {/* Dexscreener */}
      <a
        className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/10"
        href={`https://dexscreener.com/base/${a}`}
        target="_blank"
        rel="noreferrer"
      >
        View on Dexscreener
      </a>

      {/* Zora Coin */}
      <a
        className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/10"
        href={`https://zora.co/coin/base:${a}`}
        target="_blank"
        rel="noreferrer"
      >
        View on Zora
      </a>

      {/* Zora Create / Activate */}
      <a
        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition"
        href="https://zora.co/@basescreener"
        target="_blank"
        rel="noreferrer"
      >
        Create / Activate on Zora
      </a>
    </div>
  );
}
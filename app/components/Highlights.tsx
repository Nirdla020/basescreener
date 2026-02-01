"use client";

type Token = {
  symbol?: string;
  name?: string;
  address?: string;
  change?: number;
  volume?: number;
};

function format(n?: number) {
  if (!n) return "-";
  if (n > 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n > 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(2);
}

export default function Highlights({ tokens }: { tokens: Token[] }) {
  const gainers = [...tokens]
    .sort((a, b) => (b.change || 0) - (a.change || 0))
    .slice(0, 5);

  const trending = [...tokens]
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 5);

  function Row(t: Token, i: number) {
    return (
      <a
        key={i}
        href={t.address ? `/token?q=${t.address}` : "/token"}
        className="flex justify-between rounded-xl bg-white/5 p-3 hover:bg-white/10"
      >
        <span>{t.symbol || t.name || "Token"}</span>

        <span
          className={(t.change || 0) >= 0 ? "text-green-400" : "text-red-400"}
        >
          {(t.change || 0).toFixed(2)}%
        </span>
      </a>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4 my-6">
      <div className="rounded-xl border border-white/10 p-4 bg-white/5">
        <h2 className="font-bold mb-3">🚀 Top Gainers</h2>
        <div className="space-y-2">
          {gainers.map(Row)}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 p-4 bg-white/5">
        <h2 className="font-bold mb-3">📈 Trending</h2>
        <div className="space-y-2">
          {trending.map(Row)}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";

/* ---------------- Types ---------------- */

type Token = {
  symbol?: string;
  name?: string;
  address?: string;
  change?: number;   // 24h %
  volume?: number;   // 24h volume
  icon?: string;
};

/* ---------------- Utils ---------------- */

function isAddr(a?: string) {
  return !!a && /^0x[a-fA-F0-9]{40}$/.test(a);
}

function isNum(n: any): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/* ---------------- Component ---------------- */

export default function HomeGainersTrending({
  tokens,
}: {
  tokens: Token[];
}) {
  /* Top Gainers = highest % change */
  const gainers = useMemo(() => {
    return [...(tokens || [])]
      .filter((t) => isNum(t.change))
      .sort((a, b) => (b.change as number) - (a.change as number))
      .slice(0, 5);
  }, [tokens]);

  /* Trending = highest volume */
  const trending = useMemo(() => {
    return [...(tokens || [])]
      .filter((t) => isNum(t.volume))
      .sort((a, b) => (b.volume as number) - (a.volume as number))
      .slice(0, 5);
  }, [tokens]);

  /* Row UI */
  function Row(t: Token, i: number) {
    const label = t.symbol || t.name || "Token";
    const addr = (t.address || "").toLowerCase();

    const hasChange = isNum(t.change);
    const change = hasChange ? t.change! : null;

    const row = (
      <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 hover:bg-white/10 transition">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={t.icon || "/token-placeholder.png"}
            onError={(e) =>
              ((e.currentTarget.src = "/token-placeholder.png"))
            }
            alt=""
            className="h-8 w-8 rounded-lg bg-white/10 object-cover shrink-0"
            loading="lazy"
          />

          <span className="truncate">{label}</span>
        </div>

        {hasChange ? (
          <span
            className={
              change! >= 0 ? "text-green-400" : "text-red-400"
            }
          >
            {change! >= 0 ? "+" : ""}
            {change!.toFixed(2)}%
          </span>
        ) : (
          <span className="text-white/50 text-xs">—</span>
        )}
      </div>
    );

    if (!isAddr(addr)) {
      return (
        <div key={(t.address ?? "") + i} className="opacity-60">
          {row}
        </div>
      );
    }

    return (
      <Link
        key={addr + i}
        href={`/token/${addr}`}
        className="block"
      >
        {row}
      </Link>
    );
  }

  /* ---------------- Render ---------------- */

  return (
    <div className="mt-10 grid md:grid-cols-2 gap-4">
      {/* Top Gainers */}
      <div className="rounded-xl border border-white/10 p-4 bg-white/5">
        <h2 className="font-bold mb-3">🚀 Top Gainers</h2>

        <div className="space-y-2">
          {gainers.length ? (
            gainers.map(Row)
          ) : (
            <div className="text-white/60 text-sm">
              No data.
            </div>
          )}
        </div>
      </div>

      {/* Trending */}
      <div className="rounded-xl border border-white/10 p-4 bg-white/5">
        <h2 className="font-bold mb-3">📈 Trending</h2>

        <div className="space-y-2">
          {trending.length ? (
            trending.map(Row)
          ) : (
            <div className="text-white/60 text-sm">
              No data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import React from "react";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

// deterministic tiny RNG from a string seed (address)
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    // xorshift-ish
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
}

export default function MiniSparkline({
  seed,
  change24h,
  width = 120,
  height = 28,
}: {
  seed: string;
  change24h?: number | null;
  width?: number;
  height?: number;
}) {
  const rng = React.useMemo(() => seeded(seed), [seed]);

  const pts = React.useMemo(() => {
    const n = 24;
    const drift = clamp(Number(change24h ?? 0) / 100, -0.5, 0.5); // gentle drift
    let v = 0.5;
    const arr: number[] = [];

    for (let i = 0; i < n; i++) {
      const noise = (rng() - 0.5) * 0.12;
      v = clamp(v + noise + drift / n, 0.05, 0.95);
      arr.push(v);
    }
    return arr;
  }, [rng, change24h]);

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;

  const d = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * width;
      const y = height - ((p - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const up = Number(change24h ?? 0) >= 0;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="opacity-90">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={up ? "text-emerald-400" : "text-rose-400"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
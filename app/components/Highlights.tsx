"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* ---------------- Types ---------------- */

type Token = {
  symbol?: string;
  name?: string;
  address?: string;
  change?: number;
  volume?: number;
  icon?: string;
};

type FeaturedItem = {
  chainId: number;
  address: string;
  title?: string;

  // ✅ NEW: sponsor custom logo
  logoUrl?: string;

  weight: number;
  promoted: boolean;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type DexPair = {
  baseToken?: { address?: string; symbol?: string; name?: string };
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  info?: { imageUrl?: string };
};

/* ---------------- Utils ---------------- */

function isAddr(a?: string) {
  return !!a && /^0x[a-fA-F0-9]{40}$/.test(a);
}

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function trackClick(label: string, token?: string) {
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "click",
      route: "/dashboard",
      label,
      token: token || "",
    }),
    keepalive: true,
  }).catch(() => {});
}

/* ---------------- Dexscreener Fetch ---------------- */

async function fetchDexTokenInfo(addresses: string[]) {
  const out: Record<string, Partial<Token>> = {};

  await Promise.all(
    addresses.map(async (addr) => {
      try {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${addr}`,
          { cache: "no-store" }
        );

        const json = await res.json().catch(() => null);
        const pairs: DexPair[] = Array.isArray(json?.pairs) ? json.pairs : [];

        const p =
          pairs.find((x: any) => String((x as any)?.chainId || "") === "base") ||
          pairs[0];

        if (!p) return;

        out[addr.toLowerCase()] = {
          address: addr,
          symbol: p?.baseToken?.symbol,
          name: p?.baseToken?.name,
          icon: p?.info?.imageUrl,
          change:
            typeof p?.priceChange?.h24 === "number"
              ? p.priceChange.h24
              : undefined,
          volume:
            typeof p?.volume?.h24 === "number" ? p.volume.h24 : undefined,
        };
      } catch {
        // ignore
      }
    })
  );

  return out;
}

/* ---------------- Component ---------------- */

export default function Highlights({ tokens }: { tokens: Token[] }) {
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [featuredInfo, setFeaturedInfo] = useState<
    Record<string, Partial<Token>>
  >({});

  /* Load featured list */
  useEffect(() => {
    fetch("/api/admin/featured", { cache: "no-store" })
      .then(async (r) => {
        const text = await r.text();
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })
      .then((d) => setFeaturedItems(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setFeaturedItems([]));
  }, []);

  /* Load token info */
  useEffect(() => {
    const addrs = featuredItems
      .map((x) => x.address)
      .filter((a) => isAddr(a))
      .map((a) => a.toLowerCase());

    if (!addrs.length) return;

    let cancelled = false;

    (async () => {
      const info = await fetchDexTokenInfo(addrs);
      if (!cancelled) setFeaturedInfo(info);
    })();

    return () => {
      cancelled = true;
    };
  }, [featuredItems]);

  /* Merge data */
  const featuredTokens: (Token & { _featured?: FeaturedItem })[] = useMemo(() => {
    const map = new Map<string, Token>();
    for (const t of tokens || []) {
      if (t.address) map.set(t.address.toLowerCase(), t);
    }

    return featuredItems
      .filter((x) => isAddr(x.address))
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .map((x) => {
        const addr = x.address.toLowerCase();
        const fromDashboard = map.get(addr);
        const fromDex = featuredInfo[addr];

        const merged: Token = {
          address: x.address,
          symbol: fromDashboard?.symbol || fromDex?.symbol,
          name: fromDashboard?.name || fromDex?.name,
          icon: fromDashboard?.icon || fromDex?.icon,
          change:
            typeof fromDashboard?.change === "number"
              ? fromDashboard.change
              : (fromDex?.change as any),
          volume:
            typeof fromDashboard?.volume === "number"
              ? fromDashboard.volume
              : (fromDex?.volume as any),
        };

        return { ...merged, _featured: x };
      });
  }, [featuredItems, featuredInfo, tokens]);

  /* Other sections */
  const gainers = [...(tokens || [])]
    .sort((a, b) => (b.change || 0) - (a.change || 0))
    .slice(0, 5);

  const trending = [...(tokens || [])]
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 5);

  /* ---------------- Rows ---------------- */

  function Row(t: Token, i: number) {
    const label = t.symbol || t.name || "Token";
    const chg = t.change || 0;
    const addr = (t.address || "").toLowerCase();

    if (!isAddr(addr)) {
      return (
        <div
          key={(t.address ?? "") + i}
          className="flex items-center justify-between rounded-xl bg-white/5 p-3 opacity-60"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={t.icon || "/token-placeholder.png"}
              alt=""
              className="h-8 w-8 rounded-lg bg-white/10 object-cover shrink-0"
              loading="lazy"
            />
            <span className="truncate">{label}</span>
          </div>
          <span className="text-white/50 text-xs">No address</span>
        </div>
      );
    }

    return (
      <Link
        key={addr + i}
        href={`/token/${addr}`}
        className="flex items-center justify-between rounded-xl bg-white/5 p-3 hover:bg-white/10 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={t.icon || "/token-placeholder.png"}
            alt=""
            className="h-8 w-8 rounded-lg bg-white/10 object-cover shrink-0"
            loading="lazy"
          />
          <span className="truncate">{label}</span>
        </div>

        <span className={chg >= 0 ? "text-green-400" : "text-red-400"}>
          {chg >= 0 ? "+" : ""}
          {chg.toFixed(2)}%
        </span>
      </Link>
    );
  }

  /* ---------------- Featured Row ---------------- */

  function FeaturedRow(t: Token & { _featured?: FeaturedItem }, i: number) {
    const meta = t._featured;

    const isTopSponsor =
      meta?.promoted &&
      meta?.weight ===
        Math.max(
          ...featuredItems.filter((x) => x.promoted).map((x) => x.weight),
          0
        );

    const label =
      t.symbol && t.name
        ? `${t.symbol} — ${t.name}`
        : t.symbol || t.name || meta?.title || "Featured";

    const chg = t.change;

    const addr = (t.address || meta?.address || "").toLowerCase();
    const logoSrc = meta?.logoUrl || t.icon || "/token-placeholder.png";

    // If addr missing, render non-clickable card (prevents going to /token)
    if (!isAddr(addr)) {
      return (
        <div
          key={(t.address ?? "") + i}
          className="flex items-center justify-between rounded-xl p-3 transition border bg-yellow-400/10 border-yellow-400/20 opacity-60"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoSrc}
              alt=""
              className="h-9 w-9 rounded-xl bg-white/10 object-cover shrink-0"
              loading="lazy"
            />
            <div className="min-w-0">
              <div className="truncate font-semibold flex items-center gap-2">
                <span className="truncate">
                  {isTopSponsor ? "👑" : "🔥"} {label}
                </span>
              </div>
              <div className="text-[11px] text-white/60 truncate">No address</div>
            </div>
          </div>
          <span className="text-white/50 text-xs">View</span>
        </div>
      );
    }

    return (
      <Link
        key={addr + i}
        href={`/token/${addr}`}
        onClick={() =>
          trackClick(meta?.promoted ? "featured_promoted" : "featured", addr)
        }
        className={`flex items-center justify-between rounded-xl p-3 transition border
          ${
            isTopSponsor
              ? "bg-yellow-400/25 border-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.85)] hover:shadow-[0_0_46px_rgba(250,204,21,1)]"
              : meta?.promoted
              ? "bg-yellow-400/15 border-yellow-400/40 shadow-[0_0_22px_rgba(250,204,21,0.45)] hover:shadow-[0_0_30px_rgba(250,204,21,0.65)]"
              : "bg-yellow-400/10 border-yellow-400/20 hover:bg-yellow-400/15"
          }
        `}
      >
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={logoSrc}
            alt=""
            className="h-9 w-9 rounded-xl bg-white/10 object-cover shrink-0"
            loading="lazy"
          />

          <div className="min-w-0">
            <div className="truncate font-semibold flex items-center gap-2">
              <span className="truncate">
                {isTopSponsor ? "👑" : "🔥"} {label}
              </span>

              {/* Hide Featured badge when promoted */}
              {!meta?.promoted && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-200">
                  Featured
                </span>
              )}
            </div>

            <div className="text-[11px] text-white/60 truncate">{shortAddr(addr)}</div>
          </div>
        </div>

        {typeof chg === "number" ? (
          <span className={chg >= 0 ? "text-green-400" : "text-red-400"}>
            {chg >= 0 ? "+" : ""}
            {chg.toFixed(2)}%
          </span>
        ) : (
          <span className="text-white/50 text-xs">View</span>
        )}
      </Link>
    );
  }

  /* ---------------- Render ---------------- */

  return (
    <div className="my-6 space-y-4">
      {/* Featured */}
      {featuredTokens.length > 0 && (
        <div className="rounded-xl border border-yellow-400/20 p-4 bg-yellow-400/5">
          <h2 className="font-bold mb-3">🔥 Featured</h2>
          <div className="space-y-2">{featuredTokens.map(FeaturedRow)}</div>
        </div>
      )}

      {/* Gainers / Trending */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 p-4 bg-white/5">
          <h2 className="font-bold mb-3">🚀 Top Gainers</h2>
          <div className="space-y-2">{gainers.map(Row)}</div>
        </div>

        <div className="rounded-xl border border-white/10 p-4 bg-white/5">
          <h2 className="font-bold mb-3">📈 Trending</h2>
          <div className="space-y-2">{trending.map(Row)}</div>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdUnit from "../../components/AdUnit";
import TradeButtons from "../../components/TradeButtons"; // ✅ adjust path if needed

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
};

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function extractAddress(input: string) {
  const cleaned = safeDecode(String(input || ""))
    .trim()
    .replace(/\s+/g, "")
    .replace(/\/+$/, "");

  const m = cleaned.match(/0x[a-fA-F0-9]{40}/);
  return m ? m[0].toLowerCase() : "";
}

function isAddress(a: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(a || "").trim());
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

/** ===== Watchlist (same key as DashboardClient) ===== */
function readWatchlist(): string[] {
  try {
    const raw = localStorage.getItem("watchlist_base") || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeWatchlist(list: string[]) {
  try {
    localStorage.setItem("watchlist_base", JSON.stringify(list));
  } catch {}
}

function isSaved(addr?: string) {
  if (!addr) return false;
  const a = addr.toLowerCase();
  return readWatchlist().some((x) => String(x).toLowerCase() === a);
}

function toggleSaved(addr?: string) {
  if (!addr) return false;
  const a = addr.toLowerCase();
  const cur = readWatchlist().map((x) => x.toLowerCase());
  const exists = cur.includes(a);

  const next = exists ? cur.filter((x) => x !== a) : [a, ...cur].slice(0, 30);
  writeWatchlist(next);
  return !exists;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function TokenClient({ addressFromRoute }: { addressFromRoute?: string }) {
  const sp = useSearchParams();
  const lastAutoRef = useRef<string>("");

  const [address, setAddress] = useState("");
  const [pairs, setPairs] = useState<DexPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [watchTick, setWatchTick] = useState(0);

  const normalized = useMemo(() => extractAddress(address), [address]);

  function showToast(msg: string) {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(""), 1200);
  }

  const watchCount = useMemo(() => readWatchlist().length, [watchTick]);

  // ✅ use env slot IDs like dashboard (optional)
  const AD_SLOT_TOP = process.env.NEXT_PUBLIC_AD_SLOT_TOP || "";
  const AD_SLOT_BOTTOM = process.env.NEXT_PUBLIC_AD_SLOT_BOTTOM || "";
  const topSlotOk = /^\d+$/.test(AD_SLOT_TOP);
  const bottomSlotOk = /^\d+$/.test(AD_SLOT_BOTTOM);

  const hasContent = pairs.length > 0;
  const canShowAds = !loading && error === "" && hasContent;

  const isDevHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname.endsWith(".vercel.app"));

  const adsEnabled = canShowAds && !isDevHost;

  // ✅ Auto-load when landing on /token/[address] OR /token?q=
  useEffect(() => {
    const raw = (addressFromRoute || sp.get("q") || "").toString();
    if (!raw) return;

    const addr = extractAddress(raw);
    setAddress(addr || raw.trim());

    if (!addr || !isAddress(addr)) {
      setPairs([]);
      setError("Token page accepts only a valid 0x address.");
      return;
    }

    if (lastAutoRef.current === addr) return;
    lastAutoRef.current = addr;

    searchToken(addr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressFromRoute, sp]);

  async function searchToken(forced?: string) {
    const a = extractAddress(forced ?? normalized);

    if (!a || !isAddress(a)) {
      setError("Invalid address. Must be 0x + 40 hex characters.");
      setPairs([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`https://api.dexscreener.com/token-pairs/v1/base/${a}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`DexScreener HTTP ${res.status} ${text}`.trim());
      }

      const data = (await res.json()) as DexPair[];
      const arr = Array.isArray(data) ? data : [];
      setPairs(arr);

      if (arr.length === 0) setError("No pools found for this token on Base (DexScreener returned 0 pairs).");
    } catch (e: any) {
      setPairs([]);
      setError(e?.message || "Failed to fetch DexScreener data");
    } finally {
      setLoading(false);
    }
  }

  const sortedPairs = useMemo(() => {
    return [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  }, [pairs]);

  // ✅ “best” pool = highest liquidity
  const best = useMemo(() => sortedPairs[0], [sortedPairs]);

  const agg = useMemo(() => {
    if (!best) return null;
    const buys = best.txns?.h24?.buys ?? 0;
    const sells = best.txns?.h24?.sells ?? 0;
    const txns = buys + sells;

    return {
      symbol: best.baseToken?.symbol || "—",
      name: best.baseToken?.name || "—",
      priceUsd: best.priceUsd,
      liq: best.liquidity?.usd ?? 0,
      vol: best.volume?.h24 ?? 0,
      buys,
      sells,
      txns,
      dex: best.dexId || "dex",
      pair: best.pairAddress,
    };
  }, [best]);

  return (
    <main className="min-h-screen text-white py-8">
      {/* Toast */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] transition-all duration-300 ease-out
        ${toast ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95 pointer-events-none"}`}
      >
        <div className="rounded-2xl bg-black/80 border border-white/15 px-5 py-2.5 text-sm text-white shadow-xl backdrop-blur">
          {toast}
        </div>
      </div>

      <div className="page-container">
        {/* Top Ad */}
        {topSlotOk && (
          <div className="mb-4">
            <AdUnit slot={AD_SLOT_TOP} enabled={adsEnabled} className="glass ring-soft rounded-2xl p-3" />
          </div>
        )}

        {/* Search bar */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 rounded-2xl border border-blue-500/40 bg-black/40 px-4 py-3">
                <span className="text-white/70">🔎</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") searchToken();
                  }}
                  placeholder="Paste Base token address (0x...)"
                  className="w-full bg-transparent outline-none text-white placeholder:text-white/55"
                />
              </div>
              <div className="mt-2 text-xs text-white/50">Tip: paste a URL or base:0x… — we’ll extract the address.</div>
            </div>

            <button
              onClick={() => searchToken()}
              className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition"
            >
              Open Token
            </button>

            <button
              onClick={() => {
                const a = normalized;
                if (!isAddress(a)) {
                  setError("Invalid address. Cannot save.");
                  return;
                }
                const nowSaved = toggleSaved(a);
                setWatchTick((x) => x + 1);
                showToast(nowSaved ? "Saved ⭐" : "Removed ❌");
                setError("");
              }}
              className="px-6 py-3 bg-white text-[#020617] rounded-xl font-bold hover:opacity-90 transition"
            >
              {isSaved(normalized) ? "Saved ⭐" : `Save (${watchCount})`}
            </button>
          </div>

          {loading && <div className="mt-4 text-blue-100">Loading pools…</div>}
          {error && <div className="mt-4 text-red-300 break-words">{error}</div>}
        </div>

        {/* Token header + stats */}
        {isAddress(normalized) && (
          <div className="mt-4 space-y-4">
            <section className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-white/50">Contract</div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-white/80 break-all">{normalized}</span>
                    <button
                      onClick={async () => {
                        const ok = await copyText(normalized);
                        showToast(ok ? "Copied! 📋" : "Copy failed");
                      }}
                      className="rounded-xl bg-white/10 border border-white/10 px-3 py-1.5 text-xs hover:bg-white/15 transition"
                    >
                      📋 Copy
                    </button>
                  </div>

                  <div className="mt-4">
                    <div className="text-2xl font-extrabold text-white">
                      {agg ? `${agg.symbol}` : "Token"}
                      <span className="text-white/50 text-base font-normal"> {agg?.name ? `• ${agg.name}` : ""}</span>
                    </div>
                    <div className="mt-1 text-sm text-white/60">
                      Best pool: <span className="text-white/80 font-bold">{agg?.dex || "—"}</span>{" "}
                      <span className="text-white/40">({agg?.pair ? agg.pair.slice(0, 10) + "…" : "—"})</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <TradeButtons address={normalized} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full lg:w-[520px]">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="text-xs text-white/60">PRICE (USD)</div>
                    <div className="mt-1 text-xl font-extrabold">{fmtPriceUsd(agg?.priceUsd)}</div>
                  </div>

                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="text-xs text-white/60">LIQUIDITY</div>
                    <div className="mt-1 text-xl font-extrabold">{fmtUsd(agg?.liq)}</div>
                  </div>

                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="text-xs text-white/60">VOLUME 24H</div>
                    <div className="mt-1 text-xl font-extrabold">{fmtUsd(agg?.vol)}</div>
                  </div>

                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="text-xs text-white/60">TXNS 24H</div>
                    <div className="mt-1 text-xl font-extrabold">{(agg?.txns ?? 0).toLocaleString()}</div>
                  </div>

                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="text-xs text-white/60">BUYS / SELLS</div>
                    <div className="mt-1 text-xl font-extrabold">
                      {(agg?.buys ?? 0).toLocaleString()} / {(agg?.sells ?? 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="text-xs text-white/60">POOLS FOUND</div>
                    <div className="mt-1 text-xl font-extrabold">{pairs.length.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Pools */}
            {sortedPairs.length > 0 && (
              <section className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                  <div className="font-extrabold">Liquidity Pools</div>
                  <div className="text-xs text-white/50">Sorted by Liquidity</div>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden p-4 space-y-3">
                  {sortedPairs.slice(0, 20).map((p) => {
                    const buys = p.txns?.h24?.buys ?? 0;
                    const sells = p.txns?.h24?.sells ?? 0;
                    const txns = buys + sells;

                    return (
                      <a
                        key={p.pairAddress}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-extrabold truncate">
                              {p.baseToken.symbol}/{p.quoteToken.symbol}
                            </div>
                            <div className="text-xs text-white/50">
                              {p.dexId || "dex"} • Pair:{" "}
                              <span className="font-mono text-white/60">{p.pairAddress.slice(0, 10)}…</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-extrabold">{fmtPriceUsd(p.priceUsd)}</div>
                            <div className="text-xs text-white/60">Liq {fmtUsd(p.liquidity?.usd)}</div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                            <div className="text-white/60">Vol 24h</div>
                            <div className="font-bold">{fmtUsd(p.volume?.h24)}</div>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                            <div className="text-white/60">Txns</div>
                            <div className="font-bold">{txns.toLocaleString()}</div>
                          </div>
                          <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                            <div className="text-white/60">Buys/Sells</div>
                            <div className="font-bold">
                              {buys}/{sells}
                            </div>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block">
                  <div className="grid grid-cols-12 gap-0 px-5 py-3 text-xs font-bold text-white/70 border-b border-white/10">
                    <div className="col-span-3">POOL</div>
                    <div>PRICE</div>
                    <div>LIQ</div>
                    <div>VOL 24H</div>
                    <div>TXNS</div>
                    <div>BUYS</div>
                    <div>SELLS</div>
                    <div className="col-span-2">PAIR</div>
                  </div>

                  {sortedPairs.slice(0, 30).map((p) => {
                    const buys = p.txns?.h24?.buys ?? 0;
                    const sells = p.txns?.h24?.sells ?? 0;
                    const txns = buys + sells;

                    return (
                      <a
                        key={p.pairAddress}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="grid grid-cols-12 px-5 py-3 border-b border-white/5 hover:bg-white/5 transition items-center"
                      >
                        <div className="col-span-3 min-w-0">
                          <div className="font-bold truncate">
                            {p.baseToken.symbol}/{p.quoteToken.symbol}
                          </div>
                          <div className="text-xs text-white/50">{p.dexId || "dex"} • Base</div>
                        </div>

                        <div className="font-bold">{fmtPriceUsd(p.priceUsd)}</div>
                        <div className="font-bold">{fmtUsd(p.liquidity?.usd)}</div>
                        <div className="font-bold">{fmtUsd(p.volume?.h24)}</div>
                        <div className="font-bold">{txns.toLocaleString()}</div>
                        <div className="font-bold">{buys.toLocaleString()}</div>
                        <div className="font-bold">{sells.toLocaleString()}</div>

                        <div className="col-span-2 text-xs text-white/60 font-mono truncate">{p.pairAddress}</div>
                      </a>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Bottom Ad */}
        {bottomSlotOk && (
          <div className="mt-6">
            <AdUnit slot={AD_SLOT_BOTTOM} enabled={adsEnabled} className="glass ring-soft rounded-2xl p-3" />
          </div>
        )}

        {/* Info */}
        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-5 text-sm text-white/70 leading-relaxed">
          <p>
            This page shows liquidity pools and market activity for a Base token using DexScreener data. Results include
            price, liquidity, 24h volume, and transaction counts per pool.
          </p>
          <p className="mt-2 text-white/50">Disclaimer: This is informational only and not financial advice.</p>
        </div>
      </div>
    </main>
  );
}
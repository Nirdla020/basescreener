import Link from "next/link";
import { FEATURED } from "@/app/config/featured";

function zoraCoinUrl(addr: string) {
  return `https://zora.co/coin/${encodeURIComponent(`base:${addr.toLowerCase()}`)}`;
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function isActive(endsAt?: string) {
  if (!endsAt) return true;
  return Date.now() < new Date(endsAt).getTime();
}

export default function FeaturedSection() {
  const items = FEATURED.filter((x) => isActive(x.endsAt)).sort((a, b) => {
    const rank = (t: string) => (t === "pinned" ? 0 : t === "featured" ? 1 : 2);
    return rank(a.tier) - rank(b.tier);
  });

  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white">Featured</div>
          <div className="mt-1 text-xs text-white/60">
            Curated promotions (manual approval).
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((x) => (
          <div
            key={`${x.tier}:${x.coinAddress}`}
            className="rounded-2xl border border-white/10 bg-black/30 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/80">
                {x.tier.toUpperCase()}
              </span>
              {x.endsAt ? (
                <span className="text-[11px] text-white/50">
                  ends {new Date(x.endsAt).toLocaleString()}
                </span>
              ) : null}
            </div>

            <div className="mt-3 text-sm font-semibold text-white">
              {x.label || "Promoted coin"}
            </div>

            <div className="mt-1 font-mono text-xs text-white/70">
              {shortAddr(x.coinAddress)}
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                href={zoraCoinUrl(x.coinAddress)}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition"
              >
                View on Zora
              </Link>
              <a
                href={`https://basescan.org/token/${x.coinAddress}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 transition"
              >
                BaseScan
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
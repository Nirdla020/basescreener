import Link from "next/link";
import { getCoinsTopVolume24h, setApiKey } from "@zoralabs/coins-sdk";
import crypto from "crypto";
import AvatarClient from "../components/AvatarClient";

export const runtime = "nodejs";

export const metadata = {
  title: "Zora Trending",
  description: "Trending Zora coins (Top Volume 24h).",
  alternates: { canonical: "https://basescreener.fun/zora-trending" },
};

export const revalidate = 20;

// ✅ Optional: key is NOT required. Keep this if you ever get a key later.
if (process.env.ZORA_API_KEY) {
  setApiKey(process.env.ZORA_API_KEY);
}

function shortAddr(a?: string) {
  if (!a) return "—";
  const s = String(a).toLowerCase();
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function coinUrl(c: any) {
  const addr = c?.address ? String(c.address).toLowerCase() : "";
  const chainId = Number(c?.chainId ?? c?.chain?.id ?? c?.networkId ?? NaN);
  const chainName = String(c?.chain?.name || c?.chain || c?.network || "").toLowerCase().trim();

  const isBase = chainId === 8453 || chainName === "base";
  const prefix = isBase ? "base:" : "";

  return c?.zoraUrl || c?.url || (addr ? `https://zora.co/coin/${prefix}${addr}` : "https://zora.co");
}

function pickCoinIcon(c: any): string {
  const candidates: any[] = [
    c?.icon,
    c?.iconUrl,

    c?.image,
    c?.image?.url,
    c?.imageUrl,

    c?.avatar,
    c?.avatarUrl,

    c?.media?.url,
    c?.media?.image?.url,
    c?.media?.thumbnail?.url,

    c?.metadata?.image,
    c?.metadata?.imageUrl,
    c?.metadata?.icon,
    c?.metadata?.iconUrl,

    c?.images?.[0]?.url,
    c?.images?.[0],
  ];

  const s = candidates.find((x) => typeof x === "string" && x.startsWith("http"));
  if (s) return s;

  const o = candidates.find((x) => x && typeof x === "object" && typeof x.url === "string");
  if (o?.url?.startsWith("http")) return o.url;

  return "";
}

// Always-works fallback avatar (identicon from address)
function identiconDataUri(seed: string) {
  const h = crypto.createHash("sha256").update(seed).digest();
  const c1 = `hsl(${h[0] % 360} 80% 60%)`;
  const c2 = `hsl(${h[1] % 360} 80% 50%)`;
  const bg = `hsl(${h[2] % 360} 35% 12%)`;

  const size = 5;
  const cell = 18;
  const pad = 10;
  const w = pad * 2 + cell * size;

  let rects = "";
  let idx = 3;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < Math.ceil(size / 2); x++) {
      const on = (h[idx++ % h.length] & 1) === 1;
      if (!on) continue;

      const x1 = pad + x * cell;
      const x2 = pad + (size - 1 - x) * cell;
      const y1 = pad + y * cell;

      const fill = x % 2 === 0 ? c1 : c2;

      rects += `<rect x="${x1}" y="${y1}" width="${cell}" height="${cell}" rx="6" fill="${fill}" />`;
      if (x2 !== x1) {
        rects += `<rect x="${x2}" y="${y1}" width="${cell}" height="${cell}" rx="6" fill="${fill}" />`;
      }
    }
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 ${w} ${w}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}" stop-opacity="0.25"/>
      <stop offset="1" stop-color="${c2}" stop-opacity="0.25"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="24" fill="${bg}"/>
  <rect x="6" y="6" width="${w - 12}" height="${w - 12}" rx="20" fill="url(#g)" opacity="0.6"/>
  ${rects}
</svg>`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Creator line (best effort)
function creatorLabel(c: any) {
  const handle =
    c?.creator?.username ||
    c?.creator?.handle ||
    c?.creator?.ens ||
    c?.creator?.name;

  const addr = c?.creatorAddress || c?.creator?.address || c?.creator?.id;

  if (typeof handle === "string" && handle.trim()) return handle.trim();
  if (typeof addr === "string" && addr.trim()) return shortAddr(addr.trim());
  return "—";
}

export default async function ZoraTrendingPage() {
  let coins: any[] = [];
  let error = "";

  try {
    const response: any = await getCoinsTopVolume24h({ count: 40 });

    coins =
      response?.data?.exploreList?.edges?.map((e: any) => e?.node).filter(Boolean) ?? [];
  } catch (e: any) {
    error = e?.message || "Failed to load Zora trending.";
  }

  return (
    <main className="min-h-screen text-white">
      <div className="page-container py-8 space-y-4">
        {/* Header */}
        <div className="glass ring-soft rounded-2xl p-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold">🔥 Zora Trending</div>
            <div className="text-white/60 text-sm mt-1">Top Volume (24h) coins on Zora</div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/zora-new"
              className="rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15 transition"
            >
              🆕 New
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15 transition"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="glass ring-soft rounded-2xl p-5 text-red-300">
            {error}
            {!process.env.ZORA_API_KEY && (
              <div className="mt-2 text-white/60 text-sm">
                Note: <span className="font-mono">ZORA_API_KEY</span> is optional. This page can work without it (lower
                rate limits).
              </div>
            )}
          </div>
        )}

        {!error && coins.length === 0 && (
          <div className="glass ring-soft rounded-2xl p-5 text-white/70">
            No trending coins found.
          </div>
        )}

        {/* ✅ LIST UI */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          {coins.map((c, i) => {
            const addr = String(c?.address || "").toLowerCase();
            const icon = pickCoinIcon(c);
            const fallback = addr ? identiconDataUri(addr) : "";

            return (
              <a
                key={`${c?.address || i}`}
                href={coinUrl(c)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition"
              >
                <AvatarClient icon={icon} fallback={fallback} />

                <div className="min-w-0 flex-1">
                  <div className="font-extrabold truncate">
                    {c?.name || "Coin"}{" "}
                    <span className="text-white/60 font-bold">({c?.symbol || "—"})</span>
                  </div>

                  <div className="text-sm text-white/60 truncate">{creatorLabel(c)}</div>
                </div>

                <div className="text-xs text-white/50 font-mono hidden sm:block">
                  {shortAddr(c?.address)}
                </div>
              </a>
            );
          })}
        </div>

        <div className="text-xs text-white/50">
          Source: Zora Coins SDK • getCoinsTopVolume24h() • Avatar uses Zora image if available; if missing/hotlink fails,
          it falls back to an identicon.
        </div>
      </div>
    </main>
  );
}

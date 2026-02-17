import { getProfile, getProfileCoins } from "@zoralabs/coins-sdk";

function toNum(v?: string | null) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function fmtCompact(n: number) {
  return Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

function isEthAddress(v: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(v);
}

function pickCoinAddr(c: any): string {
  const a = (
    c?.address ||
    c?.coinAddress ||
    c?.contractAddress ||
    c?.tokenAddress ||
    ""
  ).toString();
  return isEthAddress(a) ? a.toLowerCase() : "";
}

function chainSlugFromCoin(c: any): string {
  const chainId = Number(c?.chainId ?? c?.chain?.id ?? c?.chain?.chainId);
  if (chainId === 8453) return "base";

  const chainName = (c?.chain?.name || c?.chain || "").toString().toLowerCase();
  if (chainName.includes("base")) return "base";

  // Default: most Zora coins you’re viewing are Base
  return "base";
}

function zoraCoinUrlFromCoin(c: any): string {
  const url = (c?.url || c?.zoraUrl || "").toString();
  if (url.startsWith("http")) return url;

  const addr = pickCoinAddr(c);
  if (!addr) return "";

  const slug = chainSlugFromCoin(c);
  const coinId = `${slug}:${addr}`;
  return `https://zora.co/coin/${encodeURIComponent(coinId)}`;
}

// ✅ Zora “discover” endpoint for user coins (content/post coins)
async function getContentCoinsByWallet(wallet: string) {
  const w = wallet.toLowerCase();
  const url = `https://api.zora.co/discover/user/${encodeURIComponent(w)}/coins`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return null;

  try {
    return await res.json();
  } catch {
    return null;
  }
}

type SocialItem = { label: string; href: string };

function buildSocialLinks(profile: any): SocialItem[] {
  const s = profile?.socialAccounts || {};
  const out: SocialItem[] = [];

  // Website
  const website = (
    profile?.links?.website ||
    profile?.website ||
    profile?.links?.url ||
    ""
  ).toString();

  if (website) {
    const href = website.startsWith("http") ? website : `https://${website}`;
    out.push({ label: "Website", href });
  }

  // X / Twitter
  const xUser = (
    s?.twitter?.username ||
    s?.twitter?.handle ||
    s?.twitter?.name ||
    ""
  ).toString();

  if (xUser) out.push({ label: "X", href: `https://x.com/${xUser.replace(/^@/, "")}` });

  // Farcaster
  const fcUser = (s?.farcaster?.username || s?.farcaster?.handle || "").toString();
  if (fcUser) out.push({ label: "Farcaster", href: `https://warpcast.com/${fcUser.replace(/^@/, "")}` });

  // Instagram
  const igUser = (s?.instagram?.username || s?.instagram?.handle || "").toString();
  if (igUser) out.push({ label: "Instagram", href: `https://instagram.com/${igUser.replace(/^@/, "")}` });

  // TikTok
  const ttUser = (s?.tiktok?.username || s?.tiktok?.handle || "").toString();
  if (ttUser) out.push({ label: "TikTok", href: `https://www.tiktok.com/@${ttUser.replace(/^@/, "")}` });

  return out;
}

function zoraProfileUrl(profile: any, identifier: string): string {
  const handle = (profile?.handle || profile?.username || "").toString().trim();
  if (handle) return `https://zora.co/@${handle.replace(/^@/, "")}`;

  // fallback: if user typed @handle, keep it usable
  const raw = identifier.trim();
  if (raw.startsWith("@")) return `https://zora.co/${raw}`;

  return "";
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const identifier = decodeURIComponent(id);

  // 1) SDK profile + created coins
  const [profileRes, createdRes] = await Promise.all([
    getProfile({ identifier }),
    getProfileCoins({ identifier, count: 100 }),
  ]);

  const profile: any = profileRes?.data?.profile;

  const createdCoins: any[] =
    createdRes?.data?.profile?.createdCoins?.edges
      ?.map((e: any) => e?.node)
      ?.filter(Boolean) ?? [];

  const createdCount =
    createdRes?.data?.profile?.createdCoins?.count ?? createdCoins.length;

  // 2) Wallet address (needed for content coins endpoint)
  const wallet = (
    profile?.publicWallet?.walletAddress ||
    profile?.publicWallet?.address ||
    ""
  ).toString();

  // 3) Fetch content/post coins using wallet (if available)
  const contentRes =
    wallet && isEthAddress(wallet) ? await getContentCoinsByWallet(wallet) : null;

  const contentCoins: any[] =
    (contentRes?.data?.coins ?? contentRes?.coins ?? contentRes?.data ?? [])?.filter?.(Boolean) ?? [];

  // 4) Merge + dedupe by address
  const mergedMap = new Map<string, any>();
  for (const c of [...createdCoins, ...contentCoins]) {
    const addr = pickCoinAddr(c);
    if (!addr) continue;

    const prev = mergedMap.get(addr);
    if (!prev) mergedMap.set(addr, c);
    else {
      const prevScore =
        Object.keys(prev || {}).length +
        (prev?.name ? 2 : 0) +
        (prev?.symbol ? 2 : 0) +
        (prev?.marketCap ? 2 : 0) +
        (prev?.volume24h ? 2 : 0);

      const curScore =
        Object.keys(c || {}).length +
        (c?.name ? 2 : 0) +
        (c?.symbol ? 2 : 0) +
        (c?.marketCap ? 2 : 0) +
        (c?.volume24h ? 2 : 0);

      mergedMap.set(addr, curScore >= prevScore ? c : prev);
    }
  }

  const mergedCoins = Array.from(mergedMap.values());

  // Stats from merged coins
  const totalMarketCap = mergedCoins.reduce((a, c) => a + toNum(c.marketCap), 0);
  const totalVolume24h = mergedCoins.reduce((a, c) => a + toNum(c.volume24h), 0);
  const totalVolumeAll = mergedCoins.reduce((a, c) => a + toNum(c.totalVolume), 0);
  const totalHolders = mergedCoins.reduce(
    (a, c) => a + (Number(c.uniqueHolders) || Number(c.holders) || 0),
    0
  );

  const topByMarketCap = [...mergedCoins].sort((a, b) => toNum(b.marketCap) - toNum(a.marketCap))[0];
  const topByVol24h = [...mergedCoins].sort((a, b) => toNum(b.volume24h) - toNum(a.volume24h))[0];

  const socials = profile?.socialAccounts;
  const followers =
    (socials?.twitter?.followerCount ?? 0) +
    (socials?.farcaster?.followerCount ?? 0) +
    (socials?.instagram?.followerCount ?? 0) +
    (socials?.tiktok?.followerCount ?? 0);

  const listCoins = [...mergedCoins].sort((a, b) => toNum(b.marketCap) - toNum(a.marketCap));

  const socialLinks = buildSocialLinks(profile);
  const zoraProfile = zoraProfileUrl(profile, identifier);

  const topMcUrl = topByMarketCap ? zoraCoinUrlFromCoin(topByMarketCap) : "";
  const topVUrl = topByVol24h ? zoraCoinUrlFromCoin(topByVol24h) : "";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-white">
      {/* PROFILE */}
      <div className="flex items-center gap-4">
        {profile?.avatar?.medium ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar.medium}
            alt="avatar"
            className="h-14 w-14 rounded-full border border-white/10 object-cover"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-white/10" />
        )}

        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">
            {profile?.displayName || profile?.handle || identifier}
          </h1>

          <p className="text-white/60 text-sm truncate">@{profile?.handle || "unknown"}</p>

          <p className="text-white/40 text-xs break-all">
            {wallet && isEthAddress(wallet) ? wallet.toLowerCase() : ""}
          </p>

          {/* ✅ Buttons row: Zora Profile + Socials */}
          <div className="mt-3 flex flex-wrap gap-2">
            {zoraProfile ? (
              <a
                href={zoraProfile}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:border-white/25 hover:bg-white/15 transition"
              >
                View Zora Profile ↗
              </a>
            ) : null}

            {socialLinks.map((x) => (
              <a
                key={x.label}
                href={x.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/80 hover:text-white hover:border-white/25 transition"
              >
                {x.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {profile?.bio ? <p className="mt-4 text-white/70">{profile.bio}</p> : null}

      {/* CREATOR STATS */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Created Coins" value={fmtCompact(Number(createdCount || 0))} />
          <Stat label="Market Cap" value={`$${fmtCompact(totalMarketCap)}`} />
          <Stat label="24h Volume" value={`$${fmtCompact(totalVolume24h)}`} />
          <Stat label="Holders" value={fmtCompact(totalHolders)} />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <a
            href={topMcUrl || "#"}
            target={topMcUrl ? "_blank" : undefined}
            rel={topMcUrl ? "noreferrer" : undefined}
            className="rounded-xl border border-white/10 bg-black/20 p-4 hover:border-white/25 hover:bg-black/30 transition"
          >
            <p className="text-white/60 text-sm">Top Coin by Market Cap</p>
            <p className="text-white mt-1">
              {topByMarketCap ? `${topByMarketCap.name} (${topByMarketCap.symbol})` : "—"}
            </p>
            <p className="text-white/60 text-sm mt-1">
              {topByMarketCap ? `$${fmtCompact(toNum(topByMarketCap.marketCap))}` : ""}
            </p>
            {topMcUrl ? <p className="text-xs text-white/40 mt-2">Open on Zora ↗</p> : null}
          </a>

          <a
            href={topVUrl || "#"}
            target={topVUrl ? "_blank" : undefined}
            rel={topVUrl ? "noreferrer" : undefined}
            className="rounded-xl border border-white/10 bg-black/20 p-4 hover:border-white/25 hover:bg-black/30 transition"
          >
            <p className="text-white/60 text-sm">Top Coin by 24h Volume</p>
            <p className="text-white mt-1">
              {topByVol24h ? `${topByVol24h.name} (${topByVol24h.symbol})` : "—"}
            </p>
            <p className="text-white/60 text-sm mt-1">
              {topByVol24h ? `$${fmtCompact(toNum(topByVol24h.volume24h))}` : ""}
            </p>
            {topVUrl ? <p className="text-xs text-white/40 mt-2">Open on Zora ↗</p> : null}
          </a>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-sm text-white/70">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
            All-time Volume: ${fmtCompact(totalVolumeAll)}
          </span>

          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
            Followers: {fmtCompact(followers)}
          </span>

          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
            Coins counted (created + content): {fmtCompact(listCoins.length)}
          </span>
        </div>
      </div>

      {/* COINS LIST (clickable to Zora coin page) */}
      <div className="mt-8 grid gap-3">
        {listCoins.slice(0, 30).map((c: any) => {
          const addr = pickCoinAddr(c);
          const zoraUrl = zoraCoinUrlFromCoin(c);

          return (
            <a
              key={addr || c?.id || Math.random()}
              href={zoraUrl || "#"}
              target={zoraUrl ? "_blank" : undefined}
              rel={zoraUrl ? "noreferrer" : undefined}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-white/25 hover:bg-white/10 transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {c?.name || "Unknown"}{" "}
                    <span className="text-white/60">({c?.symbol || "—"})</span>
                  </p>
                  <p className="text-white/60 text-sm break-all">{addr || ""}</p>
                  {zoraUrl ? <p className="text-xs text-white/40 mt-1">Open on Zora ↗</p> : null}
                </div>

                <div className="text-right text-sm text-white/70 shrink-0">
                  <div>MC: ${fmtCompact(toNum(c?.marketCap))}</div>
                  <div>Vol 24h: ${fmtCompact(toNum(c?.volume24h))}</div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-white/60 text-sm">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}
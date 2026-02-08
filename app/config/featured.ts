export type FeaturedTier = "pinned" | "featured" | "boost";

export type FeaturedItem = {
  coinAddress: `0x${string}`; // Base coin contract address
  tier: FeaturedTier;
  label?: string;
  endsAt?: string; // ISO date string (optional)
};

export const FEATURED: FeaturedItem[] = [
  // ✅ Add coins here manually after payment
  // Example:
  // {
  //   coinAddress: "0x1234...abcd",
  //   tier: "pinned",
  //   label: "🔥 Staff Pick",
  //   endsAt: "2026-02-12T00:00:00.000Z",
  // },
];
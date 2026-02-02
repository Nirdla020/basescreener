export type SponsoredToken = {
  address: `0x${string}`;
  tagline?: string;
  website?: string;
};

export const SPONSORED: SponsoredToken[] = [
  {
    address: "0x7a773b71617d09770a43f457107850b0adaf89db",
    tagline: "Sponsored • Featured on BaseScreener",
    website: "https://basescreener.fun",
  },

  {
    address: "0x99e8839dc2068c1a6bdeaf0fe81039db3d3a0c4a",
    tagline: "Sponsored • Trending on Base",
    website: "https://basescreener.fun",
  },
];

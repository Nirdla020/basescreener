import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Redirect www -> non-www (recommended)
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.basescreener.fun" }],
        destination: "https://basescreener.fun/:path*",
        permanent: true,
      },

      // Force https on root domain (safety)
      {
        source: "/:path*",
        has: [{ type: "host", value: "basescreener.fun" }],
        destination: "https://basescreener.fun/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

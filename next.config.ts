import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // ONLY redirect www -> non-www (no https forcing here)
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.basescreener.fun" }],
        destination: "https://basescreener.fun/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

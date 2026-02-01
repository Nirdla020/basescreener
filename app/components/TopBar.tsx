"use client";

import Link from "next/link";

export default function TopBar() {
  return (
    <div className="w-full border-b border-white/10 bg-[#020617]">
      <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-between text-xs text-white/70">
        <span>
          🚀 Live: Base token analytics • Follow{" "}
          <a
            href="https://x.com/basescreenfun"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            @basescreenfun
          </a>
        </span>

        <Link href="/support" className="text-blue-400 hover:underline">
          Support → Leaderboard
        </Link>
      </div>
    </div>
  );
}

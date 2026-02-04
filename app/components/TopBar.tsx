"use client";

import Link from "next/link";

export default function TopBar() {
  return (
    <div className="w-full border-b border-white/10 bg-[#020617]">
      <div
        className="
          mx-auto max-w-6xl px-4 py-2
          flex flex-col gap-1
          sm:flex-row sm:items-center sm:justify-between
          text-xs text-white/70
        "
      >
        {/* Left text */}
        <span className="leading-relaxed text-center sm:text-left">
          🚀 Live: Base token analytics • Follow{" "}
          <a
            href="https://x.com/basescreenfun"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline break-all"
          >
            @basescreenfun
          </a>
        </span>

        {/* Right link */}
        <Link
          href="/support"
          className="
            text-blue-400 hover:underline
            text-center sm:text-right
            whitespace-nowrap
          "
        >
          Support → Leaderboard
        </Link>
      </div>
    </div>
  );
}

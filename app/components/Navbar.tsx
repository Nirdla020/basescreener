"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState("");

  // keep input synced with URL (so it doesn't reset)
  useEffect(() => {
    setQ(sp.get("q") || "");
  }, [sp]);

  function onSearch() {
    const query = q.trim();
    if (!query) return;

    // If you're on /token, send search to token page; otherwise send to dashboard
    if (pathname?.startsWith("/token")) {
      router.push(`/token?q=${encodeURIComponent(query)}`);
    } else {
      router.push(`/dashboard?q=${encodeURIComponent(query)}`);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020617]/85 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        {/* Brand */}
        <Link href="/" className="font-extrabold text-white tracking-tight">
          BaseScreener
        </Link>

        {/* Search */}
        <div className="flex-1">
          <div
            className="
              flex items-center gap-2
              rounded-2xl border border-white/15
              bg-white/10
              px-3 py-2
              shadow-[0_0_0_1px_rgba(255,255,255,0.04)]
              focus-within:shadow-[0_0_0_2px_rgba(59,130,246,0.35)]
              focus-within:border-blue-400/60
            "
          >
            <span className="text-white/70">🔎</span>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch();
              }}
              placeholder="Search token (symbol/name) or paste 0x address..."
              className="
                w-full bg-transparent outline-none
                text-white placeholder:text-white/55
                text-sm sm:text-base
              "
            />

            <button
              onClick={onSearch}
              className="
                px-4 py-2 rounded-xl
                bg-blue-600 text-white font-bold
                hover:bg-blue-500 transition
                shrink-0
              "
            >
              Search
            </button>
          </div>
        </div>

        {/* Nav buttons */}
        <nav className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className={`px-4 py-2 rounded-xl border border-white/10 transition ${
              pathname === "/dashboard"
                ? "bg-white text-[#020617] font-bold"
                : "bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            Dashboard
          </Link>

          <Link
            href="/token"
            className={`px-4 py-2 rounded-xl border border-white/10 transition ${
              pathname === "/token"
                ? "bg-white text-[#020617] font-bold"
                : "bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            Token
          </Link>
        </nav>
      </div>
    </header>
  );
}

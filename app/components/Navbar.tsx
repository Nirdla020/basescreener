"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function isAddress(a: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(a.trim());
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState("");

  // keep input synced with URL (so it doesn't reset)
  useEffect(() => {
    setQ(sp.get("q") || "");
  }, [sp]);

  const active = useMemo(() => {
    if (pathname?.startsWith("/dashboard")) return "dashboard";
    if (pathname?.startsWith("/token")) return "token";
    return "home";
  }, [pathname]);

  function onSearch() {
    const query = q.trim();
    if (!query) return;

    // ✅ If 0x address -> Token page
    if (isAddress(query)) {
      router.push(`/token?q=${encodeURIComponent(query)}`);
      return;
    }

    // ✅ Otherwise -> Dashboard filter
    router.push(`/dashboard?q=${encodeURIComponent(query)}`);
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
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSearch();
                }
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
              active === "dashboard"
                ? "bg-white text-[#020617] font-bold"
                : "bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            Dashboard
          </Link>

          <Link
            href="/token"
            className={`px-4 py-2 rounded-xl border border-white/10 transition ${
              active === "token"
                ? "bg-white text-[#020617] font-bold"
                : "bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            Token
          </Link>

          {/* ✅ Support Button */}
          <a
            href="#support"
            className="
              ml-1 px-4 py-2 rounded-xl
              bg-pink-600 text-white font-bold
              hover:bg-pink-500 transition
            "
          >
            ❤️ Support
          </a>
        </nav>
      </div>
    </header>
  );
}

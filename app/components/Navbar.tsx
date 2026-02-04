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
  const [open, setOpen] = useState(false);

  // keep input synced with URL (so it doesn't reset)
  // but don't fight the user while typing
  useEffect(() => {
    const urlQ = sp.get("q") || "";
    if (urlQ !== q) setQ(urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const active = useMemo(() => {
    if (pathname?.startsWith("/dashboard")) return "dashboard";
    if (pathname?.startsWith("/token")) return "token";
    if (pathname?.startsWith("/zora-new")) return "zora-new";
    if (pathname?.startsWith("/zora-trending")) return "zora-trending";
    if (pathname?.startsWith("/zora/coin")) return "zora-coin";
    return "home";
  }, [pathname]);

  function onSearch() {
    const query = q.trim();
    if (!query) return;

    // ✅ close mobile menu
    setOpen(false);

    // ✅ Address -> go to your dynamic route page
    if (isAddress(query)) {
      const addr = query.toLowerCase();

      // ✅ DEFAULT: go to Zora coin page
      router.push(`/zora/coin/${addr}`);

      // If you want Dex token page instead, use this line:
      // router.push(`/token/${addr}`);

      return;
    }

    // ✅ Text -> dashboard filter
    router.push(`/dashboard?q=${encodeURIComponent(query)}`);
  }

  // ✅ Scroll to Support section
  function goSupport() {
    const el = document.getElementById("support");
    if (!el) return;
    setOpen(false);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Small helper for consistent nav button styling
  function navBtn(isActive: boolean) {
    return `px-4 py-2 rounded-xl border border-white/10 transition ${
      isActive ? "bg-white text-[#020617] font-bold" : "bg-white/5 text-white/80 hover:bg-white/10"
    }`;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020617]/85 backdrop-blur">
      <div className="page-container py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="font-extrabold text-white tracking-tight shrink-0">
            BaseScreener
          </Link>

          {/* Desktop search */}
          <div className="hidden md:block flex-1 min-w-0">
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
                  w-full min-w-0 bg-transparent outline-none
                  text-white placeholder:text-white/55
                  text-sm md:text-base
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

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2 shrink-0">
            <Link href="/dashboard" className={navBtn(active === "dashboard")}>
              Dashboard
            </Link>

            <Link href="/token" className={navBtn(active === "token")}>
              Token
            </Link>

            {/* ✅ Zora pages */}
            <Link href="/zora-new" className={navBtn(active === "zora-new")}>
              🆕 Zora New
            </Link>

            <Link href="/zora-trending" className={navBtn(active === "zora-trending")}>
              🔥 Zora Trending
            </Link>

            <a
              href="https://x.com/basescreenfun"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl border border-white/10 transition bg-white/5 text-white/80 hover:bg-white/10"
              title="Follow @basescreenfun on X"
            >
              𝕏 Follow
            </a>

            <button
              onClick={goSupport}
              className="ml-1 px-4 py-2 rounded-xl bg-pink-600 text-white font-bold hover:bg-pink-500 transition"
            >
              ❤️ Support
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden ml-auto shrink-0 inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/90 hover:bg-white/10 transition"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <span className="text-lg leading-none">{open ? "✕" : "☰"}</span>
          </button>
        </div>

        {/* Mobile search */}
        <div className="md:hidden mt-3">
          <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
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
              placeholder="Search token or paste 0x..."
              className="w-full min-w-0 bg-transparent outline-none text-white placeholder:text-white/55 text-sm"
            />
            <button
              onClick={onSearch}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition shrink-0 text-sm"
            >
              Go
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div className={`${open ? "block" : "hidden"} md:hidden mt-3`}>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="grid grid-cols-2 gap-2">
              <Link href="/dashboard" className={navBtn(active === "dashboard") + " text-center"}>
                Dashboard
              </Link>

              <Link href="/token" className={navBtn(active === "token") + " text-center"}>
                Token
              </Link>

              {/* ✅ Zora pages (mobile) */}
              <Link href="/zora-new" className={navBtn(active === "zora-new") + " text-center"}>
                🆕 Zora New
              </Link>

              <Link
                href="/zora-trending"
                className={navBtn(active === "zora-trending") + " text-center"}
              >
                🔥 Zora Trending
              </Link>

              <a
                href="https://x.com/basescreenfun"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl border border-white/10 transition bg-white/5 text-white/80 hover:bg-white/10 text-center"
              >
                𝕏 Follow
              </a>

              <button
                onClick={goSupport}
                className="px-4 py-2 rounded-xl bg-pink-600 text-white font-bold hover:bg-pink-500 transition"
              >
                ❤️ Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

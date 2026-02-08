"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

/* ---------------- Utils ---------------- */

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

// ✅ More robust: also accepts "0x1234...abcd" style
function extractAddress(input: string) {
  const cleaned = safeDecode(String(input || ""))
    .trim()
    .replace(/\s+/g, "")
    .replace(/\.+/g, "") // remove "..."
    .replace(/\/+$/, "");

  const m = cleaned.match(/0x[a-fA-F0-9]{40}/);
  return m ? m[0].toLowerCase() : "";
}

function isAddress(a: string) {
  return /^0x[a-f0-9]{40}$/.test(a);
}

/* ---------------- Recent searches ---------------- */

const RECENTS_KEY = "basescreener_recents_v1";

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveRecent(addr: string) {
  try {
    const cur = loadRecents();
    const next = [addr, ...cur.filter((x) => x !== addr)].slice(0, 8);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [openRecents, setOpenRecents] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ✅ ONLY sync search input from URL on dashboard
  useEffect(() => {
    if (!pathname?.startsWith("/dashboard")) return;
    const fromUrl = sp.get("q") || "";
    setQ((prev) => (prev === fromUrl ? prev : fromUrl));
  }, [pathname, sp]);

  useEffect(() => {
    setRecents(loadRecents());
  }, []);

  // close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setOpenRecents(false);
  }, [pathname]);

  const hasRecents = useMemo(() => recents.length > 0, [recents]);

  function goToToken(addr: string) {
    const a = addr.toLowerCase();
    if (!isAddress(a)) return;

    saveRecent(a);
    setRecents(loadRecents());
    setMobileOpen(false);
    setOpenRecents(false);
    setQ("");

    router.push(`/token/${a}`);
  }

  function onSearch() {
    const query = q.trim();
    if (!query) return;

    const addr = extractAddress(query);

    // ✅ If an address exists in the input/URL, go DIRECTLY to /token/[address]
    if (addr) {
      goToToken(addr);
      return;
    }

    // ✅ Otherwise treat as dashboard text search (symbol/name/etc)
    setMobileOpen(false);
    setOpenRecents(false);
    router.push(`/dashboard?q=${encodeURIComponent(query)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch();
    }
    if (e.key === "Escape") {
      setMobileOpen(false);
      setOpenRecents(false);
    }
  }

  function clearRecents() {
    try {
      localStorage.removeItem(RECENTS_KEY);
    } catch {}
    setRecents([]);
  }

  function navBtn(active?: boolean) {
    return `rounded-2xl border border-white/10 px-4 py-2 text-sm transition ${
      active
        ? "bg-white text-[#020617] font-bold"
        : "bg-white/5 text-white/90 hover:bg-white/10"
    }`;
  }

  const active = useMemo(() => {
    if (pathname?.startsWith("/dashboard")) return "dashboard";
    if (pathname?.startsWith("/token")) return "token";
    if (pathname?.startsWith("/create")) return "create";
    if (pathname?.startsWith("/zora-new")) return "zora-new";
    if (pathname?.startsWith("/zora-trending")) return "zora-trending";
    return "home";
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020617]/85 backdrop-blur">
      <div className="mx-auto max-w-6xl px-3 py-3">
        {/* Row 1: brand + actions + burger */}
        <div className="flex items-center gap-2">
          <Link href="/" className="font-extrabold text-white shrink-0">
            BaseScreener
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {/* ✅ Create button */}
            <Link
              href="/create"
              className="hidden sm:inline-flex rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 transition whitespace-nowrap"
            >
              ➕ Create
            </Link>

            {/* ✅ Wallet connect */}
            <div className="hidden sm:block">
              <ConnectButton
                accountStatus="address"
                chainStatus="icon"
                showBalance={false}
              />
            </div>

            <Link
              href="/support"
              className="rounded-2xl bg-pink-600 hover:bg-pink-500 px-3 py-2 text-sm font-semibold text-white whitespace-nowrap"
            >
              💗 Support
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white/90 hover:bg-white/10 transition"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <span className="text-lg leading-none">{mobileOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search (always full width on mobile) */}
        <div className="mt-3">
          <div className="relative">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-white/50 text-sm">🔎</span>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setOpenRecents(true)}
                onBlur={() => setTimeout(() => setOpenRecents(false), 140)}
                onKeyDown={onKeyDown}
                placeholder="Paste 0x address or BaseScan/Dex link…"
                className="w-full min-w-0 bg-transparent outline-none text-white placeholder:text-white/40 text-sm"
              />

              <button
                onClick={onSearch}
                className="shrink-0 rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white"
                type="button"
              >
                Search
              </button>
            </div>

            {/* Recents dropdown */}
            {openRecents && hasRecents && (
              <div className="absolute mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1220] shadow-xl overflow-hidden z-50">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                  <p className="text-xs text-white/60">Recent token searches</p>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={clearRecents}
                    className="text-xs text-white/60 hover:text-white"
                    type="button"
                  >
                    Clear
                  </button>
                </div>

                <div className="max-h-64 overflow-auto">
                  {recents.map((addr) => (
                    <button
                      key={addr}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goToToken(addr)}
                      className="w-full text-left px-3 py-2 hover:bg-white/5"
                      type="button"
                    >
                      <div className="text-sm text-white break-all">{addr}</div>
                      <div className="text-xs text-white/50">Open token page</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2 mt-3">
          <Link href="/dashboard" className={navBtn(active === "dashboard")}>
            Dashboard
          </Link>
          <Link href="/token" className={navBtn(active === "token")}>
            Token
          </Link>
          <Link href="/create" className={navBtn(active === "create")}>
            ➕ Create
          </Link>
          <Link href="/zora-new" className={navBtn(active === "zora-new")}>
            🆕 Zora New
          </Link>
          <Link href="/zora-trending" className={navBtn(active === "zora-trending")}>
            🔥 Zora Trending
          </Link>
        </nav>

        {/* Mobile nav (dropdown grid) */}
        {mobileOpen && (
          <nav className="md:hidden mt-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-3">
              {/* Mobile Create + Connect */}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/create"
                  className={`${navBtn(active === "create")} text-center`}
                  onClick={() => setMobileOpen(false)}
                >
                  ➕ Create
                </Link>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 flex items-center justify-center">
                  <ConnectButton
                    accountStatus="address"
                    chainStatus="icon"
                    showBalance={false}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard"
                  className={`${navBtn(active === "dashboard")} text-center`}
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/token"
                  className={`${navBtn(active === "token")} text-center`}
                  onClick={() => setMobileOpen(false)}
                >
                  Token
                </Link>
                <Link
                  href="/zora-new"
                  className={`${navBtn(active === "zora-new")} text-center`}
                  onClick={() => setMobileOpen(false)}
                >
                  🆕 Zora New
                </Link>
                <Link
                  href="/zora-trending"
                  className={`${navBtn(active === "zora-trending")} text-center`}
                  onClick={() => setMobileOpen(false)}
                >
                  🔥 Zora Trending
                </Link>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
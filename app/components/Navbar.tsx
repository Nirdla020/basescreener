"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function isAddress(a: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(a.trim());
}

export default function Navbar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = q.trim();
    if (!value) return;

    if (isAddress(value)) {
      router.push(`/token?address=${encodeURIComponent(value)}`);
      return;
    }

    // text search → dashboard filter
    router.push(`/dashboard?q=${encodeURIComponent(value)}`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020617]/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <Link href="/" className="font-extrabold tracking-tight">
          BaseScreener
        </Link>

        <form onSubmit={onSubmit} className="flex-1">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-white/60 text-sm">🔎</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search token (symbol/name) or paste 0x address…"
              className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/40"
            />
            <button
              type="submit"
              className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 text-sm font-bold hover:bg-blue-500 transition"
            >
              Search
            </button>
          </div>
        </form>

        <nav className="hidden sm:flex items-center gap-2">
          <Link
            href="/dashboard"
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm font-bold"
          >
            Dashboard
          </Link>
          <Link
            href="/token"
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm font-bold"
          >
            Token
          </Link>
        </nav>
      </div>
    </header>
  );
}

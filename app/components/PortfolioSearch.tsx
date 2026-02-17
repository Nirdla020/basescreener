"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function isEthAddress(v: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(v);
}

function cleanInput(v: string) {
  return v.trim();
}

export default function PortfolioSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const normalized = useMemo(() => cleanInput(q), [q]);
  const canSearch = normalized.length >= 3; // allow usernames; wallet will pass too

  function go() {
    const v = cleanInput(q);
    if (!v) return;

    // ✅ If it’s a wallet address, normalize to lowercase
    const slug = isEthAddress(v) ? v.toLowerCase() : v;

    router.push(`/portfolio/${encodeURIComponent(slug)}`);
  }

  return (
    <div className="w-full bg-black">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-white/60 mb-3">
          Or search a user or wallet to view their public portfolio.
        </p>

        <div className="flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSearch) go();
            }}
            placeholder="Search by username or wallet address..."
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-white/30"
          />

          <button
            onClick={go}
            disabled={!canSearch}
            className="rounded-xl px-5 py-3 font-medium text-black bg-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
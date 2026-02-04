"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

function isAddress(a: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(a.trim());
}

export default function SearchBar() {
  const [q, setQ] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  function go() {
    const value = q.trim();
    if (!value) return;

    // ✅ If user pasted a contract address → go to token page
    if (isAddress(value)) {
      // If you want Zora coin page by default:
      // router.push(`/zora/coin/${value.toLowerCase()}`);

      // If you want Dex token page by default:
      router.push(`/token/${value.toLowerCase()}`);
      return;
    }

    // ✅ If not address, treat as search query (symbol/name)
    // You can redirect to dashboard search filter
    router.push(`/dashboard?q=${encodeURIComponent(value)}`);

    // optional: if already on dashboard, just update query
    // (router.push is fine either way)
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-3 py-2">
      <div className="text-white/60">🔎</div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search token / paste address…"
        className="w-[220px] sm:w-[320px] bg-transparent outline-none text-white placeholder:text-white/40"
        onKeyDown={(e) => {
          if (e.key === "Enter") go();
        }}
      />

      <button
        onClick={go}
        className="px-4 py-2 rounded-xl bg-blue-600 font-bold hover:bg-blue-500 transition"
      >
        Search
      </button>
    </div>
  );
}

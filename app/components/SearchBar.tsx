"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function extractAddress(input: string) {
  let s = String(input || "");

  // decode URL encoding safely
  try {
    s = decodeURIComponent(s);
  } catch {}

  // remove whitespace everywhere
  s = s.trim().replace(/\s+/g, "");

  // extract 0x..40hex from ANY string (URL, base:0x..., etc.)
  const m = s.match(/0x[a-fA-F0-9]{40}/);
  return m ? m[0].toLowerCase() : null;
}

export default function SearchBar() {
  const [q, setQ] = useState("");
  const router = useRouter();

  function go() {
    if (!q) return;

    const addr = extractAddress(q);

    // ✅ if it contains an address → go to token detail
    if (addr) {
      router.push(`/token/${addr}`);
      return;
    }

    // ✅ otherwise do text search
    router.push(`/dashboard?q=${encodeURIComponent(q.trim())}`);
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

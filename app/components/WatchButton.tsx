"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  address: string;
  name?: string;
  symbol?: string;
};

const KEY = "watchlist_zora";

function readList(): string[] {
  try {
    const raw = localStorage.getItem(KEY) || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeList(list: string[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export default function WatchButton({ address, name, symbol }: Props) {
  const addr = (address || "").toLowerCase();
  const [list, setList] = useState<string[]>([]);
  const isSaved = useMemo(() => list.includes(addr), [list, addr]);

  useEffect(() => {
    setList(readList());
  }, []);

  function toggle() {
    const cur = readList();
    const next = cur.includes(addr) ? cur.filter((x) => x !== addr) : [addr, ...cur];
    writeList(next);
    setList(next);
  }

  return (
    <button
      onClick={toggle}
      className={`px-4 py-2 rounded-xl border border-white/10 transition font-bold ${
        isSaved ? "bg-yellow-400/15 text-yellow-200 hover:bg-yellow-400/20" : "bg-white/10 hover:bg-white/15"
      }`}
      title={isSaved ? "Remove from watchlist" : "Add to watchlist"}
      type="button"
    >
      {isSaved ? "★ Saved" : "☆ Save"}
      <span className="ml-2 text-xs opacity-70">
        {symbol ? symbol : name ? name : ""}
      </span>
    </button>
  );
}

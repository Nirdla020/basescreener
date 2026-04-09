"use client";

import { useMemo, useState } from "react";
import type { FeaturedItem } from "@/lib/featuredStore";

function isAddr(a?: string) {
  return !!a && /^0x[a-fA-F0-9]{40}$/.test(String(a || "").trim());
}
function shortAddr(a?: string) {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
function fmt(ts?: string) {
  if (!ts) return "—";
  const d = new Date(ts);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export default function FeaturedAdminClient({
  initialItems,
}: {
  initialItems: FeaturedItem[];
}) {
  const [items, setItems] = useState<FeaturedItem[]>(initialItems || []);
  const [msg, setMsg] = useState("");

  // form
  const [address, setAddress] = useState("");
  const [title, setTitle] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [days, setDays] = useState(1);
  const [weight, setWeight] = useState(0);
  const [promoted, setPromoted] = useState(true);

  const canSubmit = useMemo(() => {
    return isAddr(address) && days >= 1 && days <= 30;
  }, [address, days]);

  async function refresh() {
    const r = await fetch("/api/admin/featured/list", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok && Array.isArray(j.items)) setItems(j.items);
  }

  async function addFeatured() {
    try {
      setMsg("");
      if (!canSubmit) return setMsg("Invalid form.");

      const r = await fetch("/api/admin/featured/manual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 8453,
          address: address.trim(),
          title: title.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
          days,
          weight,
          promoted,
        }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j?.error || "Failed to add featured");

      setMsg("✅ Added / updated featured!");
      setAddress("");
      setTitle("");
      setLogoUrl("");
      setDays(1);
      setWeight(0);
      setPromoted(true);

      await refresh();
    } catch {
      setMsg("Network error");
    }
  }

  async function removeFeatured(address: string) {
    try {
      setMsg("");
      const r = await fetch("/api/admin/featured/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chainId: 8453, address }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j?.error || "Remove failed");
      setMsg("✅ Removed");
      await refresh();
    } catch {
      setMsg("Network error");
    }
  }

  return (
    <div className="grid gap-6">
      {/* Manual add form */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="text-lg font-bold mb-3">Manual Add Featured</div>

        <div className="grid gap-3">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Token address (0x...)"
            className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white"
          />
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="Logo URL (optional)"
            className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white"
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-white/70">
              Days (1–30)
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(Number(e.target.value || 1))}
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white"
              />
            </label>

            <label className="text-sm text-white/70">
              Weight (priority)
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value || 0))}
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={promoted}
              onChange={(e) => setPromoted(e.target.checked)}
            />
            promoted
          </label>

          <button
            onClick={addFeatured}
            disabled={!canSubmit}
            className="rounded-xl bg-blue-600 py-2 font-bold hover:bg-blue-500 disabled:opacity-60"
          >
            Add / Update Featured
          </button>

          {msg && <div className="text-xs text-white/70 text-center">{msg}</div>}
        </div>
      </div>

      {/* Current featured list */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-sm text-white/70">
          Active Featured: <b>{items.length}</b>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="p-3 text-left">Token</th>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Expires</th>
                <th className="p-3 text-left">Weight</th>
                <th className="p-3 text-left">Promoted</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.address} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3">{shortAddr(it.address)}</td>
                  <td className="p-3">{it.title || "—"}</td>
                  <td className="p-3">{fmt(it.expiresAt)}</td>
                  <td className="p-3">{it.weight ?? 0}</td>
                  <td className="p-3">{it.promoted ? "✅" : "—"}</td>
                  <td className="p-3">
                    <button
                      onClick={() => removeFeatured(it.address)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 hover:bg-white/10"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-white/60">
                    No featured items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
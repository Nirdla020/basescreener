"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";

type FeaturedToken = {
  chainId: number;
  address: string;
  title?: string;
  note?: string;
  weight?: number;
  expiresAt?: string;
  promoted?: boolean;
  createdAt?: string;
};

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<FeaturedToken[]>([]);
  const [msg, setMsg] = useState("");

  // form
  const [tokenAddr, setTokenAddr] = useState("");
  const [title, setTitle] = useState("");
  const [weight, setWeight] = useState("10");
  const [promoted, setPromoted] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  async function refresh() {
    const res = await fetch("/api/admin/featured");

    if (!res.ok) {
      setAuthed(false);
      return;
    }

    const json = await res.json();
    setItems(json.items || []);
    setAuthed(true);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login() {
    try {
      if (!isConnected || !address) {
        return setMsg("Connect your admin wallet first.");
      }

      setMsg("Requesting nonce...");

      const n = await fetch("/api/admin/nonce").then((r) => r.json());

      const message = `BaseScreener Admin Login\nNonce: ${n.nonce}`;

      setMsg("Sign message...");

      const signature = await signMessageAsync({ message });

      setMsg("Verifying...");

      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        return setMsg(json?.error || "Login failed.");
      }

      setMsg("Logged in ✅");

      await refresh();
    } catch (e: any) {
      setMsg(e?.message || "Login failed.");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });

    setAuthed(false);
    setItems([]);
    setMsg("Logged out.");
  }

  async function addFeatured() {
    setMsg("");

    const res = await fetch("/api/admin/featured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chainId: 8453,
        address: tokenAddr,
        title,
        weight: Number(weight || 0),
        promoted,
        expiresAt: expiresAt || undefined,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return setMsg(json?.error || "Save failed.");
    }

    setTokenAddr("");
    setTitle("");
    setExpiresAt("");

    setMsg("Saved ✅");

    await refresh();
  }

  async function removeFeatured(addr: string) {
    const res = await fetch(
      `/api/admin/featured?address=${encodeURIComponent(addr)}`,
      { method: "DELETE" }
    );

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return setMsg(json?.error || "Remove failed.");
    }

    setMsg("Removed ✅");

    await refresh();
  }

  const sorted = useMemo(() => {
    return [...items].sort(
      (a, b) => Number(b.weight || 0) - Number(a.weight || 0)
    );
  }, [items]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-bold">Admin Dashboard</div>
            <div className="text-xs text-white/60">
              Featured & Analytics Manager
            </div>
          </div>

          {!authed ? (
            <button
              onClick={login}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500"
            >
              Login (Sign)
            </button>
          ) : (
            <button
              onClick={logout}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm hover:bg-black/50"
            >
              Logout
            </button>
          )}
        </div>

        {msg && <div className="mt-3 text-xs text-white/70">{msg}</div>}

        {!authed ? (
          <div className="mt-4 text-sm text-white/70">
            Connect your admin wallet and click <b>Login</b>.
          </div>
        ) : (
          <>
            {/* Add featured */}
            <div className="mt-6 grid gap-3">
              <div className="text-sm font-bold">Add / Update Featured</div>

              <input
                value={tokenAddr}
                onChange={(e) => setTokenAddr(e.target.value)}
                placeholder="Token address (0x...)"
                className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white"
              />

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Weight"
                  className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white"
                />

                <input
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  placeholder="ExpiresAt (YYYY-MM-DD)"
                  className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={promoted}
                  onChange={(e) => setPromoted(e.target.checked)}
                />
                Paid promotion
              </label>

              <button
                onClick={addFeatured}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500"
              >
                Save
              </button>
            </div>

            {/* List */}
            <div className="mt-8">
              <div className="text-sm font-bold">Current Featured</div>

              <div className="mt-3 grid gap-2">
                {sorted.map((t) => (
                  <div
                    key={t.address}
                    className="rounded-xl border border-white/10 bg-black/30 p-3 flex justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {t.title || t.address}

                        {t.promoted && (
                          <span className="ml-2 text-[11px] bg-blue-600/30 px-2 py-0.5 rounded">
                            Promoted
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-white/60 break-all">
                        {t.address} • weight {t.weight ?? 0}
                      </div>
                    </div>

                    <button
                      onClick={() => removeFeatured(t.address)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {sorted.length === 0 && (
                  <div className="text-sm text-white/60">
                    No featured tokens yet.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
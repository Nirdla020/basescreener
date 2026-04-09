"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PaymentEvent = {
  ts: string;
  tokenAddress: string;
  title?: string;
  days: number;
  usd: number;
  ethUsd: number;
  amountWei: string;
  txHash: string;
  payer?: string;
};

type RevenueResponse = {
  totalUsd: number;
  count: number;
  payments: PaymentEvent[];
};

export default function RevenuePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [msg, setMsg] = useState("");

  async function checkAuth() {
    try {
      const r = await fetch("/api/admin/me", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      setAuthed(!!j?.loggedIn);
      return !!j?.loggedIn;
    } catch {
      setAuthed(false);
      return false;
    }
  }

  async function loadRevenue() {
    setMsg("Loading...");
    setData(null);

    const ok = await checkAuth();
    if (!ok) {
      setMsg("Not logged in as admin.");
      return;
    }

    try {
      const r = await fetch("/api/admin/revenue", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(j?.error || "Failed to load revenue.");
        return;
      }
      setData(j as RevenueResponse);
      setMsg("");
    } catch {
      setMsg("Network error.");
    }
  }

  useEffect(() => {
    loadRevenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-bold">Revenue Dashboard</div>
            <div className="mt-1 text-sm text-white/60">Paid promotions</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadRevenue}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              type="button"
            >
              Refresh
            </button>

            <Link
              href="/admin"
              className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-500"
            >
              Admin
            </Link>
          </div>
        </div>

        {authed === false && (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm font-semibold">Admin access required</div>
            <div className="mt-1 text-sm text-white/70">
              Please login with your admin wallet.
            </div>
            <Link
              href="/admin"
              className="mt-3 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
            >
              Go to Admin Login
            </Link>
          </div>
        )}

        {msg && <div className="mt-4 text-sm text-white/70">{msg}</div>}

        {data && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/60">Total Revenue (USD)</div>
                <div className="text-2xl font-extrabold">${data.totalUsd.toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/60">Total Payments</div>
                <div className="text-2xl font-extrabold">{data.count}</div>
              </div>
            </div>

            <div className="mt-6 overflow-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-white/70">
                  <tr>
                    <th className="p-3 text-left">Time</th>
                    <th className="p-3 text-left">Token</th>
                    <th className="p-3 text-left">Days</th>
                    <th className="p-3 text-left">USD</th>
                    <th className="p-3 text-left">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.txHash} className="border-t border-white/10">
                      <td className="p-3 text-white/70">
                        {new Date(p.ts).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold">{p.title || "—"}</div>
                        <div className="text-xs text-white/50 break-all">
                          {p.tokenAddress}
                        </div>
                      </td>
                      <td className="p-3 text-white/70">{p.days}</td>
                      <td className="p-3 text-white/70">
                        ${Number(p.usd || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-xs text-white/50 break-all">{p.txHash}</td>
                    </tr>
                  ))}

                  {data.payments.length === 0 && (
                    <tr className="border-t border-white/10">
                      <td className="p-3 text-white/60" colSpan={5}>
                        No payments yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useSendTransaction, useChainId } from "wagmi";
import { base } from "viem/chains";

type Quote = {
  days: number;
  usd: number;
  ethUsd: number;
  amountWei: string;
  payTo: string;
};

function isAddr(a?: string) {
  return !!a && /^0x[a-fA-F0-9]{40}$/.test(a);
}

function shortAddr(a?: string) {
  if (!a) return "—";
  const s = a.toLowerCase();
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function fmtEth(wei?: string) {
  if (!wei) return "—";
  try {
    const eth = Number(BigInt(wei)) / 1e18;
    if (!Number.isFinite(eth)) return "—";
    return eth.toFixed(6);
  } catch {
    return "—";
  }
}

export default function FeaturedPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [token, setToken] = useState("");
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<1 | 2 | 3>(1);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [msg, setMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  const priceLabel = useMemo(() => {
    if (days === 1) return "$50 / 1 day";
    if (days === 2) return "$90 / 2 days";
    return "$120 / 3 days";
  }, [days]);

  /* ---------------- Quote ---------------- */

  async function loadQuote(d: 1 | 2 | 3) {
    try {
      setMsg("Getting price...");
      setQuote(null);

      const r = await fetch(`/api/featured/quote?days=${d}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setMsg(j?.error || "Failed to load price");
        return;
      }

      setQuote(j as Quote);
      setMsg("");
    } catch {
      setMsg("Network error");
    }
  }

  useEffect(() => {
    loadQuote(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  /* ---------------- Confirm ---------------- */

  async function confirm(h: string) {
    try {
      const hash = (h || "").trim();
      if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
        setMsg("Invalid tx hash.");
        return;
      }

      const r = await fetch("/api/featured/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenAddress: token.trim(),
          title: title.trim() || undefined,
          days,
          txHash: hash,
          minWei: quote?.amountWei,
        }),
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setMsg(j?.error || "Confirmation failed.");
        return;
      }

      setMsg("✅ Featured activated!");
      setToken("");
      setTitle("");
      setTxHash("");
      setQuote(null);

      loadQuote(days);
    } catch {
      setMsg("Confirm failed.");
    }
  }

  /* ---------------- Pay ---------------- */

  async function pay() {
    try {
      setMsg("");

      if (!isConnected || !address) return setMsg("Connect wallet first.");
      if (chainId !== base.id) return setMsg("Switch to Base network.");
      if (!isAddr(token.trim())) return setMsg("Invalid token address.");
      if (!quote?.payTo || !quote?.amountWei) return setMsg("Quote not ready.");

      setMsg("Sending payment...");

      const hash = await sendTransactionAsync({
        to: quote.payTo as `0x${string}`,
        value: BigInt(quote.amountWei),
      });

      setTxHash(hash);
      setMsg("Confirming onchain...");

      await confirm(hash);
    } catch (e: any) {
      setMsg(e?.shortMessage || e?.message || "Payment failed.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-bold">Promote Your Token 🚀</div>
            <div className="mt-1 text-sm text-white/60">
              Get featured on BaseScreener (paid promotion)
            </div>
          </div>

          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Back
          </Link>
        </div>

        {/* Pricing */}
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold">Pricing</div>
          <div className="mt-1 text-xs text-white/60">
            1 day = $50 • 2 days = $90 • 3 days = $120
          </div>

          <div className="mt-3 text-xs text-white/60">
            Network:{" "}
            <span className="font-semibold">
              {chainId === base.id ? "Base ✅" : "Not Base ❌"}
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="mt-6 grid gap-3">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token address (0x...)"
            className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white"
          />

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white"
          />

          {/* Days */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d as 1 | 2 | 3)}
                className={`rounded-xl py-2 text-sm border border-white/10 ${
                  days === d
                    ? "bg-blue-600 font-bold"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                {d} Day{d > 1 ? "s" : ""}
              </button>
            ))}
          </div>

          <div className="text-xs text-white/70">
            Selected: <b>{priceLabel}</b>
          </div>

          {/* Quote */}
          {quote && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <div>
                  Pay to: <b>{shortAddr(quote.payTo)}</b>
                </div>
                <div>
                  Amount: <b>{fmtEth(quote.amountWei)} ETH</b>
                </div>
                <div>
                  ETH/USD:{" "}
                  <b>${Number(quote.ethUsd || 0).toFixed(2)}</b>
                </div>
              </div>

              <div className="mt-2 break-all text-[11px] text-white/60">
                Full address: {quote.payTo}
              </div>
            </div>
          )}

          {/* Pay */}
          <button
            onClick={pay}
            disabled={!quote || isPending}
            className="rounded-xl bg-blue-600 py-2 font-bold hover:bg-blue-500 disabled:opacity-60"
          >
            {isPending ? "Sending..." : "Pay & Promote"}
          </button>

          {/* Manual confirm */}
          <div className="mt-2 grid gap-2">
            <input
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="Paste tx hash (if needed)"
              className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-white"
            />

            <button
              onClick={() => confirm(txHash)}
              disabled={!txHash || !quote}
              className="rounded-xl border border-white/10 bg-white/5 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
            >
              Confirm Tx
            </button>
          </div>

          {/* Status */}
          {msg && <div className="text-xs text-white/70 text-center">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
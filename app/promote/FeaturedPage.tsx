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

  const canPay =
    isConnected &&
    !!address &&
    chainId === base.id &&
    isAddr(token.trim()) &&
    !!quote?.payTo &&
    !!quote?.amountWei;

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

      setMsg("✅ Featured activated! It may take a moment to appear on the homepage.");
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
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-5 sm:p-7 shadow-lg backdrop-blur">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl sm:text-2xl font-extrabold">Promote Your Token 🚀</div>
            <div className="mt-1 text-sm text-white/60">
              Get featured on BaseScreener (paid promotion)
            </div>
          </div>

          <Link
            href="/"
            className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Back
          </Link>
        </div>

        {/* Status chips */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span
            className={[
              "rounded-full border px-3 py-1.5",
              isConnected ? "border-green-400/20 bg-green-500/10 text-green-200" : "border-white/10 bg-white/5 text-white/70",
            ].join(" ")}
          >
            {isConnected ? "Wallet connected" : "Connect wallet"}
          </span>

          <span
            className={[
              "rounded-full border px-3 py-1.5",
              chainId === base.id ? "border-blue-300/20 bg-blue-500/10 text-blue-200" : "border-red-400/20 bg-red-500/10 text-red-200",
            ].join(" ")}
          >
            {chainId === base.id ? "Base network" : "Switch to Base"}
          </span>

          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/70">
            Pricing: {priceLabel}
          </span>
        </div>

        {/* Pricing box */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold">Pricing</div>
          <div className="mt-1 text-xs text-white/60">
            1 day = $50 • 2 days = $90 • 3 days = $120
          </div>

          {quote ? (
            <div className="mt-3 grid gap-1 text-xs text-white/70">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <div>
                  Pay to: <b>{shortAddr(quote.payTo)}</b>
                </div>
                <div>
                  Amount: <b>{fmtEth(quote.amountWei)} ETH</b>
                </div>
                <div>
                  ETH/USD: <b>${Number(quote.ethUsd || 0).toFixed(2)}</b>
                </div>
              </div>
              <div className="break-all text-[11px] text-white/55">Full address: {quote.payTo}</div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-white/60">Loading quote…</div>
          )}
        </div>

        {/* Form */}
        <div className="mt-6 grid gap-3">
          <div>
            <div className="mb-1 text-xs font-semibold text-white/70">Token Address</div>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/20"
            />
            {!token.trim() ? null : !isAddr(token.trim()) ? (
              <div className="mt-1 text-[11px] text-red-200/80">Enter a valid 0x address.</div>
            ) : null}
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-white/70">Title (optional)</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Shown as a label (optional)"
              className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/20"
            />
          </div>

          {/* Days selector */}
          <div>
            <div className="mb-2 text-xs font-semibold text-white/70">Duration</div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d as 1 | 2 | 3)}
                  className={[
                    "rounded-xl py-2 text-sm border border-white/10 font-bold transition",
                    days === d ? "bg-blue-600 hover:bg-blue-500" : "bg-white/5 hover:bg-white/10",
                  ].join(" ")}
                >
                  {d} Day{d > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Pay */}
          <button
            onClick={pay}
            disabled={!quote || isPending || !canPay}
            className="rounded-xl bg-blue-600 py-2.5 font-extrabold hover:bg-blue-500 disabled:opacity-60"
          >
            {isPending ? "Sending..." : "Pay & Promote"}
          </button>

          {/* Manual confirm */}
          <div className="mt-1 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs font-semibold text-white/70">Manual confirm (if needed)</div>
            <div className="mt-2 grid gap-2">
              <input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Paste tx hash"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
              />

              <button
                onClick={() => confirm(txHash)}
                disabled={!txHash || !quote}
                className="rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-60"
              >
                Confirm Tx
              </button>
            </div>
          </div>

          {/* Status */}
          {msg ? (
            <div className="text-xs text-white/70 text-center">{msg}</div>
          ) : (
            <div className="text-[11px] text-white/50 text-center">
              After payment, your token will appear in “Featured / Promoted” on the homepage.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
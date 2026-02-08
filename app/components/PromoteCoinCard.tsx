"use client";

import { useMemo, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { parseEther } from "viem";

type Tier = "pinned" | "featured" | "boost";

const PRICES: Record<Tier, { eth: string; hours: number; title: string }> = {
  pinned: { eth: "0.003", hours: 6, title: "📌 Pinned (6h)" },
  featured: { eth: "0.002", hours: 24, title: "🔥 Featured (24h)" },
  boost: { eth: "0.0006", hours: 2, title: "⚡ Boost (2h)" },
};

function isAddr(a?: string) {
  return !!a && /^0x[a-fA-F0-9]{40}$/.test(a);
}

export default function PromoteCoinCard() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const feeWallet = (process.env.NEXT_PUBLIC_FEATURED_FEE_WALLET ||
    "") as `0x${string}`;

  const [coinAddress, setCoinAddress] = useState("");
  const [tier, setTier] = useState<Tier>("featured");
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState("");
  const [msg, setMsg] = useState("");

  const canPay = useMemo(() => {
    return (
      isConnected &&
      !!walletClient &&
      isAddr(feeWallet) &&
      isAddr(coinAddress) &&
      !busy
    );
  }, [isConnected, walletClient, feeWallet, coinAddress, busy]);

  async function onPay() {
    if (!canPay || !walletClient) return;

    setBusy(true);
    setMsg("");
    setTx("");

    try {
      const { eth, hours } = PRICES[tier];
      const cleanCoin = coinAddress.toLowerCase().trim();

      // Optional: embed a tiny note in tx data (not required)
      // Keep it short to avoid issues:
      const note = `FEATURE:${tier}:${cleanCoin}`;
      const data = `0x${Buffer.from(note, "utf8").toString("hex")}` as `0x${string}`;

      setMsg("Confirm payment in your wallet...");

      const hash = await walletClient.sendTransaction({
        to: feeWallet,
        value: parseEther(eth),
        data,
      });

      setTx(hash);
      setMsg(
        `Paid ${eth} ETH for ${tier.toUpperCase()} (~${hours}h). Send the tx hash to admin for approval.`
      );
    } catch (e: any) {
      setMsg(e?.shortMessage || e?.message || "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  const basescanTx = tx ? `https://basescan.org/tx/${tx}` : "";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm font-bold text-white">Paid Promotion</div>
      <div className="mt-1 text-xs text-white/60">
        Pay to promote a coin. Admin manually approves and adds it to Featured.
      </div>

      <div className="mt-4 grid gap-3">
        <input
          value={coinAddress}
          onChange={(e) => setCoinAddress(e.target.value)}
          placeholder="Coin address (0x...)"
          className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white outline-none"
        />

        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as Tier)}
          className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white outline-none"
        >
          <option value="featured">{PRICES.featured.title} — {PRICES.featured.eth} ETH</option>
          <option value="pinned">{PRICES.pinned.title} — {PRICES.pinned.eth} ETH</option>
          <option value="boost">{PRICES.boost.title} — {PRICES.boost.eth} ETH</option>
        </select>

        <button
          onClick={onPay}
          disabled={!canPay}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
            canPay ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-white/10 text-white/50"
          }`}
        >
          {busy ? "Processing..." : "Pay & Request Featured"}
        </button>

        {!isAddr(feeWallet) && (
          <div className="text-xs text-red-300">
            Missing NEXT_PUBLIC_FEATURED_FEE_WALLET in .env.local
          </div>
        )}

        {msg && <div className="text-xs text-white/70 break-all">{msg}</div>}

        {tx && (
          <div className="mt-1 flex flex-wrap gap-2">
            <a
              href={basescanTx}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 transition"
            >
              View Tx
            </a>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(tx)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 transition"
            >
              Copy Tx Hash
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
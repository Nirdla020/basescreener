"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  wallet: string;
};

export default function SupportModal({ open, onClose, wallet }: Props) {
  const [copied, setCopied] = useState(false);

  const qrSrc = useMemo(() => {
    const data = encodeURIComponent(wallet);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}`;
  }, [wallet]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
    >
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* modal */}
      <div className="relative w-full max-w-lg glass ring-soft rounded-2xl p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold">💗 Support BaseScreener</h3>
            <p className="mt-1 text-sm text-white/60">
              Send on <span className="text-white">Base / ETH</span> (works for USDC/USDT too).
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_220px] sm:items-start">
          {/* address */}
          <div>
            <div className="text-xs text-white/60">Wallet address</div>

            <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3">
              <code className="text-xs break-all text-white/90">{wallet}</code>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={copy}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 transition"
              >
                {copied ? "Copied!" : "Copy address"}
              </button>

              <a
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                  "Supporting BaseScreener ❤️ https://basescreener.fun"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 transition"
              >
                𝕏 Share
              </a>
            </div>

            <div className="mt-4 text-xs text-white/50">
              Tip: after sending, you can DM the tx hash to{" "}
              <a
                href="https://x.com/basescreenfun"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                @basescreenfun
              </a>{" "}
              to be added on the leaderboard.
            </div>
          </div>

          {/* QR */}
          <div className="flex flex-col items-center">
            <div className="text-xs text-white/60 mb-2">Scan QR</div>

            {/* ✅ FIX: remove bg-white so it doesn't look like a big white block */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <img
                src={qrSrc}
                alt="Wallet QR code"
                className="rounded-xl border border-white/10"
                width={220}
                height={220}
                loading="lazy"
              />
            </div>

            <div className="mt-2 text-[11px] text-white/50 text-center">
              Scans to your wallet address
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

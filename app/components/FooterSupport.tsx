"use client";

import { useState } from "react";

export default function FooterSupport() {
  const [copied, setCopied] = useState(false);

  const WALLET = "0xd3a961b02949fd944acdf2c890b33cdd7e84454b";

  async function copy() {
    await navigator.clipboard.writeText(WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <footer
      id="support"
      className="border-t border-white/10 bg-[#020617] text-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left */}
          <div>
            <h3 className="text-lg font-semibold">❤️ Support BaseScreener</h3>
            <p className="text-sm text-white/70 max-w-md">
              BaseScreener is free to use. Your support helps cover servers and
              fund new features.
            </p>

            {/* X Link */}
            <div className="mt-3 text-sm text-white/70">
              Follow us on{" "}
              <a
                href="https://x.com/basescreenfun"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                𝕏 @basescreenfun
              </a>
            </div>

            {/* Share on X */}
            <a
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                "Track Base tokens in real-time 🚀 https://basescreener.fun"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
            >
              𝕏 Share BaseScreener
            </a>
          </div>

          {/* Right */}
          <div className="flex flex-col gap-2 sm:items-end">
            <span className="text-xs text-white/60">
              Accepts: Base / ETH / USDC / USDT
            </span>

            <div className="flex items-center gap-2">
              <code className="rounded bg-white/5 px-3 py-2 text-xs">
                {WALLET}
              </code>

              <button
                onClick={copy}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm hover:bg-blue-700"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-white/50">
          © {new Date().getFullYear()} BaseScreener
        </div>
      </div>
    </footer>
  );
}

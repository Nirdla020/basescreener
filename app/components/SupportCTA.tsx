"use client";

import { useState } from "react";
import SupportModal from "./SupportModal";

export default function SupportCTA() {
  const [open, setOpen] = useState(false);

  const WALLET = "0xd3a961b02949fd944acdf2c890b33cdd7e84454b";

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 mt-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">❤️ Support BaseScreener</div>
            <div className="text-sm text-white/70">
              Ads + donations help cover servers and fund new features.
            </div>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-pink-600 px-4 py-2 text-sm font-bold hover:bg-pink-500"
          >
            Support Now
          </button>
        </div>
      </div>

      <SupportModal open={open} onClose={() => setOpen(false)} wallet={WALLET} />
    </>
  );
}

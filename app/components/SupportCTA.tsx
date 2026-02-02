"use client";

import { useState } from "react";
import SupportModal from "./SupportModal";

export default function SupportCTA() {
  const [open, setOpen] = useState(false);

  const WALLET = "0xd3a961b02949fd944acdf2c890b33cdd7e84454b";

  return (
    <>
      <section className="py-6 sm:py-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="glass ring-soft rounded-2xl px-5 py-4 sm:px-6 sm:py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-extrabold text-white truncate">
                💗 Support BaseScreener
              </div>
              <div className="text-sm text-white/60">
                Ads + donations help cover servers and fund new features.
              </div>
            </div>

            <button
              onClick={() => setOpen(true)}
              className="shrink-0 inline-flex items-center justify-center rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-pink-500 transition"
            >
              Support Now
            </button>
          </div>
        </div>
      </section>

      <SupportModal open={open} onClose={() => setOpen(false)} wallet={WALLET} />
    </>
  );
}

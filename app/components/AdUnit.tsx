"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export default function AdUnit({
  slot,
  className = "",
  format = "auto",
  responsive = true,
  minHeight = 120,
}: {
  slot: string;
  className?: string;
  format?: string;
  responsive?: boolean;
  minHeight?: number;
}) {
  const insRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Avoid pushing multiple times for the same slot mount
    const t = setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        // If ad loads, AdSense usually injects iframe into the ins element
        setTimeout(() => {
          const hasIframe = !!insRef.current?.querySelector("iframe");
          if (hasIframe) setLoaded(true);
        }, 800);
      } catch {
        // ignore
      }
    }, 50);

    return () => clearTimeout(t);
  }, [slot]);

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-black/20 overflow-hidden ${className}`}
      style={{ minHeight }}
    >
      <div className="px-3 py-2 text-[11px] text-white/40 border-b border-white/10">
        Advertisement
      </div>

      <div className="p-3">
        <ins
          ref={insRef as any}
          className="adsbygoogle block"
          style={{ display: "block", background: "transparent" }}
          data-ad-client="ca-pub-2273778994224812"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
        />

        {!loaded && (
          <div className="mt-3 text-xs text-white/40">
            Ad is loading… (If AdSense has no fill yet, this stays empty.)
          </div>
        )}
      </div>
    </div>
  );
}

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

  // ✅ Gate rendering from pages (prevents AdSense “no publisher content” flags)
  enabled = true,

  // ✅ Optional: hide the entire box if there’s no fill
  hideIfNoFill = true,

  // ✅ Optional: delay push a bit (helps avoid pushing during suspense/layout shifts)
  delayMs = 250,
}: {
  slot: string;
  className?: string;
  format?: string;
  responsive?: boolean;
  minHeight?: number;
  enabled?: boolean;
  hideIfNoFill?: boolean;
  delayMs?: number;
}) {
  // ✅ <ins> doesn't have HTMLInsElement in TS DOM typings — use HTMLElement
  const insRef = useRef<HTMLElement | null>(null);

  // Prevent double-push for same mounted <ins>
  const pushedRef = useRef(false);

  // Track fill state (null = unknown, true/false = checked)
  const [hasFill, setHasFill] = useState<boolean | null>(null);

  // Reset when slot changes or ad gets disabled/enabled
  useEffect(() => {
    setHasFill(null);
    pushedRef.current = false;

    // If you toggle enabled off, clear injected ad content (avoid stale frames)
    if (!enabled && insRef.current) {
      insRef.current.innerHTML = "";
    }
  }, [slot, enabled]);

  useEffect(() => {
    // ✅ Don’t even attempt if disabled or missing slot
    if (!enabled) return;
    if (!slot) return;
    if (!insRef.current) return;

    // ✅ Avoid pushing multiple times for the same mount
    if (pushedRef.current) return;
    pushedRef.current = true;

    const pushTimer = window.setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // ignore
      }
    }, delayMs);

    // ✅ Check for fill after AdSense has time to inject iframe
    const fillTimer = window.setTimeout(() => {
      const iframe = insRef.current?.querySelector("iframe");
      setHasFill(!!iframe);
    }, Math.max(1200, delayMs + 900));

    return () => {
      window.clearTimeout(pushTimer);
      window.clearTimeout(fillTimer);
    };
  }, [enabled, slot, delayMs]);

  // ✅ If disabled, render nothing (best for policy + avoids empty ad screens)
  if (!enabled || !slot) return null;

  // ✅ If no fill and you want to hide empty boxes
  if (hideIfNoFill && hasFill === false) return null;

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
      </div>
    </div>
  );
}

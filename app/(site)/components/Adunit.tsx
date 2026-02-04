"use client";

import { useEffect, useId, useMemo } from "react";

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

type Props = {
  slot: string;
  enabled?: boolean;
  className?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
};

export default function AdUnit({ slot, enabled = true, className = "", format = "auto" }: Props) {
  const rid = useId();

  // Only show if slot looks real (digits only). Prevents placeholder spam.
  const slotOk = useMemo(() => /^\d+$/.test(slot || ""), [slot]);

  useEffect(() => {
    if (!enabled) return;
    if (!slotOk) return;

    // push ads once mounted
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // ignore
    }
  }, [enabled, slotOk, rid]);

  if (!enabled || !slotOk) return null;

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

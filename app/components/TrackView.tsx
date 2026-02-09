"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function isAddr(a?: string) {
  return !!a && /^0x[a-fA-F0-9]{40}$/.test(a);
}

export default function TrackView() {
  const pathname = usePathname();
  const sp = useSearchParams();

  useEffect(() => {
    const q = sp?.get("q") || "";
    const token = isAddr(q) ? q : "";

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "view",
        route: pathname,
        token,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname, sp]);

  return null;
}
"use client";

import { useEffect, useRef } from "react";

export default function TVChart({ symbol = "BASE:WETHUSD" }: { symbol?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      new TradingView.widget({
        autosize: true,
        symbol,
        interval: "15",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#020617",
        enable_publishing: false,
        hide_side_toolbar: false,
        container_id: "tv_chart_container",
      });
    };
    ref.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="w-full h-[420px] rounded-xl overflow-hidden border border-white/10 bg-black">
      <div id="tv_chart_container" className="w-full h-full" ref={ref} />
    </div>
  );
}
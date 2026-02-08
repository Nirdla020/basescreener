"use client";

import * as React from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base } from "wagmi/chains";
import "@rainbow-me/rainbowkit/styles.css";

// ✅ Create once (avoid recreating on rerenders)
const queryClient = new QueryClient();

// ✅ Don't use "CHANGE_ME" fallback (it causes 403 in builds)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const config =
  projectId && projectId.length > 0
    ? getDefaultConfig({
        appName: "BaseScreener",
        projectId,
        chains: [base],
        ssr: true,
      })
    : null;

export default function Providers({ children }: { children: React.ReactNode }) {
  // ✅ If missing projectId, still let the site build + run (wallet connect disabled)
  if (!config) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. WalletConnect/RainbowKit will be disabled."
      );
    }
    return <>{children}</>;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
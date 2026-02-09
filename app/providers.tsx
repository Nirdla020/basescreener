"use client";

import * as React from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base } from "wagmi/chains";
import "@rainbow-me/rainbowkit/styles.css";

// ✅ Create once
const queryClient = new QueryClient();

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// ✅ Always create a wagmi config
// If WalletConnect projectId is missing, we still build wagmi with base transport.
// RainbowKit will still work for injected wallets; WalletConnect may be unavailable.
const wagmiConfig = projectId
  ? getDefaultConfig({
      appName: "BaseScreener",
      projectId,
      chains: [base],
      ssr: true,
    })
  : createConfig({
      chains: [base],
      ssr: true,
      transports: {
        [base.id]: http(),
      },
    });

export default function Providers({ children }: { children: React.ReactNode }) {
  if (!projectId && process.env.NODE_ENV !== "production") {
    console.warn(
      "Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. WalletConnect will be disabled."
    );
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function WalletButton() {
  return (
    <div className="inline-flex">
      <ConnectButton chainStatus="icon" showBalance={false} />
    </div>
  );
}
"use client";

import { useMemo, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { Address, createPublicClient, custom, http, parseEther } from "viem";
import { base } from "viem/chains";

// ✅ Factory address per Zora docs (same across supported chains)
const ZORA_FACTORY = "0x777777751622c0d3258f214F9DF38E35BF45baF3" as const; // Base/ Base Sepolia :contentReference[oaicite:4]{index=4}

// ⚠️ You will need the ABI for the specific deploy function you use.
// Best practice: paste the ABI snippet for deploy() from the docs/source and put it here.
const ZORA_FACTORY_ABI = [
  // Minimal placeholder to illustrate structure.
  // Replace with real ABI for deploy(...) you plan to call.
] as const;

export default function CreateCoinLaunchpadButton() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const platformReferrer = (process.env.NEXT_PUBLIC_PLATFORM_REFERRER ||
    "") as Address;

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [uri, setUri] = useState(""); // metadata uri / image uri depending on coin type
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState<string>("");

  const canSubmit = useMemo(() => {
    return (
      isConnected &&
      !!walletClient &&
      /^0x[a-fA-F0-9]{40}$/.test(platformReferrer || "") &&
      name.trim().length > 1 &&
      symbol.trim().length >= 2
    );
  }, [isConnected, walletClient, platformReferrer, name, symbol]);

  async function onCreate() {
    if (!canSubmit || !walletClient) return;

    setBusy(true);
    setTxHash("");

    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });

      // TODO: Build the exact args for factory.deploy(...) you want.
      // The docs show deploy(...) supports pool config and optional post-deploy hooks. :contentReference[oaicite:5]{index=5}
      //
      // For now, leave as TODO until you choose coin type and we paste the correct ABI+args.
      //
      // Example shape from docs screenshot:
      // factory.deploy(
      //   payoutRecipient,
      //   owners,
      //   uri,
      //   name,
      //   symbol,
      //   poolConfig,
      //   platformReferrer,
      //   postDeployHook,
      //   postDeployHookData,
      //   coinSalt
      // )

      throw new Error(
        "Next step: wire the exact ZoraFactory.deploy ABI + arguments for your coin type."
      );
    } catch (e: any) {
      alert(e?.message || "Failed to create coin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm font-bold text-white">Create coin (Launchpad)</div>
      <div className="mt-1 text-xs text-white/60">
        Creates the coin via Zora contracts and permanently sets your{" "}
        <code className="text-white/80">platformReferrer</code>. :contentReference[oaicite:6]{index=6}
      </div>

      <div className="mt-4 grid gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none text-white"
        />
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Symbol"
          className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none text-white"
        />
        <input
          value={uri}
          onChange={(e) => setUri(e.target.value)}
          placeholder="URI (optional)"
          className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none text-white"
        />

        <button
          onClick={onCreate}
          disabled={!canSubmit || busy}
          className={`mt-2 inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition
            ${
              !canSubmit || busy
                ? "bg-white/10 text-white/50"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
        >
          {busy ? "Creating..." : "Create coin now"}
        </button>

        {!!txHash && (
          <div className="text-xs text-white/70 break-all">
            Tx: {txHash}
          </div>
        )}

        {!/^0x[a-fA-F0-9]{40}$/.test(platformReferrer || "") && (
          <div className="text-xs text-red-300">
            Set NEXT_PUBLIC_PLATFORM_REFERRER in .env.local to your wallet
            address.
          </div>
        )}
      </div>
    </div>
  );
}
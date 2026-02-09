"use client";

import { useMemo, useState } from "react";
import { useAccount, useWalletClient, useChainId, useSwitchChain } from "wagmi";
import { Address, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { createCoin, CreateConstants } from "@zoralabs/coins-sdk";

function isAddr(a?: string) {
  return !!a && /^0x[a-fA-F0-9]{40}$/.test(a);
}

function safeMsg(e: any) {
  // Try to surface useful errors
  const m =
    e?.shortMessage ||
    e?.details ||
    e?.message ||
    (typeof e === "string" ? e : null) ||
    "Create failed.";
  return String(m);
}

async function copyText(s: string) {
  try {
    await navigator.clipboard.writeText(s);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = s;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

export default function CreateContentCoinButton() {
  const { address: connectedAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // ✅ Ensure we're on Base
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const platformReferrer = process.env.NEXT_PUBLIC_PLATFORM_REFERRER as Address;

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [txHash, setTxHash] = useState("");
  const [coinAddress, setCoinAddress] = useState("");

  const creator = connectedAddress as Address;

  // ✅ Do NOT block button on walletClient (can be flaky). We'll guard inside onCreate.
  const can = useMemo(() => {
    return (
      isConnected &&
      isAddr(creator) &&
      isAddr(platformReferrer) &&
      name.trim().length >= 2 &&
      symbol.trim().length >= 2 &&
      !!imageFile &&
      !busy
    );
  }, [isConnected, creator, platformReferrer, name, symbol, imageFile, busy]);

  function resetAll() {
    setName("");
    setSymbol("");
    setImageFile(null);
    setImagePreview("");
    setBusy(false);
    setMsg("");
    setTxHash("");
    setCoinAddress("");
  }

  function onPickImage(file: File | null) {
    setImageFile(file);
    setMsg("");
    setTxHash("");
    setCoinAddress("");

    if (!file) {
      setImagePreview("");
      return;
    }

    setImagePreview(URL.createObjectURL(file));
  }

  // ✅ Server-side Pinata upload (no secrets in frontend)
  async function uploadToIPFS(file: File) {
    const data = new FormData();
    data.append("file", file);

    const res = await fetch("/api/pinata/file", {
      method: "POST",
      body: data,
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Image upload failed.");

    return `ipfs://${json.ipfsHash}` as const;
  }

  async function uploadMetadata(imageUri: string) {
    const metadata = {
      name: name.trim(),
      description: "Launched via BaseScreener",
      image: imageUri,
    };

    const res = await fetch("/api/pinata/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Metadata upload failed.");

    return `ipfs://${json.ipfsHash}` as const;
  }

  function whyNotReady() {
    if (!isConnected) return "Connect wallet first.";
    if (!isAddr(creator)) return "Invalid connected wallet address.";
    if (!isAddr(platformReferrer))
      return "Invalid NEXT_PUBLIC_PLATFORM_REFERRER env var.";
    if (name.trim().length < 2) return "Enter coin name (min 2 chars).";
    if (symbol.trim().length < 2) return "Enter symbol (min 2 chars).";
    if (!imageFile) return "Upload an image.";
    if (busy) return "Processing…";
    return "";
  }

  async function onCreate() {
    const why = whyNotReady();
    if (why) {
      setMsg(why);
      return;
    }
    if (!imageFile) return;

    // walletClient check here (not in can)
    if (!walletClient) {
      setMsg("Wallet not ready. Try disconnect + reconnect your wallet.");
      return;
    }

    setBusy(true);
    setMsg("");
    setTxHash("");
    setCoinAddress("");

    try {
      // Ensure Base chain
      if (chainId !== base.id) {
        setMsg("Switching to Base...");
        await switchChainAsync?.({ chainId: base.id });
      }

      setMsg("Uploading image...");
      const imageUri = await uploadToIPFS(imageFile);

      setMsg("Uploading metadata...");
      const metadataUri = await uploadMetadata(imageUri);

      setMsg("Confirm in wallet...");
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });

      const res: any = await createCoin({
        call: {
          creator,
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          metadata: { type: "RAW_URI", uri: metadataUri },
          currency: CreateConstants.ContentCoinCurrencies.CREATOR_COIN,
          chainId: 8453,
          startingMarketCap: CreateConstants.StartingMarketCaps.LOW,
          platformReferrer,
        },
        walletClient,
        publicClient,
      });

      const addr =
        res?.address ||
        res?.deployment?.coin ||
        res?.predictedCoinAddress ||
        "";

      if (addr && isAddr(addr)) setCoinAddress(addr);
      if (res?.hash) setTxHash(res.hash);

      setMsg("Success! 🎉");
      // ✅ Track successful launch
fetch("/api/analytics/track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    event: "launch",
    route: "/create",
    token: addr || "",
    label: "zora_createcoin",
  }),
  keepalive: true,
}).catch(() => {});
    } catch (e: any) {
      setMsg(safeMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const basescanTx = txHash ? `https://basescan.org/tx/${txHash}` : "";
  const basescanToken = coinAddress
    ? `https://basescan.org/token/${coinAddress}`
    : "";

  const zoraCoin = coinAddress
    ? `https://zora.co/coin/${encodeURIComponent(
        `base:${coinAddress.toLowerCase()}`
      )}`
    : "";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      {/* ✅ Header + Branding */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            BS
          </div>

          <div>
            <div className="text-sm font-bold text-white">Create Coin on Zora</div>
            <div className="text-[11px] text-white/50">Powered by BaseScreener</div>
          </div>
        </div>

        {coinAddress || txHash ? (
          <button
            onClick={resetAll}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/80 hover:bg-black/50 transition"
            type="button"
          >
            Create another
          </button>
        ) : null}
      </div>

      {/* ✅ Form */}
      <div className="mt-4 grid gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Coin name"
          className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white outline-none"
        />

        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Symbol"
          className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white outline-none"
        />

        {/* Upload */}
        <div className="grid gap-2">
          <label className="text-xs text-white/70">Upload image</label>

          <input
            id="imageUpload"
            type="file"
            accept="image/*"
            onChange={(e) => onPickImage(e.target.files?.[0] || null)}
            className="hidden"
          />

          <label
            htmlFor="imageUpload"
            className="cursor-pointer rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white hover:bg-black/60 transition text-center"
          >
            📤 {imageFile ? "Change Image" : "Upload Image"}
          </label>

          {imagePreview && (
            <img
              src={imagePreview}
              className="h-16 w-16 rounded-lg object-cover border border-white/10"
              alt="Preview"
            />
          )}
        </div>

        <button
          onClick={onCreate}
          disabled={!can}
          className={`mt-2 rounded-xl px-4 py-2 font-bold text-sm transition
          ${
            can
              ? "bg-blue-600 hover:bg-blue-500 text-white"
              : "bg-white/10 text-white/50"
          }`}
          type="button"
        >
          {busy ? "Processing..." : "Create Coin on Zora"}
        </button>

        {/* Helpful hint when disabled */}
        {!busy && !msg && !can && (
          <div className="text-xs text-white/60">{whyNotReady()}</div>
        )}

        {msg && <div className="text-xs text-white/70">{msg}</div>}

        {/* ✅ Links */}
        {(coinAddress || txHash) && (
          <div className="mt-4 grid gap-2">
            {basescanTx && (
              <a
                href={basescanTx}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-center text-white hover:bg-white/10"
              >
                View Tx
              </a>
            )}

            {basescanToken && (
              <a
                href={basescanToken}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-center text-white hover:bg-white/10"
              >
                View Token
              </a>
            )}

            {zoraCoin && (
              <a
                href={zoraCoin}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-blue-600 px-3 py-2 text-xs text-center text-white hover:bg-blue-500"
              >
                View on Zora
              </a>
            )}

            {(coinAddress || txHash) && (
              <button
                type="button"
                onClick={() => copyText(coinAddress || txHash)}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/80 hover:bg-black/50 transition"
              >
                Copy {coinAddress ? "Token Address" : "Tx Hash"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
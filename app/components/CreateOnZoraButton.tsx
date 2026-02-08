"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";

export default function CreateOnZoraButton() {
  const { address } = useAccount();

  const href = useMemo(() => {
    const baseCreate = "https://zora.co/create";
    const qs = new URLSearchParams();

    // Optional referral
    if (address) qs.set("referrer", address);

    return qs.toString() ? `${baseCreate}?${qs.toString()}` : baseCreate;
  }, [address]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
    >
      Create Coin on Zora
    </a>
  );
}
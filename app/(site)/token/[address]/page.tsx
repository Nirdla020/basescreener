import { use } from "react";
import TokenClient from "../TokenClient";

function isAddress(a: string) {
  return /^0x[a-f0-9]{40}$/.test(a);
}

export const metadata = {
  title: "Token | BaseScreener",
};

export default function TokenPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address: rawAddress } = use(params);
  const address = String(rawAddress || "").toLowerCase();

  if (!isAddress(address)) {
    return <div className="p-6 text-white/70">Invalid token address.</div>;
  }

  return <TokenClient addressFromRoute={address} />;
}
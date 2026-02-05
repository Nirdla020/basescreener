import { NextResponse } from "next/server";
import { getCoin } from "@zoralabs/coins-sdk";
import { base } from "viem/chains";

export const runtime = "nodejs"; // ✅ IMPORTANT
export const dynamic = "force-dynamic"; // ✅ don't cache

function extractAddress(input: string) {
  const m = (input || "").match(/0x[a-fA-F0-9]{40}/);
  return m ? m[0].toLowerCase() : null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const raw = url.searchParams.get("address") || "";
    const address = extractAddress(raw);

    if (!address) return NextResponse.json({ exists: false }, { status: 200 });

    // ✅ Try multiple signatures (SDK versions differ)
    const tries: Array<() => Promise<any>> = [
      () => getCoin({ address, chainId: base.id } as any),
      () => getCoin({ address, chainId: "base" } as any),
      () => getCoin({ address, chain: base } as any),
      () => getCoin({ address } as any),
    ];

    for (const t of tries) {
      try {
        const coin = await t();
        if (coin) return NextResponse.json({ exists: true }, { status: 200 });
      } catch {}
    }

    return NextResponse.json({ exists: false }, { status: 200 });
  } catch {
    return NextResponse.json({ exists: false }, { status: 200 });
  }
}

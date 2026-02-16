import { NextResponse } from "next/server";
import { getEthUsdPrice } from "@/lib/price";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function priceUsd(days: number) {
  if (days === 1) return Number(process.env.FEATURED_PRICE_1D_USD || 50);
  if (days === 2) return Number(process.env.FEATURED_PRICE_2D_USD || 90);
  return Number(process.env.FEATURED_PRICE_3D_USD || 120);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const days = Number(searchParams.get("days") || 1);

  if (![1, 2, 3].includes(days)) {
    return NextResponse.json({ error: "Invalid days" }, { status: 400 });
  }

  const payTo = process.env.ADMIN_ADDRESS;
  if (!payTo) {
    return NextResponse.json(
      { error: "Missing ADMIN_ADDRESS" },
      { status: 500 }
    );
  }

  /* ---------------- LIVE ETH PRICE ---------------- */

  const ethUsd = await getEthUsdPrice();

  if (!ethUsd || ethUsd <= 0) {
    return NextResponse.json(
      { error: "Failed to fetch ETH price" },
      { status: 503 }
    );
  }

  /* ---------------- Convert USD → ETH → Wei ---------------- */

  const usd = priceUsd(days);

  const eth = usd / ethUsd;

  // round UP so you never undercharge
  const amountWei = BigInt(Math.ceil(eth * 1e18));

  return NextResponse.json({
    days,
    usd,
    ethUsd,
    amountWei: amountWei.toString(),
    payTo: payTo.toLowerCase(),
  });
}
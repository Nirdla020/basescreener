import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import {
  addDaysIso,
  isTxUsed,
  logPayment,
  markTxUsed,
  nowIso,
  upsertFeatured,
} from "@/lib/featuredStore";
import { notifyEmail } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicClient = createPublicClient({
  chain: base,
  transport: http(base.rpcUrls.default.http[0]),
});

function isAddr(a?: string) {
  return !!a && /^0x[a-fA-F0-9]{40}$/.test(a);
}
function isTxHash(h?: string) {
  return !!h && /^0x[a-fA-F0-9]{64}$/.test(h);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const tokenAddress = String(body.tokenAddress || "").trim();
  const title = body.title ? String(body.title).trim() : undefined;
  const days = Number(body.days || 1);
  const txHash = String(body.txHash || "").trim();
  const minWei = String(body.minWei || "").trim();

  if (![1, 2, 3].includes(days)) {
    return NextResponse.json({ error: "Invalid days" }, { status: 400 });
  }
  if (!isAddr(tokenAddress)) {
    return NextResponse.json({ error: "Invalid token address" }, { status: 400 });
  }
  if (!isTxHash(txHash)) {
    return NextResponse.json({ error: "Invalid tx hash" }, { status: 400 });
  }
  if (!minWei || !/^\d+$/.test(minWei)) {
    return NextResponse.json({ error: "Missing minWei" }, { status: 400 });
  }

  const payTo = process.env.ADMIN_ADDRESS?.toLowerCase();
  if (!payTo) {
    return NextResponse.json({ error: "Missing ADMIN_ADDRESS" }, { status: 500 });
  }

  // prevent re-use
  if (await isTxUsed(txHash)) {
    return NextResponse.json({ error: "Tx already used" }, { status: 400 });
  }

  // 1) receipt status
  const receipt = await publicClient
    .getTransactionReceipt({ hash: txHash as `0x${string}` })
    .catch(() => null);

  if (!receipt || receipt.status !== "success") {
    return NextResponse.json({ error: "Tx not confirmed or failed" }, { status: 400 });
  }

  // 2) transaction details (to + value)
  const tx = await publicClient
    .getTransaction({ hash: txHash as `0x${string}` })
    .catch(() => null);

  if (!tx) return NextResponse.json({ error: "Tx not found" }, { status: 400 });

  const to = (tx.to || "").toLowerCase();
  if (to !== payTo) {
    return NextResponse.json({ error: "Payment was not sent to payTo" }, { status: 400 });
  }

  // ✅ BigInt literal fix (NO 0n)
  const valueWei = BigInt(tx.value ?? BigInt(0));
  const requiredWei = BigInt(minWei);

  if (valueWei < requiredWei) {
    return NextResponse.json({ error: "Payment amount too low" }, { status: 400 });
  }

  // ✅ mark used first to avoid races
  await markTxUsed(txHash);

  // build featured item (promoted)
  const createdAt = nowIso();
  const expiresAt = addDaysIso(days);
  const weight = days === 3 ? 30 : days === 2 ? 20 : 10;

  await upsertFeatured({
    chainId: 8453,
    address: tokenAddress.toLowerCase(),
    title,
    weight,
    promoted: true,
    createdAt,
    expiresAt,
    paidTxHash: txHash.toLowerCase(),
    payer: (tx.from || "").toLowerCase() || undefined,
  });

  await logPayment({
    ts: createdAt,
    tokenAddress: tokenAddress.toLowerCase(),
    title,
    days,
    usd: body.usd ? Number(body.usd) : 0,
    ethUsd: body.ethUsd ? Number(body.ethUsd) : 0,
    amountWei: valueWei.toString(),
    txHash: txHash.toLowerCase(),
    payer: (tx.from || "").toLowerCase() || undefined,
  });

  // ✅ EMAIL ONLY (no Discord)
  await notifyEmail(
    "New BaseScreener Promote Payment ✅",
    `<p><b>Token:</b> ${tokenAddress}</p>
     <p><b>Days:</b> ${days}</p>
     <p><b>Tx:</b> ${txHash}</p>
     <p><b>From:</b> ${tx.from || "—"}</p>`
  );

  return NextResponse.json({ ok: true, expiresAt });
}
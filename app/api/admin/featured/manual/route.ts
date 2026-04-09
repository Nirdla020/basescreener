import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { upsertFeatured, nowIso, addDaysIso } from "@/lib/featuredStore";

// ❗ Temporarily remove these if build fails; see note below
export const runtime = "nodejs";
// export const dynamic = "force-dynamic"; // <-- comment this out first

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const chainId = Number(body.chainId || 8453);
    const address = String(body.address || "").trim();
    const days = Math.max(1, Math.min(30, Number(body.days || 1)));

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid token address" }, { status: 400 });
    }

    await upsertFeatured({
      chainId,
      address,
      title: body.title ? String(body.title) : undefined,
      logoUrl: body.logoUrl ? String(body.logoUrl) : undefined,
      weight: Number.isFinite(Number(body.weight)) ? Number(body.weight) : 0,
      promoted: Boolean(body.promoted),
      createdAt: nowIso(),
      expiresAt: addDaysIso(days),
      payer: "manual",
      paidTxHash: "manual",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// helps Next's validator treat this file as a module in edge cases
export {};
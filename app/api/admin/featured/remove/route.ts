import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { removeFeatured } from "@/lib/featuredStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { chainId, address } = await req.json();
    await removeFeatured(Number(chainId || 8453), String(address || ""));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
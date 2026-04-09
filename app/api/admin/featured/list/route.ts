import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { listFeatured } from "@/lib/featuredStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const items = await listFeatured();
    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
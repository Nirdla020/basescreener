import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getEarningsSummary, listPayments } from "@/lib/featuredStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin(); // returns string, but we don't need it here

    const { searchParams } = new URL(req.url);
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") || 200)));

    const summary = await getEarningsSummary(limit);
    const payments = await listPayments(Math.min(limit, 200));

    return NextResponse.json({ summary, payments });
  } catch (e: any) {
    const msg = String(e?.message || "");

    const status =
      msg === "ADMIN_NOT_CONFIGURED" ? 503 :
      msg === "NOT_ADMIN" ? 403 :
      401;

    return NextResponse.json(
      { error: status === 503 ? "Admin not configured" : "Unauthorized" },
      { status }
    );
  }
}
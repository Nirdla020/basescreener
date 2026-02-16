import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { listPayments } from "@/lib/featuredStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    const status = auth.error === "Admin not configured" ? 503 : 401;
    return NextResponse.json({ error: auth.error }, { status });
  }

  const payments = await listPayments(200);

  // If you want totals in USD, store usd on confirm (recommended)
  const totalUsd = payments.reduce((sum, p) => sum + (Number(p.usd) || 0), 0);

  return NextResponse.json({
    ok: true,
    totalUsd,
    count: payments.length,
    payments,
  });
}
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getEarningsSummary, listPayments } from "@/lib/featuredStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function norm(a: string) {
  return a.trim().toLowerCase();
}

async function requireAdmin() {
  const admin = process.env.ADMIN_WALLET ? norm(process.env.ADMIN_WALLET) : "";
  if (!admin) return false;

  const cookieStore = await cookies();
  const addr = norm(cookieStore.get("admin_addr")?.value || "");

  return addr === admin;
}

export async function GET(req: Request) {
  const ok = await requireAdmin();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") || 200)));

  const summary = await getEarningsSummary(limit);
  const payments = await listPayments(Math.min(limit, 200));

  return NextResponse.json({ summary, payments });
}
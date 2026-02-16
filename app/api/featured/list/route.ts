import { NextResponse } from "next/server";
import { listFeatured } from "@/lib/featuredStore";

export const runtime = "nodejs";

export async function GET() {
  const items = await listFeatured();

  // sort: promoted first, then weight desc, then newest
  items.sort((a, b) => {
    const p = Number(!!b.promoted) - Number(!!a.promoted);
    if (p) return p;
    const w = Number(b.weight || 0) - Number(a.weight || 0);
    if (w) return w;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  return NextResponse.json({ items });
}
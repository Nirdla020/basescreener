// app/api/cron/cleanup/route.ts
import { NextResponse } from "next/server";
import { kv, kvReady } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY_FEATURED = "featured:items";

export async function GET() {
  // If KV isn't configured (local / missing env), do nothing safely.
  if (!kvReady() || !kv) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "KV not configured",
    });
  }

  // hgetall returns Record<string, string> (JSON strings)
  const map = ((await (kv as any).hgetall(KEY_FEATURED)) || {}) as Record<string, string>;

  const now = Date.now();
  let removed = 0;

  for (const [field, raw] of Object.entries(map)) {
    try {
      const item = JSON.parse(raw || "{}") as { expiresAt?: string };
      const exp = Date.parse(item.expiresAt || "");
      if (Number.isFinite(exp) && exp <= now) {
        await (kv as any).hdel(KEY_FEATURED, field);
        removed += 1;
      }
    } catch {
      // If the value is corrupted, delete it so it doesn't break reads.
      await (kv as any).hdel(KEY_FEATURED, field);
      removed += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    removed,
    total: Object.keys(map).length,
  });
}
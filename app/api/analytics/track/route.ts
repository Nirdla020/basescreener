import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function clean(s: any, max = 120) {
  return String(s ?? "")
    .trim()
    .slice(0, max)
    .replace(/[^\w\-:.\/]/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const event = clean(body.event, 40); // view | click | launch
    const route = clean(body.route, 80); // /dashboard, /create, etc.
    const token = clean(body.token, 64); // optional (0x...)
    const label = clean(body.label, 60); // optional (featured, zora, support, etc.)

    if (!event) return NextResponse.json({ ok: false }, { status: 400 });

    const day = dayKey();

    // Global totals per day
    await kv.incr(`a:${day}:event:${event}`);

    // Per-route per day
    if (route) await kv.incr(`a:${day}:route:${route}:event:${event}`);

    // Per-token per day
    if (token) await kv.incr(`a:${day}:token:${token}:event:${event}`);

    // Per-label per day
    if (label) await kv.incr(`a:${day}:label:${label}:event:${event}`);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
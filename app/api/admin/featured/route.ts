// app/api/admin/featured/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { kvReady } from "@/lib/kv";
import {
  listFeatured,
  upsertFeatured,
  removeFeatured,
  nowIso,
  addDaysIso,
  type FeaturedItem,
} from "@/lib/featuredStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- Auth ---------------- */

function norm(a: string) {
  return a.trim().toLowerCase();
}

async function requireAdmin(): Promise<boolean> {
  const admin = process.env.ADMIN_WALLET ? norm(process.env.ADMIN_WALLET) : "";
  if (!admin) return false;

  const cookieStore = await cookies();
  const addr = norm(cookieStore.get("admin_addr")?.value || "");
  return addr === admin;
}

/* ---------------- Utils ---------------- */

function isAddr(a?: string) {
  return !!a && /^0x[a-fA-F0-9]{40}$/.test(String(a || "").trim());
}

function cleanStr(v: any, max = 80) {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function toInt(v: any, def = 10) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
}

/* ---------------- Handlers ---------------- */

// GET (ADMIN) -> list featured items
export async function GET() {
  const ok = await requireAdmin();

  // ✅ DEBUG: helps confirm Production env vars on live domain
  const env = {
    hasAdminWallet: !!process.env.ADMIN_WALLET,
    kvReady: kvReady(),
    hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  if (!ok) {
    return NextResponse.json({ error: "Unauthorized", env }, { status: 401 });
  }

  const items = await listFeatured();

  // sort: promoted first, then weight desc, then newest
  items.sort((a, b) => {
    const p = Number(!!b.promoted) - Number(!!a.promoted);
    if (p) return p;
    const w = Number(b.weight || 0) - Number(a.weight || 0);
    if (w) return w;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  return NextResponse.json({ items, env });
}

// POST (ADMIN) -> upsert featured item
export async function POST(req: Request) {
  const ok = await requireAdmin();

  // ✅ DEBUG: include env here too
  const env = {
    hasAdminWallet: !!process.env.ADMIN_WALLET,
    kvReady: kvReady(),
    hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  if (!ok) return NextResponse.json({ error: "Unauthorized", env }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const chainId = toInt(body.chainId, 8453);
  const address = cleanStr(body.address, 60).toLowerCase();
  const title = cleanStr(body.title, 80) || undefined;
  const logoUrl = cleanStr(body.logoUrl, 400) || undefined;

  const weight = toInt(body.weight, 10);
  const promoted = !!body.promoted;

  // Accept either:
  // - expiresAt ISO string
  // - days number (auto compute)
  const days = toInt(body.days, 0);
  const expiresAt =
    typeof body.expiresAt === "string" && body.expiresAt.trim()
      ? body.expiresAt.trim()
      : days > 0
      ? addDaysIso(days)
      : addDaysIso(1);

  if (chainId !== 8453) {
    return NextResponse.json({ error: "Only Base (8453) supported.", env }, { status: 400 });
  }

  if (!isAddr(address)) {
    return NextResponse.json({ error: "Invalid token address.", env }, { status: 400 });
  }

  const exp = Date.parse(expiresAt);
  if (!Number.isFinite(exp)) {
    return NextResponse.json({ error: "Invalid expiresAt. Use ISO or days.", env }, { status: 400 });
  }

  const now = nowIso();

  const item: FeaturedItem = {
    chainId,
    address,
    title,
    logoUrl,
    weight,
    promoted,
    createdAt: now,
    expiresAt: new Date(exp).toISOString(), // normalize to ISO
  };

  await upsertFeatured(item);

  const items = await listFeatured();
  return NextResponse.json({ ok: true, items, env });
}

// DELETE (ADMIN) -> remove featured
export async function DELETE(req: Request) {
  const ok = await requireAdmin();

  const env = {
    hasAdminWallet: !!process.env.ADMIN_WALLET,
    kvReady: kvReady(),
    hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  if (!ok) return NextResponse.json({ error: "Unauthorized", env }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const address = (searchParams.get("address") || "").toLowerCase();
  const chainId = Number(searchParams.get("chainId") || 8453);

  if (chainId !== 8453) {
    return NextResponse.json({ error: "Only Base (8453) supported.", env }, { status: 400 });
  }

  if (!isAddr(address)) {
    return NextResponse.json({ error: "Invalid address", env }, { status: 400 });
  }

  await removeFeatured(chainId, address);

  return NextResponse.json({ ok: true, env });
}
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FeaturedItem = {
  chainId: number; // 8453
  address: string;
  title?: string;

  // ✅ NEW: sponsor can have custom logo
  logoUrl?: string;

  weight: number;
  promoted: boolean;
  expiresAt?: string; // YYYY-MM-DD
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

// ✅ In-memory store (dev only). Later move to KV/DB.
let featured: FeaturedItem[] = [];

function isAddr(a?: string) {
  return !!a && /^0x[a-fA-F0-9]{40}$/.test(a);
}

function cleanStr(v: any, max = 80) {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function toInt(v: any, def = 10) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
}

function isDateYYYYMMDD(s?: string) {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isExpired(expiresAt?: string) {
  if (!expiresAt) return false;
  const today = new Date().toISOString().slice(0, 10);
  return expiresAt < today;
}

// GET → list featured items (sorted)
export async function GET() {
  const items = featured
    .filter((x) => !isExpired(x.expiresAt))
    .sort((a, b) => (b.weight || 0) - (a.weight || 0));

  return NextResponse.json({ items });
}

// POST → upsert featured item
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const chainId = toInt(body.chainId, 8453);
    const address = cleanStr(body.address, 60).toLowerCase();
    const title = cleanStr(body.title, 60) || undefined;

    // ✅ accept sponsor custom logo url (can be https://... or /sponsors/... from /public)
    const logoUrl = cleanStr(body.logoUrl, 300) || undefined;

    const weight = toInt(body.weight, 10);
    const promoted = !!body.promoted;

    const expiresAtRaw = cleanStr(body.expiresAt, 20);
    const expiresAt = isDateYYYYMMDD(expiresAtRaw) ? expiresAtRaw : undefined;

    if (!isAddr(address)) {
      return NextResponse.json({ error: "Invalid token address." }, { status: 400 });
    }

    const now = new Date().toISOString();

    const idx = featured.findIndex(
      (x) => x.address.toLowerCase() === address && x.chainId === chainId
    );

    if (idx >= 0) {
      featured[idx] = {
        ...featured[idx],
        title,
        logoUrl,
        weight,
        promoted,
        expiresAt,
        updatedAt: now,
      };
    } else {
      featured.push({
        chainId,
        address,
        title,
        logoUrl,
        weight,
        promoted,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      });
    }

    const items = featured
      .filter((x) => !isExpired(x.expiresAt))
      .sort((a, b) => (b.weight || 0) - (a.weight || 0));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad request" }, { status: 400 });
  }
}

// DELETE → remove featured by address query (?address=0x...)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = (searchParams.get("address") || "").toLowerCase();

    if (!isAddr(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    featured = featured.filter((x) => x.address.toLowerCase() !== address);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad request" }, { status: 400 });
  }
}
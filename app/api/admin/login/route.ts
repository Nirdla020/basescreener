import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyMessage } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function norm(a: string) {
  return a.trim().toLowerCase();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const address = norm(String(body.address || ""));
  const signature = String(body.signature || "");
  const message = String(body.message || "");

  const admin = process.env.ADMIN_WALLET ? norm(process.env.ADMIN_WALLET) : "";
  if (!admin) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 503 });
  }
  if (address !== admin) {
    return NextResponse.json({ error: "Not admin" }, { status: 403 });
  }

  // ✅ cookies() is async in your setup
  const cookieStore = await cookies();
  const nonce = cookieStore.get("admin_nonce")?.value || "";
  if (!nonce) {
    return NextResponse.json({ error: "Missing nonce" }, { status: 400 });
  }

  const expected = `BaseScreener Admin Login\nNonce: ${nonce}`;
  if (message !== expected) {
    return NextResponse.json({ error: "Message mismatch" }, { status: 400 });
  }

  const ok = await verifyMessage({
    address: address as `0x${string}`,
    message,
    signature: signature as `0x${string}`,
  });

  if (!ok) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // ✅ IMPORTANT: secure cookies break on http://localhost
  res.cookies.set("admin_addr", address, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  // clear nonce
  res.cookies.set("admin_nonce", "", {
    path: "/",
    maxAge: 0,
  });

  return res;
}
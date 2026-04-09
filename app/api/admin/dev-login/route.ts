import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { address } = await req.json();
  const addr = String(address || "").toLowerCase();

  const res = NextResponse.json({ ok: true, addr });

  // IMPORTANT for localhost:
  res.cookies.set("admin_addr", addr, {
    httpOnly: true,
    secure: false,     // ✅ must be false on http://localhost
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
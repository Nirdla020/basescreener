import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const nonce = crypto.randomUUID();
  const res = NextResponse.json({ nonce });

  res.cookies.set("admin_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // ✅ IMPORTANT
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return res;
}
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function norm(a: string) {
  return a.trim().toLowerCase();
}

export async function GET() {
  const admin = process.env.ADMIN_WALLET ? norm(process.env.ADMIN_WALLET) : "";
  if (!admin) return NextResponse.json({ authed: false }, { status: 503 });

  const cookieStore = await cookies(); // ✅ await
  const addr = cookieStore.get("admin_addr")?.value
    ? norm(cookieStore.get("admin_addr")!.value)
    : "";

  return NextResponse.json({ authed: addr === admin });
}
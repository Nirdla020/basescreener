import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const norm = (a?: string) => String(a || "").trim().toLowerCase();

export async function GET() {
  const admin = norm(process.env.ADMIN_WALLET);

  const store = await cookies();
  const addr = norm(store.get("admin_addr")?.value);

  return NextResponse.json({
    ADMIN_WALLET_set: Boolean(admin),
    ADMIN_WALLET: admin ? `${admin.slice(0, 6)}…${admin.slice(-4)}` : null,
    admin_addr_cookie: addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : null,
    match: Boolean(admin && addr && admin === addr),
  });
}
import { NextResponse } from "next/server";
import { notifyEmail } from "@/lib/notify";

export const runtime = "nodejs";

export async function GET() {
  await notifyEmail("BaseScreener test ✅", "<p>Email works!</p>");
  return NextResponse.json({ ok: true });
}
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const key = process.env.PINATA_API_KEY;
    const secret = process.env.PINATA_SECRET_API_KEY;

    if (!key || !secret) {
      return NextResponse.json(
        { error: "Missing PINATA_API_KEY or PINATA_SECRET_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json();

    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: key,
        pinata_secret_api_key: secret,
      } as any,
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: "Pinata JSON upload failed", details: json },
        { status: res.status }
      );
    }

    return NextResponse.json({ ipfsHash: json.IpfsHash });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
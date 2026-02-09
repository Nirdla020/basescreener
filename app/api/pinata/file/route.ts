import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

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

    const form = await req.formData();
    const file = form.get("file");

    // In Next.js, this will usually be a File (which is also a Blob)
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    // Optional safety checks
    const anyFile = file as any;
    const mime = anyFile?.type || "";
    const size = Number(anyFile?.size || 0);

    if (!mime.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
    }

    if (size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Image too large. Max ${(MAX_BYTES / 1024 / 1024).toFixed(0)}MB.` },
        { status: 413 }
      );
    }

    const data = new FormData();
    data.append("file", file, anyFile?.name ?? "upload.png");

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: key,
        pinata_secret_api_key: secret,
      } as any,
      body: data,
    });

    // Pinata sometimes returns non-JSON errors → read text first
    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      console.error("Pinata upload failed:", res.status, parsed ?? text);

      return NextResponse.json(
        {
          error: "Pinata file upload failed",
          status: res.status,
          details: parsed ?? text,
        },
        { status: res.status }
      );
    }

    // Success JSON should include IpfsHash
    const ipfsHash = parsed?.IpfsHash;
    if (!ipfsHash) {
      return NextResponse.json(
        { error: "Pinata response missing IpfsHash", details: parsed ?? text },
        { status: 500 }
      );
    }

    return NextResponse.json({ ipfsHash });
  } catch (e: any) {
    console.error("Server error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
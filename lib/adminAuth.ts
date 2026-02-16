import { cookies } from "next/headers";

function norm(a: string) {
  return String(a || "").trim().toLowerCase();
}

export async function requireAdmin() {
  const admin = process.env.ADMIN_WALLET ? norm(process.env.ADMIN_WALLET) : "";
  if (!admin) return { ok: false as const, error: "Admin not configured" };

  // ✅ cookies() is async in your setup
  const cookieStore = await cookies();
  const addr = norm(cookieStore.get("admin_addr")?.value || "");

  if (!addr) return { ok: false as const, error: "Not logged in" };
  if (addr !== admin) return { ok: false as const, error: "Not admin" };

  return { ok: true as const, adminAddr: addr };
}
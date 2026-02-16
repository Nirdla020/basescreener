import { cookies } from "next/headers";

function norm(a: string) {
  return a.trim().toLowerCase();
}

export async function requireAdmin() {
  const admin = process.env.ADMIN_WALLET ? norm(process.env.ADMIN_WALLET) : "";
  if (!admin) {
    const err: any = new Error("Admin not configured");
    err.status = 503;
    throw err;
  }

  const cookieStore = await cookies(); // ✅ await
  const raw = cookieStore.get("admin_addr")?.value || "";
  const addr = raw ? norm(raw) : "";

  if (addr !== admin) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }

  return { admin, addr };
}
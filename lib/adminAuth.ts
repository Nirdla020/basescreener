// lib/adminAuth.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function norm(a?: string) {
  return String(a || "").trim().toLowerCase();
}

/** Use in API routes: throws */
export async function requireAdmin() {
  const admin = norm(process.env.ADMIN_WALLET);
  if (!admin) throw new Error("ADMIN_NOT_CONFIGURED");

  const cookieStore = await cookies(); // ✅ IMPORTANT in your setup
  const addr = norm(cookieStore.get("admin_addr")?.value);

  if (!addr) throw new Error("NOT_LOGGED_IN");
  if (addr !== admin) throw new Error("NOT_ADMIN");

  return addr;
}

/** Use in pages/server components: redirects */
export async function requireAdminOrRedirect(redirectTo = "/") {
  try {
    return await requireAdmin();
  } catch {
    redirect(redirectTo);
  }
}
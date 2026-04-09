import { requireAdmin } from "@/lib/adminAuth";
import { listFeatured } from "@/lib/featuredStore";
import FeaturedAdminClient from "./ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAdmin();

  const items = await listFeatured(); // shows active items

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl font-bold">⭐ Featured Admin</div>
        <a
          href="/admin/earnings"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
        >
          Earnings
        </a>
      </div>

      <FeaturedAdminClient initialItems={items} />
    </main>
  );
}
import Link from "next/link";
import { redirect } from "next/navigation";

/* ---------------- Utils ---------------- */

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function extractAddress(input: string) {
  const cleaned = safeDecode(String(input || ""))
    .trim()
    .replace(/\s+/g, "")
    .replace(/\.+/g, "") // accept 0x1234...abcd
    .replace(/\/+$/, "");

  const m = cleaned.match(/0x[a-fA-F0-9]{40}/);
  return m ? m[0].toLowerCase() : "";
}

function isAddress(a: string) {
  return /^0x[a-f0-9]{40}$/.test(a);
}

export const metadata = {
  title: "Token Lookup | BaseScreener",
  description: "Paste a Base token contract address to view analytics.",
};

export default function TokenLookupPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const raw = searchParams?.q || "";
  const address = extractAddress(raw);

  // ✅ Redirect immediately if a valid address is present
  if (address && isAddress(address)) {
    redirect(`/token/${address}`);
  }

  return (
    <main className="min-h-screen text-white">
      <div className="page-container py-10">
        <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <h1 className="text-2xl font-extrabold">Token</h1>

          <p className="mt-2 text-sm text-white/70">
            Paste a Base token contract address in the navbar search.
          </p>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60">Examples</div>
            <div className="mt-2 space-y-1 text-sm text-white/80">
              <div className="break-all">/token/0x1234...abcd</div>
              <div className="break-all">/token?q=0x1234...abcd</div>
              <div className="break-all">
                BaseScan / DexScreener links also work
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold"
            >
              Go to Dashboard
            </Link>

            <Link
              href="/zora-trending"
              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm font-semibold"
            >
              View Trending
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
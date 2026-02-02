import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

function DashboardFallback() {
  return (
    <main className="min-h-screen text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-white/30 animate-pulse" />
            <div className="text-sm text-white/70">Loading dashboard…</div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardClient />
    </Suspense>
  );
}

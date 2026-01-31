import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[#020617] text-white p-6">Loading…</div>}
    >
      <DashboardClient />
    </Suspense>
  );
}

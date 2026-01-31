import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

export default function dashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardClient />
    </Suspense>
  );
}

function Loading() {
  return (
    <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
      <div className="animate-pulse text-blue-400 font-bold text-xl">
        Loading dashboard...
      </div>
    </main>
  );
}

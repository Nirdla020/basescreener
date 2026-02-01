import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
          <div className="text-blue-200">Loading dashboard...</div>
        </main>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}

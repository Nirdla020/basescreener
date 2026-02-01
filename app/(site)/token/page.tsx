import { Suspense } from "react";
import TokenClient from "./TokenClient";

export default function TokenPage() {
  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center text-blue-200">
            Loading token page...
          </div>
        }
      >
        <TokenClient />
      </Suspense>
    </main>
  );
}

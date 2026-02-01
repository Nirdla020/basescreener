"use client";

export default function SupportCTA() {
  return (
    <div className="mx-auto max-w-6xl px-4 mt-10">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold">❤️ Support BaseScreener</div>
          <div className="text-sm text-white/70">
            Ads + donations help cover servers and fund new features.
          </div>
        </div>

        <a
          href="#support"
          className="inline-flex items-center justify-center rounded-xl bg-pink-600 px-4 py-2 text-sm font-bold hover:bg-pink-500"
        >
          Support Now
        </a>
      </div>
    </div>
  );
}

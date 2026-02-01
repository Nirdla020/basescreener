import Link from "next/link";
import DonationLeaderboard from "../components/DonationLeaderboard";

export const metadata = {
  title: "Support BaseScreener",
  description: "Support BaseScreener development and server costs.",
};

export default function SupportPage() {
  const WALLET = "0xd3a961b02949fd944acdf2c890b33cdd7e84454b";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-white">
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-3xl font-extrabold">❤️ Support BaseScreener</h1>
          <p className="mt-2 text-white/70 max-w-2xl">
            BaseScreener is free to use. Donations help cover servers, data costs,
            and development of new features.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-white/70">
              Accepts: <span className="text-white">Base / ETH / USDC / USDT</span>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <div className="text-xs text-white/60">Donation Wallet (EVM)</div>
              <code className="rounded bg-white/10 px-3 py-2 text-xs break-all">
                {WALLET}
              </code>

              <a
                href="#leaderboard"
                className="text-sm text-blue-400 hover:underline"
              >
                View leaderboard ↓
              </a>
            </div>
          </div>

          <div className="mt-5 text-xs text-white/50">
            Note: Donations are voluntary and non-refundable. This platform is not financial advice.
          </div>
        </div>

        <div id="leaderboard">
          <DonationLeaderboard />
        </div>

        <div className="text-sm text-white/70">
          Back to{" "}
          <Link href="/dashboard" className="text-blue-400 hover:underline">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

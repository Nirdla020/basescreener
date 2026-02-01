import { DONATIONS } from "../data/donations";

function shorten(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export default function DonationLeaderboard() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">🏆 Donation Leaderboard</h2>
        <span className="text-xs text-white/50">Updated manually (for now)</span>
      </div>

      <p className="mt-2 text-sm text-white/70">
        Thank you to everyone supporting BaseScreener. ❤️
      </p>

      <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Wallet</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Chain</th>
            </tr>
          </thead>

          <tbody>
            {DONATIONS.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-white/70" colSpan={5}>
                  No donations yet — be the first supporter 🙏
                </td>
              </tr>
            ) : (
              DONATIONS.map((d, idx) => (
                <tr key={d.wallet + idx} className="border-t border-white/10">
                  <td className="px-4 py-3 font-semibold">{idx + 1}</td>
                  <td className="px-4 py-3">{d.name}</td>
                  <td className="px-4 py-3 text-white/70">
                    {shorten(d.wallet)}
                  </td>
                  <td className="px-4 py-3 font-semibold">{d.amount}</td>
                  <td className="px-4 py-3 text-white/70">{d.chain}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-white/50">
        Want to appear here? Donate and DM proof on X (tx hash) so you can be listed.
      </div>
    </section>
  );
}

import { listPayments, getEarningsSummary } from "@/lib/featuredStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------- Utils ---------- */

function weiToEth6(weiStr?: string) {
  if (!weiStr) return "—";
  try {
    const wei = BigInt(weiStr);
    const base = BigInt("1000000000000000000"); // 1e18
    const whole = wei / base;
    const frac = wei % base;

    const frac6 = (frac / BigInt("1000000000000")) // 1e12
      .toString()
      .padStart(6, "0");

    return `${whole.toString()}.${frac6}`;
  } catch {
    return "—";
  }
}

function shortAddr(a?: string) {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function fmtUsd(n?: number) {
  if (!n) return "$0";
  return `$${Number(n).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(ts?: string) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

/* ---------- Page ---------- */

export default async function RevenuePage() {
  const summary = await getEarningsSummary(500);
  const payments = await listPayments(100);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="text-2xl font-bold mb-4">💰 Earnings</div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-xs text-white/60">Total USD</div>
          <div className="text-lg font-bold">
            {fmtUsd(summary.totalUsd)}
          </div>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-xs text-white/60">Total ETH</div>
          <div className="text-lg font-bold">
            {weiToEth6(summary.totalWei)} ETH
          </div>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-xs text-white/60">Payments</div>
          <div className="text-lg font-bold">
            {summary.count}
          </div>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-xs text-white/60">Unique Payers</div>
          <div className="text-lg font-bold">
            {summary.uniquePayers}
          </div>
        </div>
      </div>

      {/* PAYMENTS TABLE */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Token</th>
              <th className="p-3 text-left">Payer</th>
              <th className="p-3 text-left">Days</th>
              <th className="p-3 text-left">USD</th>
              <th className="p-3 text-left">ETH</th>
              <th className="p-3 text-left">Tx</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr
                key={p.txHash}
                className="border-t border-white/5 hover:bg-white/5"
              >
                <td className="p-3">{fmtDate(p.ts)}</td>
                <td className="p-3">{shortAddr(p.tokenAddress)}</td>
                <td className="p-3">{shortAddr(p.payer)}</td>
                <td className="p-3">{p.days}</td>
                <td className="p-3">{fmtUsd(p.usd)}</td>
                <td className="p-3">
                  {weiToEth6(p.amountWei)} ETH
                </td>
                <td className="p-3">
                  <a
                    href={`https://basescan.org/tx/${p.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}

            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-white/60">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
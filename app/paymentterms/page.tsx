export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-sm text-white/80">
      <h1 className="text-2xl font-bold text-white mb-4">
        Promotion Terms & Conditions
      </h1>

      <div className="space-y-4 leading-relaxed">
        <p>
          By purchasing a promotion on this platform, you agree to the following
          terms.
        </p>

        <h2 className="font-semibold text-white">1. No Refund Policy</h2>
        <p>
          All payments are final. Once a transaction is confirmed onchain,
          refunds will not be issued.
        </p>

        <h2 className="font-semibold text-white">2. Manual Review</h2>
        <p>
          All promotions are manually reviewed. We reserve the right to reject
          scams, malicious projects, or harmful content.
        </p>

        <h2 className="font-semibold text-white">3. Duration</h2>
        <p>
          Promotion duration starts once approved, not at payment time.
        </p>

        <h2 className="font-semibold text-white">4. No Financial Advice</h2>
        <p>
          We do not endorse or guarantee any project. Users trade at their own
          risk.
        </p>

        <h2 className="font-semibold text-white">5. Abuse</h2>
        <p>
          Attempts to manipulate listings or provide false information may
          result in permanent bans.
        </p>

        <p className="pt-4 text-xs text-white/50">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </main>
  );
}
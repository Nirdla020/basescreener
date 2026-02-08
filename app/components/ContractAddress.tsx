"use client";

export default function ContractAddress() {
  const CA = "0x06640d7ba28d7e914a7f1e0d0283e95f4b02111c";

  return (
    <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3 bg-white/5 border border-blue-500/20 px-4 py-3 rounded-xl max-w-3xl mx-auto">
      <span className="text-sm font-bold text-blue-300">OFFICIAL CA:</span>

      <span className="font-mono text-sm break-all text-white">{CA}</span>

      <button
        onClick={() => {
          navigator.clipboard.writeText(CA);
          alert("Copied ✅");
        }}
        className="px-3 py-1 rounded-lg bg-blue-600 text-xs font-bold hover:bg-blue-500 transition"
      >
        Copy
      </button>
    </div>
  );
}

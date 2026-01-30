"use client";

export default function ContractAddress() {
  const CA = "0x7a773b71617d09770a43f457107850b0adaf89db";

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

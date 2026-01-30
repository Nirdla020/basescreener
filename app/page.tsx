export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A1AFF] flex flex-col items-center justify-center p-8">
      <h1 className="text-6xl font-extrabold text-white mb-4">BASESCREENER</h1>
      <p className="text-blue-200 text-lg mb-8">
        Aggressive on-chain analytics for BASE & ETH traders
      </p>
      <button className="px-8 py-4 bg-white text-[#0A1AFF] font-bold rounded-xl shadow-lg hover:scale-105 transition-transform">
        Launch App
      </button>
    </main>
  );
}
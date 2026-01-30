import Image from "next/image";
import Link from "next/link";
import ContractAddress from "./components/ContractAddress";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-6">
      <div className="text-center max-w-3xl">
        <Image
          src="/logo.png"
          alt="BaseScreener"
          width={420}
          height={110}
          priority
          className="mx-auto object-contain"
        />

        <h1 className="mt-6 text-4xl md:text-5xl font-extrabold">
          Track Base Tokens in Real-Time
        </h1>

        <p className="mt-4 text-blue-200 text-lg">
          Watch liquidity, volume, and smart money moves instantly.
        </p>

        {/* OFFICIAL CA + Copy button */}
        <ContractAddress />

        <div className="mt-8 flex justify-center gap-4 flex-wrap">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition"
          >
            Open Dashboard
          </Link>

          <Link
            href="/token"
            className="px-6 py-3 bg-white text-[#020617] rounded-xl font-bold hover:opacity-90 transition"
          >
            Token Lookup
          </Link>
        </div>
      </div>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="w-full bg-[#020617] border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center">

        {/* Logo - LEFT */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 mr-auto"
        >
          <Image
            src="/logo.png"
            alt="BaseScreener"
            width={40}
            height={40}
            priority
          />

          <span className="font-bold text-white text-lg">
            BaseScreener
          </span>
        </Link>

        {/* Menu - RIGHT */}
        <nav className="flex gap-6 text-sm text-blue-100">
          <Link href="/dashboard" className="hover:text-blue-400">
            Dashboard
          </Link>

          <Link href="/token" className="hover:text-blue-400">
            Token
          </Link>
        </nav>
      </div>
    </header>
  );
}

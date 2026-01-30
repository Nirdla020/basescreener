"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname(); // alam kung saang page ka

  return (
    <nav className="bg-[#020617] text-white p-4 flex justify-between items-center border-b border-blue-500/30">
      <h1 className="text-xl font-bold text-blue-400">BASESCREENER</h1>
      <div className="space-x-4">
        <Link
          href="/"
          className={`hover:text-blue-300 ${
            pathname === "/" ? "text-white font-bold underline" : ""
          }`}
        >
          Home
        </Link>
        <Link
          href="/dashboard"
          className={`hover:text-blue-300 ${
            pathname === "/dashboard" ? "text-white font-bold underline" : ""
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/token"
          className={`hover:text-blue-300 ${
            pathname === "/token" ? "text-white font-bold underline" : ""
          }`}
        >
          Token
        </Link>
      </div>
    </nav>
  );
}
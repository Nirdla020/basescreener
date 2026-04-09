"use client";

import type { FeaturedItem } from "@/lib/featuredStore";

export default function FeaturedAdminTable({
  initialRows,
}: {
  initialRows: FeaturedItem[];
}) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-white/60">
          <tr>
            <th className="p-3 text-left">Token</th>
            <th className="p-3 text-left">Title</th>
            <th className="p-3 text-left">Expires</th>
            <th className="p-3 text-left">Payer</th>
          </tr>
        </thead>

        <tbody>
          {initialRows.map((r) => (
            <tr key={r.address} className="border-t border-white/5">
              <td className="p-3">{r.address}</td>
              <td className="p-3">{r.title || "—"}</td>
              <td className="p-3">{r.expiresAt}</td>
              <td className="p-3">{r.payer || "—"}</td>
            </tr>
          ))}

          {initialRows.length === 0 && (
            <tr>
              <td colSpan={4} className="p-6 text-center text-white/60">
                No featured items.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
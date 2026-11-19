import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import Link from "next/link";
import { StatCard } from "@/components/admin/StatCard";

export default async function AdminDiscountsPage() {
  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const activeCodes = codes.filter((c) => c.active && (!c.validTo || now <= c.validTo));
  const expiredCodes = codes.filter((c) => c.validTo && now > c.validTo);
  const totalUsage = codes.reduce((sum, c) => sum + c.usageCount, 0);

  function formatDate(d: Date | null) {
    if (!d) return "—";
    return d.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Slevové kódy</h1>
          <p className="text-sm text-gray-500 mt-1">
            {codes.length} {codes.length === 1 ? "kód" : codes.length < 5 ? "kódy" : "kódů"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/admin/discounts/export"
            download
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Export CSV
          </a>
          <Link
            href="/admin/slevy/novy"
            className="px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            + Nový kód
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Aktivní kódy" value={String(activeCodes.length)} />
        <StatCard label="Celkem využití" value={String(totalUsage)} />
        <StatCard label="Vypršelé" value={String(expiredCodes.length)} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {codes.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <p className="text-[15px] font-bold text-gray-900 mb-1">Zatím žádné slevové kódy</p>
            <p className="text-[13px] text-gray-500 mb-5">Vytvořte první slevový kód pro vaše zákazníky.</p>
            <Link
              href="/admin/slevy/novy"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            >
              + Nový kód
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Kód</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">Typ</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Sleva</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 hidden md:table-cell">Použití</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">Platnost</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {codes.map((code) => {
                  const now = new Date();
                  const expired = code.validTo && now > code.validTo;
                  const exhausted = code.usageLimit && code.usageCount >= code.usageLimit;

                  return (
                    <tr key={code.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/slevy/${code.id}`}
                          className="font-mono text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {code.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                        {code.type === "percentage" ? "Procenta" : "Fixní"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {code.type === "percentage"
                          ? `${code.value} %`
                          : formatPrice(code.value)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 hidden md:table-cell">
                        {code.usageCount}
                        {code.usageLimit ? ` / ${code.usageLimit}` : ""}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap hidden lg:table-cell">
                        {code.validFrom || code.validTo
                          ? `${formatDate(code.validFrom)} – ${formatDate(code.validTo)}`
                          : "Bez omezení"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!code.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            Neaktivní
                          </span>
                        ) : expired ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            Vypršel
                          </span>
                        ) : exhausted ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                            Vyčerpán
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Aktivní
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

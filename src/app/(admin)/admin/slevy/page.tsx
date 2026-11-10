import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import Link from "next/link";

export default async function AdminDiscountsPage() {
  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Slevové kódy</h1>
          <p className="text-sm text-gray-500 mt-1">
            {codes.length} {codes.length === 1 ? "kód" : codes.length < 5 ? "kódy" : "kódů"}
          </p>
        </div>
        <Link
          href="/admin/slevy/novy"
          className="px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          + Nový kód
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {codes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Zatím žádné slevové kódy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Kód</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Typ</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Sleva</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Použití</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Platnost</th>
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
                      <td className="px-4 py-3 text-gray-600">
                        {code.type === "percentage" ? "Procenta" : "Fixní"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {code.type === "percentage"
                          ? `${code.value} %`
                          : formatPrice(code.value)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {code.usageCount}
                        {code.usageLimit ? ` / ${code.usageLimit}` : ""}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
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

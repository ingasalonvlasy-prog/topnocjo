import Link from "next/link";
import { prisma } from "@/lib/db";

const actionLabels: Record<string, string> = {
  create: "Vytvořeno",
  update: "Upraveno",
  delete: "Smazáno",
  status_change: "Změna stavu",
  bulk_update: "Hromadná úprava",
  bulk_delete: "Hromadné smazání",
};

const entityLabels: Record<string, string> = {
  product: "Produkt",
  order: "Objednávka",
  discount: "Sleva",
  review: "Recenze",
};

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-amber-100 text-amber-700",
  delete: "bg-red-100 text-red-700",
  status_change: "bg-blue-100 text-blue-700",
  bulk_update: "bg-amber-100 text-amber-700",
  bulk_delete: "bg-red-100 text-red-700",
};

export default async function AdminLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const entityFilter = (sp.entity as string) || undefined;
  const actionFilter = (sp.action as string) || undefined;
  const page = Number(sp.page) || 1;
  const perPage = 50;

  const where: Record<string, unknown> = {};
  if (entityFilter) where.entity = entityFilter;
  if (actionFilter) where.action = actionFilter;

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.adminLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Log aktivit</h1>
        <span className="text-sm text-gray-500">{total} záznamů</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/admin/log"
          className={`px-3 py-1.5 text-xs font-medium rounded-full ${
            !entityFilter && !actionFilter
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Vše
        </Link>
        {Object.entries(entityLabels).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/log?entity=${key}`}
            className={`px-3 py-1.5 text-xs font-medium rounded-full ${
              entityFilter === key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Log table */}
      {logs.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left font-medium text-gray-500 px-4 py-3">Čas</th>
                <th className="text-left font-medium text-gray-500 px-4 py-3">Akce</th>
                <th className="text-left font-medium text-gray-500 px-4 py-3">Entita</th>
                <th className="text-left font-medium text-gray-500 px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap tabular-nums">
                    {log.createdAt.toLocaleDateString("cs-CZ")}
                    {" "}
                    {log.createdAt.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${actionColors[log.action] || "bg-gray-100 text-gray-700"}`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {entityLabels[log.entity] || log.entity}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[400px] truncate">
                    {log.detail || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-sm text-gray-500">Zatím žádná aktivita.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={`/admin/log?page=${page - 1}${entityFilter ? `&entity=${entityFilter}` : ""}${actionFilter ? `&action=${actionFilter}` : ""}`}
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50"
            >
              &laquo; Předchozí
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-gray-500">
            Strana {page} z {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/log?page=${page + 1}${entityFilter ? `&entity=${entityFilter}` : ""}${actionFilter ? `&action=${actionFilter}` : ""}`}
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Další &raquo;
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function createSupplier(formData: FormData) {
  "use server";

  const name = (formData.get("name") as string)?.trim();
  const code = (formData.get("code") as string)?.trim().toLowerCase();
  const feedUrl = (formData.get("feedUrl") as string)?.trim();
  const feedFormat = (formData.get("feedFormat") as string) || "xml";

  if (!name || !code || !feedUrl) return;

  await prisma.supplier.create({
    data: { name, code, feedUrl, feedFormat },
  });

  revalidatePath("/admin/dodavatele");
  redirect("/admin/dodavatele");
}

async function triggerImport(formData: FormData) {
  "use server";

  const supplierId = formData.get("supplierId") as string;
  if (!supplierId) return;

  const { runFeedImport } = await import("@/lib/feed");

  try {
    await runFeedImport(supplierId);
  } catch {
    // Error logged in FeedImportLog
  }

  revalidatePath("/admin/dodavatele");
  redirect("/admin/dodavatele");
}

async function triggerAllImports() {
  "use server";

  const { runAllFeedImports } = await import("@/lib/feed");

  try {
    await runAllFeedImports();
  } catch {
    // Errors logged per supplier
  }

  revalidatePath("/admin/dodavatele");
  redirect("/admin/dodavatele");
}

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
  });

  const recentLogs = await prisma.feedImportLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dodavatelé</h1>
          <p className="text-sm text-gray-500 mt-1">{suppliers.length} dodavatelů</p>
        </div>
        <form action={triggerAllImports}>
          <button
            type="submit"
            className="h-9 px-4 flex items-center gap-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            Importovat všechny
          </button>
        </form>
      </div>

      {/* Supplier list */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Dodavatel</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Formát</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Poslední import</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Stav</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/dodavatele/${s.id}`} className="font-medium text-gray-900 hover:text-green-600">
                    {s.name}
                  </Link>
                  <p className="text-xs text-gray-400 font-mono">{s.code}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 uppercase">
                    {s.feedFormat}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {s.lastImportAt
                    ? new Date(s.lastImportAt).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "—"}
                  {s.lastImportCount != null && (
                    <span className="text-xs text-gray-400 ml-1">({s.lastImportCount} variant)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {s.lastImportStatus === "success" && (
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">OK</span>
                  )}
                  {s.lastImportStatus === "partial" && (
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Partial</span>
                  )}
                  {s.lastImportStatus === "error" && (
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">Chyba</span>
                  )}
                  {!s.lastImportStatus && (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <form action={triggerImport} className="inline">
                    <input type="hidden" name="supplierId" value={s.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-green-600 hover:text-green-800 transition-colors"
                    >
                      Importovat
                    </button>
                  </form>
                  <span className="text-gray-300 mx-2">|</span>
                  <Link href={`/admin/dodavatele/${s.id}`} className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Žádní dodavatelé. Přidej prvního níže.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add supplier form */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Přidat dodavatele</h2>
        <form action={createSupplier} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Název</label>
            <input
              name="name"
              required
              placeholder="Levelek"
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:border-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Kód (prefix)</label>
            <input
              name="code"
              required
              placeholder="levelek"
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md font-mono focus:border-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Feed URL</label>
            <input
              name="feedUrl"
              required
              placeholder="https://..."
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md font-mono focus:border-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Formát</label>
            <select
              name="feedFormat"
              className="w-full h-9 px-2 text-sm border border-gray-300 rounded-md bg-white focus:border-green-500 outline-none"
            >
              <option value="xml">XML</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <button
            type="submit"
            className="h-9 px-4 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Přidat
          </button>
        </form>
      </div>

      {/* Recent import logs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Poslední importy</h2>
        {recentLogs.length > 0 ? (
          <div className="space-y-2">
            {recentLogs.map((log) => {
              const supplier = suppliers.find((s) => s.id === log.supplierId);
              return (
                <div key={log.id} className="flex items-center gap-4 text-sm py-2 border-b border-gray-100 last:border-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    log.status === "success" ? "bg-green-500" : log.status === "partial" ? "bg-yellow-500" : "bg-red-500"
                  }`} />
                  <span className="font-medium text-gray-900 w-28 truncate">{supplier?.name || log.supplierId}</span>
                  <span className="text-gray-500">
                    {log.variantsUpdated} updated, {log.variantsZeroed} zeroed
                  </span>
                  <span className="text-gray-400 text-xs">{log.duration}ms</span>
                  <span className="text-gray-400 text-xs ml-auto">
                    {new Date(log.createdAt).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {log.error && (
                    <span className="text-red-500 text-xs truncate max-w-[200px]" title={log.error}>
                      {log.error.slice(0, 60)}...
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Žádné importy.</p>
        )}
      </div>
    </div>
  );
}

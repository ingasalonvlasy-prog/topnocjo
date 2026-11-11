import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

async function updateSupplier(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const code = (formData.get("code") as string)?.trim().toLowerCase();
  const feedUrl = (formData.get("feedUrl") as string)?.trim();
  const feedFormat = (formData.get("feedFormat") as string) || "xml";
  const feedConfig = (formData.get("feedConfig") as string)?.trim() || "{}";
  const active = formData.get("active") === "on";
  const contactName = (formData.get("contactName") as string)?.trim() || null;
  const contactEmail = (formData.get("contactEmail") as string)?.trim() || null;
  const contactPhone = (formData.get("contactPhone") as string)?.trim() || null;
  const website = (formData.get("website") as string)?.trim() || null;
  const note = (formData.get("note") as string)?.trim() || null;

  // Validate JSON
  try {
    JSON.parse(feedConfig);
  } catch {
    redirect(`/admin/dodavatele/${id}?error=json`);
  }

  await prisma.supplier.update({
    where: { id },
    data: { name, code, feedUrl, feedFormat, feedConfig, active, contactName, contactEmail, contactPhone, website, note },
  });

  revalidatePath(`/admin/dodavatele/${id}`);
  redirect(`/admin/dodavatele/${id}?saved=1`);
}

async function deleteSupplier(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = formData.get("id") as string;
  await prisma.supplier.delete({ where: { id } });

  revalidatePath("/admin/dodavatele");
  redirect("/admin/dodavatele");
}

async function triggerImport(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = formData.get("id") as string;
  const { runFeedImport } = await import("@/lib/feed");

  try {
    await runFeedImport(id);
  } catch {
    // Error logged
  }

  revalidatePath(`/admin/dodavatele/${id}`);
  redirect(`/admin/dodavatele/${id}`);
}

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const saved = sp.saved as string | undefined;
  const error = sp.error as string | undefined;

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  const logs = await prisma.feedImportLog.findMany({
    where: { supplierId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/dodavatele" className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
          <p className="text-sm text-gray-500 font-mono">{supplier.code}</p>
        </div>
        <form action={triggerImport}>
          <input type="hidden" name="id" value={supplier.id} />
          <button
            type="submit"
            className="h-9 px-4 flex items-center gap-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            Importovat teď
          </button>
        </form>
      </div>

      {saved && (
        <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg mb-4">Změny uloženy.</p>
      )}
      {error === "json" && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">Neplatný JSON v konfiguraci feedu.</p>
      )}

      {/* Last import status */}
      {supplier.lastImportStatus && (
        <div className={`p-4 rounded-lg mb-6 ${
          supplier.lastImportStatus === "success" ? "bg-green-50 border border-green-200" :
          supplier.lastImportStatus === "partial" ? "bg-yellow-50 border border-yellow-200" :
          "bg-red-50 border border-red-200"
        }`}>
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${
              supplier.lastImportStatus === "success" ? "bg-green-500" :
              supplier.lastImportStatus === "partial" ? "bg-yellow-500" : "bg-red-500"
            }`} />
            <span className="font-medium">
              Poslední import: {supplier.lastImportStatus === "success" ? "OK" : supplier.lastImportStatus === "partial" ? "Částečný" : "Chyba"}
            </span>
            {supplier.lastImportAt && (
              <span className="text-gray-500">
                {new Date(supplier.lastImportAt).toLocaleString("cs-CZ")}
              </span>
            )}
            {supplier.lastImportCount != null && (
              <span className="text-gray-500">({supplier.lastImportCount} variant)</span>
            )}
          </div>
          {supplier.lastImportError && (
            <p className="text-xs text-red-600 mt-2 font-mono">{supplier.lastImportError}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit form */}
        <div className="lg:col-span-2">
          <form action={updateSupplier}>
            <input type="hidden" name="id" value={supplier.id} />

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Nastavení</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Název</label>
                  <input
                    name="name"
                    defaultValue={supplier.name}
                    required
                    className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kód</label>
                  <input
                    name="code"
                    defaultValue={supplier.code}
                    required
                    className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md font-mono focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Feed URL</label>
                <input
                  name="feedUrl"
                  defaultValue={supplier.feedUrl}
                  required
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md font-mono focus:border-green-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Formát feedu</label>
                  <select
                    name="feedFormat"
                    defaultValue={supplier.feedFormat}
                    className="w-full h-9 px-2 text-sm border border-gray-300 rounded-md bg-white focus:border-green-500 outline-none"
                  >
                    <option value="xml">XML</option>
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm cursor-pointer h-9">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={supplier.active}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-gray-700">Aktivní</span>
                  </label>
                </div>
              </div>

              {/* Kontaktní údaje */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Kontaktní údaje</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Kontaktní osoba</label>
                    <input
                      name="contactName"
                      defaultValue={supplier.contactName || ""}
                      className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                    <input
                      name="contactEmail"
                      type="email"
                      defaultValue={supplier.contactEmail || ""}
                      className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Telefon</label>
                    <input
                      name="contactPhone"
                      defaultValue={supplier.contactPhone || ""}
                      className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Web</label>
                    <input
                      name="website"
                      defaultValue={supplier.website || ""}
                      className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md font-mono focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Poznámka</label>
                  <textarea
                    name="note"
                    defaultValue={supplier.note || ""}
                    rows={3}
                    placeholder="Interní poznámka k dodavateli..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-green-500 outline-none resize-y"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Feed Config (JSON) — mapování polí
                </label>
                <textarea
                  name="feedConfig"
                  defaultValue={JSON.stringify(JSON.parse(supplier.feedConfig || "{}"), null, 2)}
                  rows={12}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md font-mono focus:border-green-500 outline-none resize-y"
                  placeholder={`{
  "xmlItemPath": "products.product",
  "sku": "code",
  "name": "name",
  "price": "price_vat",
  "stock": "stock_quantity"
}`}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Pole: sku, name, size, color, price, comparePrice, stock, csvDelimiter, csvEncoding, xmlItemPath, jsonItemPath, priceMultiplier, priceInCents, stockMapping
                </p>
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Ukázka konfigurace</summary>
                  <pre className="mt-1 p-3 bg-gray-50 rounded-md text-xs font-mono text-gray-500 overflow-x-auto">{`{
  "xmlItemPath": "products.product",
  "sku": "code",
  "name": "name",
  "size": "size",
  "color": "color",
  "price": "price_vat",
  "stock": "stock_quantity",
  "priceInCents": false,
  "priceMultiplier": 1
}`}</pre>
                </details>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="h-9 px-6 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Uložit
                </button>
              </div>
            </div>
          </form>

          {/* Delete */}
          <form action={deleteSupplier} className="bg-white rounded-lg border border-red-200 shadow-sm p-6">
            <input type="hidden" name="id" value={supplier.id} />
            <h3 className="text-sm font-semibold text-red-600 mb-2">Smazat dodavatele</h3>
            <p className="text-xs text-gray-500 mb-3">Toto smaže dodavatele a všechny jeho importní logy. supplierStock na variantách zůstane.</p>
            <button
              type="submit"
              className="h-8 px-4 text-xs font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
            >
              Smazat dodavatele
            </button>
          </form>
        </div>

        {/* Import log */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import log</h2>
            {logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="pb-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        log.status === "success" ? "bg-green-500" : log.status === "partial" ? "bg-yellow-500" : "bg-red-500"
                      }`} />
                      <span className="text-xs font-medium text-gray-700">
                        {log.status === "success" ? "OK" : log.status === "partial" ? "Částečný" : "Chyba"}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(log.createdAt).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {log.variantsUpdated} aktualizováno, {log.variantsZeroed} vynulováno, {log.duration}ms
                    </div>
                    {log.error && (
                      <p className="text-xs text-red-500 mt-1 truncate" title={log.error}>{log.error.slice(0, 100)}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Žádné importy.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

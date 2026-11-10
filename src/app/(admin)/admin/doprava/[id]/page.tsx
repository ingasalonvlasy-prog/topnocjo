import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ZasilkovnaConfig } from "@/components/admin/ZasilkovnaConfig";

export default async function ShippingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const method = await prisma.shippingMethod.findUnique({ where: { id } });

  if (!method) {
    redirect("/admin/doprava");
  }

  const config = JSON.parse(method.config || "{}");

  async function updateShippingMethod(formData: FormData) {
    "use server";

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = parseInt(formData.get("price") as string, 10) || 0;
    const freeFromStr = formData.get("freeFrom") as string;
    const freeFrom = freeFromStr ? parseInt(freeFromStr, 10) || null : null;
    const active = formData.get("active") === "on";
    const type = formData.get("type") as string;
    const position = parseInt(formData.get("position") as string, 10) || 0;

    // Build config from provider-specific fields
    const configObj: Record<string, string> = {};
    const code = formData.get("code") as string;

    if (code === "zasilkovna") {
      const apiKey = formData.get("config_apiKey") as string;
      const senderLabel = formData.get("config_senderLabel") as string;
      if (apiKey) configObj.apiKey = apiKey;
      if (senderLabel) configObj.senderLabel = senderLabel;
    } else if (code === "gls") {
      const note = formData.get("config_note") as string;
      if (note) configObj.note = note;
    } else if (code === "pickup") {
      const address = formData.get("config_address") as string;
      const note = formData.get("config_note") as string;
      if (address) configObj.address = address;
      if (note) configObj.note = note;
    }

    await prisma.shippingMethod.update({
      where: { id },
      data: {
        name,
        description: description || null,
        price,
        freeFrom,
        active,
        type,
        position,
        config: JSON.stringify(configObj),
      },
    });

    revalidatePath("/admin/doprava");
    redirect("/admin/doprava");
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/doprava"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Zpět na dopravu
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{method.name}</h1>
        <p className="text-sm text-gray-500 mt-1">Upravit metodu dopravy</p>
      </div>

      <form action={updateShippingMethod}>
        <input type="hidden" name="code" value={method.code} />

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Basic fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Název</label>
              <input
                name="name"
                type="text"
                defaultValue={method.name}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kód</label>
              <input
                type="text"
                value={method.code}
                disabled
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-sm text-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Popis</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={method.description || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cena (Kč)</label>
              <input
                name="price"
                type="number"
                min={0}
                defaultValue={method.price}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zdarma od (Kč)</label>
              <input
                name="freeFrom"
                type="number"
                min={0}
                defaultValue={method.freeFrom ?? ""}
                placeholder="Nevyplněno = vždy platí cena"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Typ doručení</label>
              <select
                name="type"
                defaultValue={method.type}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="address">Na adresu</option>
                <option value="pickup_point">Výdejní místo</option>
                <option value="personal">Osobní vyzvednutí</option>
              </select>
            </div>
            <div className="flex items-center pt-6">
              <input
                name="active"
                type="checkbox"
                defaultChecked={method.active}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">Aktivní</label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pořadí</label>
            <input
              name="position"
              type="number"
              min={0}
              defaultValue={method.position}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Nižší číslo = zobrazí se výš</p>
          </div>

          {/* Provider-specific config */}
          {method.code === "zasilkovna" && (
            <ZasilkovnaConfig
              apiKey={config.apiKey || ""}
              senderLabel={config.senderLabel || ""}
            />
          )}

          {method.code === "gls" && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                GLS
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
                <input
                  name="config_note"
                  type="text"
                  defaultValue={config.note || ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {method.code === "pickup" && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                Osobní vyzvednutí
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresa</label>
                  <input
                    name="config_address"
                    type="text"
                    defaultValue={config.address || ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
                  <input
                    name="config_note"
                    type="text"
                    defaultValue={config.note || ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Uložit změny
          </button>
          <Link
            href="/admin/doprava"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Zrušit
          </Link>
        </div>
      </form>
    </div>
  );
}

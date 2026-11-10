import Link from "next/link";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export default async function ShippingPage() {
  const methods = await prisma.shippingMethod.findMany({
    orderBy: { position: "asc" },
  });

  async function toggleActive(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const current = formData.get("active") === "true";
    await prisma.shippingMethod.update({
      where: { id },
      data: { active: !current },
    });
    revalidatePath("/admin/doprava");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doprava</h1>
          <p className="text-sm text-gray-500 mt-1">Správa dopravců a metod doručení</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Název</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Kód</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Typ</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Cena</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Zdarma od</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Stav</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Konfigurace</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Akce</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((m) => {
              const typeLabel = m.type === "address"
                ? { text: "Na adresu", cls: "bg-blue-100 text-blue-700" }
                : m.type === "pickup_point"
                ? { text: "Výdejní místo", cls: "bg-orange-100 text-orange-700" }
                : m.type === "personal"
                ? { text: "Osobní", cls: "bg-purple-100 text-purple-700" }
                : { text: m.type, cls: "bg-gray-100 text-gray-700" };

              const config = JSON.parse(m.config || "{}");
              const configSummary = m.code === "zasilkovna"
                ? config.apiKey
                  ? `API: ${config.apiKey.slice(0, 4)}••••${config.apiKey.slice(-4)}`
                  : "Chybí API klíč"
                : m.code === "gls"
                ? config.note || "—"
                : m.code === "pickup"
                ? config.address || "—"
                : "—";
              const zasilkovnaOk = m.code === "zasilkovna" && !!config.apiKey;

              return (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{m.name}</div>
                    {m.description && (
                      <div className="text-xs text-gray-500 mt-0.5">{m.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{m.code}</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${typeLabel.cls}`}>
                      {typeLabel.text}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {m.price === 0 ? (
                      <span className="text-green-600">Zdarma</span>
                    ) : (
                      `${m.price} Kč`
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {m.freeFrom ? `${m.freeFrom} Kč` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleActive}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="active" value={String(m.active)} />
                      <button
                        type="submit"
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
                          m.active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {m.active ? "Aktivní" : "Neaktivní"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {m.code === "zasilkovna" ? (
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${zasilkovnaOk ? "bg-green-400" : "bg-red-400"}`} />
                        {configSummary}
                      </span>
                    ) : (
                      configSummary
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/doprava/${m.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Upravit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {methods.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Žádné metody dopravy
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

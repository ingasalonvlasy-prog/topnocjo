import Link from "next/link";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ShippingPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab = params.tab || "aktivni";

  const methods = await prisma.shippingMethod.findMany({
    orderBy: { position: "asc" },
  });

  const filtered = tab === "aktivni"
    ? methods.filter((m) => m.active)
    : tab === "neaktivni"
    ? methods.filter((m) => !m.active)
    : methods;

  const activeCount = methods.filter((m) => m.active).length;
  const inactiveCount = methods.filter((m) => !m.active).length;

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

  const tabs = [
    { key: "aktivni", label: "Aktivní", count: activeCount },
    { key: "neaktivni", label: "Neaktivní", count: inactiveCount },
    { key: "vse", label: "Vše", count: methods.length },
  ];

  const TYPE_LABELS: Record<string, { text: string; cls: string }> = {
    address: { text: "Na adresu", cls: "bg-blue-100 text-blue-700" },
    pickup_point: { text: "Výdejní místo", cls: "bg-orange-100 text-orange-700" },
    personal: { text: "Osobní", cls: "bg-purple-100 text-purple-700" },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doprava</h1>
          <p className="text-sm text-gray-500 mt-1">
            Správa dopravců a metod doručení
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/doprava?tab=${t.key}`}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {t.label}
            <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full ${
              tab === t.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
            }`}>
              {t.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            {tab === "aktivni"
              ? "Žádné aktivní metody dopravy."
              : tab === "neaktivni"
              ? "Žádné neaktivní metody dopravy."
              : "Žádné metody dopravy."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const typeLabel = TYPE_LABELS[m.type] || { text: m.type, cls: "bg-gray-100 text-gray-700" };
            const config = JSON.parse(m.config || "{}");
            const configSummary = m.code === "zasilkovna"
              ? config.apiKey
                ? `API: ${config.apiKey.slice(0, 4)}••••${config.apiKey.slice(-4)}`
                : "Chybí API klíč"
              : m.code === "gls"
              ? config.note || null
              : m.code === "pickup"
              ? config.address || null
              : null;
            const zasilkovnaOk = m.code === "zasilkovna" && !!config.apiKey;

            return (
              <div
                key={m.id}
                className={`bg-white rounded-lg border shadow-sm overflow-hidden ${
                  m.active ? "border-gray-200" : "border-gray-200 opacity-60"
                }`}
              >
                {/* Card header */}
                <div className="px-4 pt-4 pb-3 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{m.name}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${typeLabel.cls}`}>
                        {typeLabel.text}
                      </span>
                    </div>
                    {m.description && (
                      <p className="text-xs text-gray-500">{m.description}</p>
                    )}
                  </div>
                  <form action={toggleActive}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="active" value={String(m.active)} />
                    <button
                      type="submit"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer ${
                        m.active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${m.active ? "bg-green-500" : "bg-red-500"}`} />
                      {m.active ? "Aktivní" : "Neaktivní"}
                    </button>
                  </form>
                </div>

                {/* Card body */}
                <div className="px-4 pb-3 space-y-2">
                  {/* Price info */}
                  <div className="flex items-center gap-2 text-sm">
                    {m.price === 0 ? (
                      <span className="font-medium text-green-600">Zdarma</span>
                    ) : (
                      <span className="font-medium text-gray-900">{m.price} Kč</span>
                    )}
                    {m.freeFrom && (
                      <>
                        <span className="text-gray-300">&middot;</span>
                        <span className="text-gray-500">Zdarma od {m.freeFrom} Kč</span>
                      </>
                    )}
                  </div>

                  {/* Config summary */}
                  {configSummary && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      {m.code === "zasilkovna" && (
                        <span className={`w-2 h-2 rounded-full ${zasilkovnaOk ? "bg-green-400" : "bg-red-400"}`} />
                      )}
                      {configSummary}
                    </div>
                  )}

                  {/* Code */}
                  <div className="text-xs text-gray-400">
                    Kód: <code className="bg-gray-100 px-1 py-0.5 rounded">{m.code}</code>
                    <span className="mx-1">&middot;</span>
                    Pořadí: {m.position}
                  </div>
                </div>

                {/* Card footer */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <Link
                    href={`/admin/doprava/${m.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    Upravit &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

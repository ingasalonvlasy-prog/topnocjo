import { prisma } from "@/lib/db";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Koncept", color: "bg-gray-100 text-gray-700" },
  SCHEDULED: { label: "Naplánováno", color: "bg-blue-100 text-blue-700" },
  SENT: { label: "Odesláno", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Zrušeno", color: "bg-red-100 text-red-700" },
};

const FILTER_TABS = [
  { key: "", label: "Všechny" },
  { key: "DRAFT", label: "Koncepty" },
  { key: "SENT", label: "Odeslané" },
  { key: "SCHEDULED", label: "Plánované" },
] as const;

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CampaignsListPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = params.filter || "";

  const where = filter ? { status: filter } : {};

  const campaigns = await prisma.newsletterCampaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const activeCount = await prisma.newsletterSubscriber.count({
    where: { active: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kampaně</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeCount} aktivních odběratelů
          </p>
        </div>
        <Link
          href="/admin/newsletter/kampane/nova"
          className="px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          + Nová kampaň
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {FILTER_TABS.map((tab) => {
          const href = tab.key
            ? `/admin/newsletter/kampane?filter=${tab.key}`
            : "/admin/newsletter/kampane";
          const active = filter === tab.key;
          return (
            <Link
              key={tab.key}
              href={href}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-2">Zatím nemáte žádné kampaně.</p>
            <Link
              href="/admin/newsletter/kampane/nova"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Vytvořit první kampaň
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Název
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">
                    Předmět
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Stav
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">
                    Příjemců
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">
                    Datum
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map((c) => {
                  const st = STATUS_LABELS[c.status] || STATUS_LABELS.DRAFT;
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/newsletter/kampane/${c.id}`}
                          className="text-gray-900 font-medium hover:text-blue-600"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell max-w-[200px] truncate">
                        {c.subject}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                        {c.recipientCount > 0 ? c.recipientCount : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap hidden md:table-cell">
                        {c.sentAt
                          ? c.sentAt.toLocaleDateString("cs-CZ", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : c.scheduledAt
                            ? `Plán: ${c.scheduledAt.toLocaleDateString("cs-CZ", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4">
        <Link
          href="/admin/newsletter"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Zpět na odběratele
        </Link>
      </div>
    </div>
  );
}

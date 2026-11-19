import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/StatCard";
import { sendRecoveryEmail, deleteAbandonedCheckout } from "./actions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + "\u00A0Kč";
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Otevřená", cls: "bg-yellow-100 text-yellow-700" },
  EMAIL_SENT: { label: "Email odeslán", cls: "bg-blue-100 text-blue-700" },
  RECOVERED: { label: "Obnoveno", cls: "bg-green-100 text-green-700" },
  EXPIRED: { label: "Expirováno", cls: "bg-gray-100 text-gray-500" },
};

export default async function AbandonedCheckoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const statusFilter = (sp.stav as string) || "all";
  const searchQuery = (sp.q as string) || "";
  const page = Math.max(1, parseInt((sp.stranka as string) || "1"));
  const perPage = 25;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Stats
  const [totalCount, recoveredCount, lostValue, allCheckouts30d] = await Promise.all([
    prisma.abandonedCheckout.count({
      where: { createdAt: { gte: thirtyDaysAgo }, status: { not: "EXPIRED" } },
    }),
    prisma.abandonedCheckout.count({
      where: { createdAt: { gte: thirtyDaysAgo }, status: "RECOVERED" },
    }),
    prisma.abandonedCheckout.aggregate({
      _sum: { subtotal: true },
      where: { status: { in: ["OPEN", "EMAIL_SENT"] } },
    }),
    prisma.abandonedCheckout.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, status: { not: "EXPIRED" } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const recoveryRate = totalCount > 0 ? Math.round((recoveredCount / totalCount) * 100) : 0;
  const lostAmount = lostValue._sum.subtotal || 0;

  // Sparkline: daily abandoned checkouts over 30 days
  const dailyMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const c of allCheckouts30d) {
    const key = new Date(c.createdAt).toISOString().slice(0, 10);
    if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
  }
  const sparkline = Array.from(dailyMap.values());

  // Build filter
  const where: Record<string, unknown> = {};
  if (statusFilter !== "all") {
    where.status = statusFilter;
  }
  if (searchQuery) {
    where.email = { contains: searchQuery };
  }

  const [checkouts, totalFiltered] = await Promise.all([
    prisma.abandonedCheckout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.abandonedCheckout.count({ where }),
  ]);

  const totalPages = Math.ceil(totalFiltered / perPage);

  // Tabs counts
  const [openCount, emailSentCount, recoveredTabCount] = await Promise.all([
    prisma.abandonedCheckout.count({ where: { status: "OPEN" } }),
    prisma.abandonedCheckout.count({ where: { status: "EMAIL_SENT" } }),
    prisma.abandonedCheckout.count({ where: { status: "RECOVERED" } }),
  ]);

  const tabs = [
    { key: "all", label: "Vše", count: totalFiltered },
    { key: "OPEN", label: "Otevřené", count: openCount },
    { key: "EMAIL_SENT", label: "Email odeslán", count: emailSentCount },
    { key: "RECOVERED", label: "Obnovené", count: recoveredTabCount },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Opuštěné pokladny</h1>
        <p className="text-sm text-gray-500 mt-1">
          Posledních 30 dní — neukončené objednávky a možnost kontaktovat zákazníky
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Celkem opuštěných"
          value={String(totalCount)}
          sparkline={sparkline}
          changeType="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          }
        />
        <StatCard
          label="Obnovených"
          value={String(recoveredCount)}
          changeType="up"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <StatCard
          label="Míra obnovy"
          value={`${recoveryRate} %`}
          changeType={recoveryRate > 10 ? "up" : "neutral"}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          }
        />
        <StatCard
          label="Ztracená hodnota"
          value={formatPrice(lostAmount)}
          changeType="down"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          }
        />
      </div>

      {/* Tabs + search */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 px-4">
          <div className="flex gap-0 overflow-x-auto">
            {tabs.map((tab) => (
              <a
                key={tab.key}
                href={`?stav=${tab.key}${searchQuery ? `&q=${searchQuery}` : ""}`}
                className={`px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  statusFilter === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs text-gray-400">({tab.count})</span>
              </a>
            ))}
          </div>
          <form method="get" className="flex items-center gap-2 pb-3 sm:pb-0">
            <input type="hidden" name="stav" value={statusFilter} />
            <input
              name="q"
              defaultValue={searchQuery}
              placeholder="Hledat email..."
              className="h-8 px-3 text-sm border border-gray-300 rounded-md focus:border-blue-500 outline-none w-full sm:w-48"
            />
            <button
              type="submit"
              className="h-8 px-3 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors shrink-0"
            >
              Hledat
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Datum</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Zákazník</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Položky</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Celkem</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Stav</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {checkouts.map((c) => {
              const items = JSON.parse(c.items) as Array<{ productName: string; variantTitle: string; quantity: number }>;
              const statusInfo = STATUS_LABELS[c.status] || STATUS_LABELS.OPEN;
              const preview = items.slice(0, 2).map((i) => `${i.productName} (${i.variantTitle})`).join(", ");

              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap hidden md:table-cell">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{c.email}</span>
                    {(c.firstName || c.lastName) && (
                      <p className="text-xs text-gray-500">{[c.firstName, c.lastName].filter(Boolean).join(" ")}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-gray-700">{c.itemCount} ks</span>
                    {preview && (
                      <p className="text-xs text-gray-400 truncate max-w-[200px]" title={preview}>{preview}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                    {formatPrice(c.subtotal)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
                    {c.recoveryEmailSentAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(c.recoveryEmailSentAt)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(c.status === "OPEN" || c.status === "EMAIL_SENT") && (
                      <form action={async () => {
                        "use server";
                        await requireAdmin();
                        await sendRecoveryEmail(c.id);
                        revalidatePath("/admin/opustene-pokladny");
                        redirect(`/admin/opustene-pokladny?stav=${statusFilter}`);
                      }} className="inline">
                        <button
                          type="submit"
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {c.status === "EMAIL_SENT" ? "Znovu odeslat" : "Odeslat upomínku"}
                        </button>
                      </form>
                    )}
                    {c.status === "RECOVERED" && c.recoveredOrderId && (
                      <a
                        href={`/admin/objednavky/${c.recoveredOrderId}`}
                        className="text-xs font-medium text-green-600 hover:text-green-800 transition-colors"
                      >
                        Zobrazit objednávku
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
            {checkouts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  Žádné opuštěné pokladny.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-500">
              {(page - 1) * perPage + 1}–{Math.min(page * perPage, totalFiltered)} z {totalFiltered}
            </span>
            <div className="flex gap-1">
              {page > 1 && (
                <a
                  href={`?stav=${statusFilter}&stranka=${page - 1}${searchQuery ? `&q=${searchQuery}` : ""}`}
                  className="h-8 px-3 flex items-center text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Předchozí
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`?stav=${statusFilter}&stranka=${page + 1}${searchQuery ? `&q=${searchQuery}` : ""}`}
                  className="h-8 px-3 flex items-center text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Další
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

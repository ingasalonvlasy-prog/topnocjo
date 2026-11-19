import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/StatCard";
import Link from "next/link";
import { NewsletterActions } from "./NewsletterActions";

const PER_PAGE = 30;

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminNewsletterPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search || "";
  const filter = params.filter || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const where: Record<string, unknown> = {};
  if (search) {
    where.email = { contains: search };
  }
  if (filter === "active") where.active = true;
  if (filter === "inactive") where.active = false;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [subscribers, total, allCount, activeCount, newCount] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { subscribedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { active: true } }),
    prisma.newsletterSubscriber.count({ where: { subscribedAt: { gte: thirtyDaysAgo } } }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);
  const inactiveCount = allCount - activeCount;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} {total === 1 ? "odběratel" : total < 5 ? "odběratelé" : "odběratelů"}
          </p>
        </div>
        <a
          href="/api/admin/newsletter/export"
          download
          className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Celkem" value={String(allCount)} />
        <StatCard label="Aktivních" value={String(activeCount)} changeType="up" />
        <StatCard
          label="Nových (30 dní)"
          value={String(newCount)}
          changeType={newCount > 0 ? "up" : "neutral"}
        />
        <StatCard
          label="Odhlášených"
          value={String(inactiveCount)}
          changeType={inactiveCount > 0 ? "down" : "neutral"}
        />
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
        <form method="GET" action="/admin/newsletter" className="flex gap-3">
          <input type="hidden" name="filter" value={filter} />
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Hledat podle emailu..."
              className="w-full rounded-md border border-gray-300 bg-white pl-8 pr-3 py-1.5 text-sm text-gray-700 focus:border-gray-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            Hledat
          </button>
          {search && (
            <Link
              href={`/admin/newsletter${filter ? `?filter=${filter}` : ""}`}
              className="px-4 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Zrušit
            </Link>
          )}
        </form>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {([
          { key: "", label: "Všichni" },
          { key: "active", label: "Aktivní" },
          { key: "inactive", label: "Odhlášení" },
        ] as const).map((tab) => {
          const sp = new URLSearchParams();
          if (search) sp.set("search", search);
          if (tab.key) sp.set("filter", tab.key);
          const href = `/admin/newsletter${sp.toString() ? `?${sp.toString()}` : ""}`;
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

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {subscribers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Žádní odběratelé nenalezeni.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Stav</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">Datum přihlášení</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscribers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900">{s.email}</td>
                    <td className="px-4 py-3">
                      {s.active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Aktivní
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Odhlášen
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap hidden sm:table-cell">
                      {s.subscribedAt.toLocaleDateString("cs-CZ", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <NewsletterActions id={s.id} active={s.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500 hidden sm:block">
              Strana {page} z {totalPages}
            </p>
            <div className="flex gap-1 mx-auto sm:mx-0">
              {page > 1 && (
                <PageLink page={page - 1} search={search} filter={filter} label="&larr;" />
              )}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p: number;
                if (totalPages <= 7) {
                  p = i + 1;
                } else if (page <= 4) {
                  p = i + 1;
                } else if (page >= totalPages - 3) {
                  p = totalPages - 6 + i;
                } else {
                  p = page - 3 + i;
                }
                return (
                  <PageLink
                    key={p}
                    page={p}
                    search={search}
                    filter={filter}
                    label={String(p)}
                    active={p === page}
                  />
                );
              })}
              {page < totalPages && (
                <PageLink page={page + 1} search={search} filter={filter} label="&rarr;" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PageLink({
  page,
  search,
  filter,
  label,
  active = false,
}: {
  page: number;
  search: string;
  filter: string;
  label: string;
  active?: boolean;
}) {
  const sp = new URLSearchParams();
  if (search) sp.set("search", search);
  if (filter) sp.set("filter", filter);
  sp.set("page", String(page));

  return (
    <Link
      href={`/admin/newsletter?${sp.toString()}`}
      className={`inline-flex items-center justify-center w-8 h-8 text-sm rounded-md transition-colors ${
        active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
      }`}
      dangerouslySetInnerHTML={{ __html: label }}
    />
  );
}

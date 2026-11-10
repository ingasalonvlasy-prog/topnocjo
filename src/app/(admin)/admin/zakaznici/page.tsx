import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import Link from "next/link";

const PER_PAGE = 20;

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminCustomersPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        orders: {
          select: { total: true, paymentStatus: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zákazníci</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} {total === 1 ? "zákazník" : total < 5 ? "zákazníci" : "zákazníků"}
          </p>
        </div>
        <a
          href="/api/admin/customers/export"
          download
          className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
        <form method="GET" action="/admin/zakaznici" className="flex gap-3">
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
              placeholder="Hledat podle jména, emailu, telefonu..."
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
              href="/admin/zakaznici"
              className="px-4 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Zrušit
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Žádní zákazníci nenalezeni.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Zákazník</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Telefon</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Registrace</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Objednávky</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Útrata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => {
                  const orderCount = user.orders.length;
                  const totalSpent = user.orders
                    .filter((o) => o.paymentStatus === "PAID")
                    .reduce((sum, o) => sum + o.total, 0);

                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/zakaznici/${user.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {user.firstName || user.lastName
                            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                            : "—"}
                        </Link>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.phone || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {user.createdAt.toLocaleDateString("cs-CZ", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-900">{orderCount}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                        {totalSpent > 0 ? formatPrice(totalSpent) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Strana {page} z {totalPages}
            </p>
            <div className="flex gap-1">
              {page > 1 && (
                <PageLink page={page - 1} search={search} label="&larr;" />
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
                    label={String(p)}
                    active={p === page}
                  />
                );
              })}
              {page < totalPages && (
                <PageLink page={page + 1} search={search} label="&rarr;" />
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
  label,
  active = false,
}: {
  page: number;
  search: string;
  label: string;
  active?: boolean;
}) {
  const sp = new URLSearchParams();
  if (search) sp.set("search", search);
  sp.set("page", String(page));

  return (
    <Link
      href={`/admin/zakaznici?${sp.toString()}`}
      className={`inline-flex items-center justify-center w-8 h-8 text-sm rounded-md transition-colors ${
        active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
      }`}
      dangerouslySetInnerHTML={{ __html: label }}
    />
  );
}

import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { StatCard } from "@/components/admin/StatCard";
import Link from "next/link";

const PER_PAGE = 20;

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminCustomersPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search || "";
  const segment = params.segment || "";
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

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // Single query — load all matching users for stats + segment filtering
  const allMatchingUsers = await prisma.user.findMany({
    where,
    include: {
      orders: {
        select: { total: true, paymentStatus: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Segment filter in JS
  let segmentedUsers = allMatchingUsers;
  if (segment === "new") {
    segmentedUsers = allMatchingUsers.filter((u) => u.createdAt >= thirtyDaysAgo);
  } else if (segment === "returning") {
    segmentedUsers = allMatchingUsers.filter(
      (u) => u.orders.filter((o) => o.paymentStatus === "PAID").length > 1,
    );
  } else if (segment === "vip") {
    segmentedUsers = allMatchingUsers.filter((u) => {
      const spent = u.orders
        .filter((o) => o.paymentStatus === "PAID")
        .reduce((s, o) => s + o.total, 0);
      return spent >= 500000; // 5000 Kč in haléře
    });
  } else if (segment === "newsletter") {
    segmentedUsers = allMatchingUsers.filter((u) => u.newsletter);
  }

  // Manual pagination
  const total = segmentedUsers.length;
  const totalPages = Math.ceil(total / PER_PAGE);
  const users = segmentedUsers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Stats (from all matching, not segmented)
  const allCustomers = allMatchingUsers;
  const totalCustomers = allCustomers.length;
  const newThisMonth = allCustomers.filter((u) => u.createdAt >= thirtyDaysAgo).length;
  const returning = allCustomers.filter(
    (u) => u.orders.filter((o) => o.paymentStatus === "PAID").length > 1,
  ).length;
  const allPaidTotals = allCustomers
    .map((u) => u.orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0))
    .filter((t) => t > 0);
  const avgOrderValue =
    allPaidTotals.length > 0
      ? Math.round(allPaidTotals.reduce((s, t) => s + t, 0) / allPaidTotals.length)
      : 0;

  // Sparklines — new customers per day (30 days)
  const customerSparkline: number[] = [];
  for (let i = 0; i < 30; i++) {
    const dayStart = new Date(thirtyDaysAgo);
    dayStart.setDate(dayStart.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    customerSparkline.push(
      allCustomers.filter((u) => u.createdAt >= dayStart && u.createdAt <= dayEnd).length,
    );
  }

  // Segment counts
  const segmentCounts = {
    "": allMatchingUsers.length,
    new: allMatchingUsers.filter((u) => u.createdAt >= thirtyDaysAgo).length,
    returning: allMatchingUsers.filter(
      (u) => u.orders.filter((o) => o.paymentStatus === "PAID").length > 1,
    ).length,
    vip: allMatchingUsers.filter((u) => {
      const spent = u.orders
        .filter((o) => o.paymentStatus === "PAID")
        .reduce((s, o) => s + o.total, 0);
      return spent >= 500000;
    }).length,
    newsletter: allMatchingUsers.filter((u) => u.newsletter).length,
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zákazníci</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} {total === 1 ? "zákazník" : total < 5 ? "zákazníci" : "zákazníků"}
          </p>
        </div>
        <a
          href="/api/admin/customers/export"
          download
          className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors self-start sm:self-auto"
        >
          Export CSV
        </a>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Celkem zákazníků"
          value={String(totalCustomers)}
          sparkline={customerSparkline}
        />
        <StatCard
          label="Noví (30 dní)"
          value={String(newThisMonth)}
          change={totalCustomers > 0 ? `${Math.round((newThisMonth / totalCustomers) * 100)}% z celku` : "0%"}
          changeType={newThisMonth > 0 ? "up" : "neutral"}
        />
        <StatCard
          label="Opakující se"
          value={String(returning)}
          change={totalCustomers > 0 ? `${Math.round((returning / totalCustomers) * 100)}% zákazníků` : "0%"}
          changeType={returning > 0 ? "up" : "neutral"}
        />
        <StatCard
          label="Prům. hodnota objednávky"
          value={formatPrice(avgOrderValue)}
          changeType="neutral"
        />
      </div>

      {/* Segment tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-lg border border-gray-200 shadow-sm p-1 overflow-x-auto">
        {([
          { value: "", label: "Všichni" },
          { value: "new", label: "Noví (30d)" },
          { value: "returning", label: "Opakující se" },
          { value: "vip", label: "VIP (5000+ Kč)" },
          { value: "newsletter", label: "Newsletter" },
        ] as const).map((seg) => {
          const sp = new URLSearchParams();
          if (search) sp.set("search", search);
          if (seg.value) sp.set("segment", seg.value);
          return (
            <Link
              key={seg.value}
              href={`/admin/zakaznici${sp.toString() ? `?${sp.toString()}` : ""}`}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
                segment === seg.value
                  ? "bg-gray-900 text-white font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {seg.label}
              <span className="ml-1.5 text-xs opacity-60">{segmentCounts[seg.value]}</span>
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
        <form method="GET" action="/admin/zakaznici" className="flex gap-3">
          {segment && <input type="hidden" name="segment" value={segment} />}
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
              href={`/admin/zakaznici${segment ? `?segment=${segment}` : ""}`}
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
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">Telefon</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Registrace</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 hidden md:table-cell">Newsletter</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">Lokalita</th>
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
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{user.phone || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap hidden md:table-cell">
                        {user.createdAt.toLocaleDateString("cs-CZ", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          user.newsletter
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {user.newsletter ? "Ano" : "Ne"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                        {user.city || "—"}
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
            <p className="text-sm text-gray-500 hidden sm:block">
              Strana {page} z {totalPages}
            </p>
            <div className="flex gap-1 mx-auto sm:mx-0">
              {page > 1 && (
                <PageLink page={page - 1} search={search} segment={segment} label="&larr;" />
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
                    segment={segment}
                    label={String(p)}
                    active={p === page}
                  />
                );
              })}
              {page < totalPages && (
                <PageLink page={page + 1} search={search} segment={segment} label="&rarr;" />
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
  segment,
  label,
  active = false,
}: {
  page: number;
  search: string;
  segment: string;
  label: string;
  active?: boolean;
}) {
  const sp = new URLSearchParams();
  if (search) sp.set("search", search);
  if (segment) sp.set("segment", segment);
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

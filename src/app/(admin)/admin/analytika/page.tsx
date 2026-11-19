import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { StatCard } from "@/components/admin/StatCard";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@/lib/order-constants";
import type { OrderStatus } from "@/lib/order-constants";
import Link from "next/link";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  const params = await searchParams;
  const days = parseInt(params.obdobi || "30", 10);
  const validDays = [7, 30, 90].includes(days) ? days : 30;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodStart = new Date(now.getTime() - validDays * 24 * 60 * 60 * 1000);

  // ==================== Data fetching ====================
  const [
    totalRevenue,
    monthRevenue,
    totalOrders,
    monthOrders,
    totalCustomers,
    monthCustomers,
    paidOrdersPeriod,
    orderItemsPeriod,
    statusCounts,
    periodOrderCount,
    periodPaidCount,
  ] = await Promise.all([
    // Total revenue (all time, PAID only)
    prisma.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { total: true },
    }),
    // Month revenue
    prisma.order.aggregate({
      where: { paymentStatus: "PAID", paidAt: { gte: monthStart } },
      _sum: { total: true },
      _count: true,
    }),
    // Total orders
    prisma.order.count(),
    // Month orders
    prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
    // Total customers
    prisma.user.count(),
    // New customers this month
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    // Paid orders last 30 days (for daily chart)
    prisma.order.findMany({
      where: { paymentStatus: "PAID", paidAt: { gte: periodStart } },
      select: { total: true, paidAt: true },
      orderBy: { paidAt: "asc" },
    }),
    // Order items last 30 days (for top products + brands)
    prisma.orderItem.findMany({
      where: {
        order: { paymentStatus: "PAID", paidAt: { gte: periodStart } },
      },
      select: {
        productId: true,
        productName: true,
        quantity: true,
        totalPrice: true,
      },
    }),
    // Status counts
    Promise.all(
      ORDER_STATUSES.map(async (status) => ({
        status,
        count: await prisma.order.count({ where: { status } }),
      }))
    ),
    // Period order count (for conversion rate)
    prisma.order.count({ where: { createdAt: { gte: periodStart } } }),
    // Period paid count (for conversion rate)
    prisma.order.count({ where: { paymentStatus: "PAID", createdAt: { gte: periodStart } } }),
  ]);

  // ==================== Computed values ====================
  const totalRevenueVal = totalRevenue._sum.total || 0;
  const monthRevenueVal = monthRevenue._sum.total || 0;
  const monthPaidCount = monthRevenue._count || 0;
  const avgOrderValue =
    totalRevenueVal > 0
      ? Math.round(
          totalRevenueVal /
            (await prisma.order.count({ where: { paymentStatus: "PAID" } }))
        )
      : 0;

  const conversionRate = periodOrderCount > 0 ? Math.round((periodPaidCount / periodOrderCount) * 100) : 0;

  // ==================== Daily revenue ====================
  const dailyMap = new Map<string, { orders: number; revenue: number }>();

  // Pre-fill all days in period
  for (let i = validDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { orders: 0, revenue: 0 });
  }

  for (const order of paidOrdersPeriod) {
    if (!order.paidAt) continue;
    const key = order.paidAt.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    if (entry) {
      entry.orders++;
      entry.revenue += order.total;
    }
  }

  const dailyData = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    ...data,
  }));

  const maxDailyRevenue = Math.max(...dailyData.map((d) => d.revenue), 1);

  // ==================== Top products ====================
  const productMap = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();
  for (const item of orderItemsPeriod) {
    const key = item.productId || item.productName;
    const existing = productMap.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      existing.revenue += item.totalPrice;
    } else {
      productMap.set(key, {
        name: item.productName,
        quantity: item.quantity,
        revenue: item.totalPrice,
      });
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // ==================== Top brands ====================
  const productIds = orderItemsPeriod
    .map((i) => i.productId)
    .filter((id): id is string => !!id);
  const uniqueProductIds = [...new Set(productIds)];

  const products =
    uniqueProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: uniqueProductIds } },
          select: {
            id: true,
            brand: { select: { name: true } },
            categories: { include: { category: { select: { name: true } } } },
          },
        })
      : [];

  const productBrandMap = new Map<string, string>();
  for (const p of products) {
    productBrandMap.set(p.id, p.brand.name);
  }

  const brandMap = new Map<
    string,
    { quantity: number; revenue: number }
  >();
  for (const item of orderItemsPeriod) {
    const brandName = item.productId
      ? productBrandMap.get(item.productId) || "Neznámá"
      : "Neznámá";
    const existing = brandMap.get(brandName);
    if (existing) {
      existing.quantity += item.quantity;
      existing.revenue += item.totalPrice;
    } else {
      brandMap.set(brandName, {
        quantity: item.quantity,
        revenue: item.totalPrice,
      });
    }
  }
  const topBrands = Array.from(brandMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // ==================== Top categories ====================
  const productCatMap = new Map<string, string[]>();
  for (const p of products) {
    productCatMap.set(p.id, p.categories.map((pc) => pc.category.name));
  }

  const categoryMap = new Map<string, { quantity: number; revenue: number }>();
  for (const item of orderItemsPeriod) {
    const catNames = item.productId ? productCatMap.get(item.productId) || ["Nezařazeno"] : ["Nezařazeno"];
    for (const catName of catNames) {
      const existing = categoryMap.get(catName);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice;
      } else {
        categoryMap.set(catName, { quantity: item.quantity, revenue: item.totalPrice });
      }
    }
  }
  const topCategories = Array.from(categoryMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // ==================== Render ====================
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytika</h1>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {[7, 30, 90].map((d) => (
          <Link
            key={d}
            href={`/admin/analytika?obdobi=${d}`}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              validDays === d
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {d} dní
          </Link>
        ))}
      </div>

      {/* Section A — Overview stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Tržby celkem"
          value={formatPrice(totalRevenueVal)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <StatCard
          label="Tržby tento měsíc"
          value={formatPrice(monthRevenueVal)}
          change={`${monthPaidCount} zaplacených`}
          changeType={monthRevenueVal > 0 ? "up" : "neutral"}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          }
        />
        <StatCard
          label="Objednávky celkem"
          value={String(totalOrders)}
          change={`${monthOrders} tento měsíc`}
          changeType={monthOrders > 0 ? "up" : "neutral"}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          }
        />
        <StatCard
          label="Průměrná objednávka"
          value={avgOrderValue > 0 ? formatPrice(avgOrderValue) : "—"}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
            </svg>
          }
        />
        <StatCard
          label="Zákazníci celkem"
          value={String(totalCustomers)}
          change={`${monthCustomers} nových tento měsíc`}
          changeType={monthCustomers > 0 ? "up" : "neutral"}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          }
        />
        <StatCard
          label={`Konverze plateb (${validDays}d)`}
          value={`${conversionRate} %`}
          change={`${periodPaidCount} z ${periodOrderCount}`}
          changeType={conversionRate > 50 ? "up" : "neutral"}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          }
        />
        <Link href="/admin/objednavky?status=NEW">
          <StatCard
            label="Nové objednávky"
            value={String(statusCounts.find((s) => s.status === "NEW")?.count || 0)}
            changeType={(statusCounts.find((s) => s.status === "NEW")?.count || 0) > 0 ? "up" : "neutral"}
            change={(statusCounts.find((s) => s.status === "NEW")?.count || 0) > 0 ? "vyžaduje pozornost" : ""}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
            }
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Section B — Daily revenue (last 30 days) */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Tržby za posledních {validDays} dní</h2>
          </div>
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Datum</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-600">Obj.</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Tržby</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600 w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dailyData.map((day) => {
                  const barWidth = maxDailyRevenue > 0 ? Math.max((day.revenue / maxDailyRevenue) * 100, 0) : 0;
                  const dateObj = new Date(day.date + "T00:00:00");
                  return (
                    <tr key={day.date} className={day.revenue > 0 ? "" : "text-gray-400"}>
                      <td className="px-4 py-1.5 whitespace-nowrap">
                        {dateObj.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-4 py-1.5 text-center">{day.orders}</td>
                      <td className="px-4 py-1.5 text-right whitespace-nowrap font-medium">
                        {day.revenue > 0 ? formatPrice(day.revenue) : "—"}
                      </td>
                      <td className="px-4 py-1.5">
                        {barWidth > 0 && (
                          <div className="h-3 rounded-full bg-green-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section D — Orders by status */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Objednávky dle stavu</h2>
            <div className="space-y-2">
              {statusCounts.map(({ status, count }) => {
                const s = status as OrderStatus;
                const colors = ORDER_STATUS_COLORS[s] || { bg: "bg-gray-100", text: "text-gray-700" };
                return (
                  <Link
                    key={status}
                    href={`/admin/objednavky?status=${status}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                      {ORDER_STATUS_LABELS[s] || status}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section E — Top brands */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Top značky ({validDays} dní)</h2>
            </div>
            {topBrands.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">Žádná data.</div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Značka</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-600">Prodáno ks</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Tržby</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topBrands.map((brand) => (
                    <tr key={brand.name}>
                      <td className="px-4 py-2 font-medium text-gray-900">{brand.name}</td>
                      <td className="px-4 py-2 text-center text-gray-600">{brand.quantity}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900 whitespace-nowrap">
                        {formatPrice(brand.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>

          {/* Section F — Top categories */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Top kategorie ({validDays} dní)</h2>
            </div>
            {topCategories.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">Žádná data.</div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Kategorie</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-600">Prodáno ks</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Tržby</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topCategories.map((cat) => (
                    <tr key={cat.name}>
                      <td className="px-4 py-2 font-medium text-gray-900">{cat.name}</td>
                      <td className="px-4 py-2 text-center text-gray-600">{cat.quantity}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900 whitespace-nowrap">
                        {formatPrice(cat.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section C — Top products */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Top produkty ({validDays} dní)</h2>
        </div>
        {topProducts.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Žádné prodeje za posledních {validDays} dní.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2 text-left font-medium text-gray-600">#</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Produkt</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-600">Prodáno ks</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Tržby</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topProducts.map((product, idx) => (
                  <tr key={product.name + idx}>
                    <td className="px-4 py-2 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-2 font-medium text-gray-900">{product.name}</td>
                    <td className="px-4 py-2 text-center text-gray-600">{product.quantity}</td>
                    <td className="px-4 py-2 text-right font-bold text-gray-900 whitespace-nowrap">
                      {formatPrice(product.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

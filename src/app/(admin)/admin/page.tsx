import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/StatCard";
import { formatPrice } from "@/lib/products";
import Link from "next/link";

export default async function AdminDashboard() {
  // 7 days ago at midnight
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [productCount, activeCount, categoryCount, brandCount, variantCount, lowStockCount, orderCount, newOrders, revenue, recentOrders, lowStockVariants, paidOrdersLast7Days] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.variant.count({ where: { active: true } }),
    prisma.variant.findMany({ where: { active: true }, select: { ownStock: true, supplierStock: true } }).then(
      (variants) => variants.filter((v) => (v.ownStock + v.supplierStock) <= 2).length
    ),
    prisma.order.count(),
    prisma.order.count({ where: { status: "NEW" } }),
    prisma.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { total: true } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        firstName: true,
        lastName: true,
        total: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
    }),
    prisma.variant.findMany({
      where: {
        active: true,
        product: { status: "ACTIVE" },
      },
      select: {
        id: true,
        title: true,
        ownStock: true,
        supplierStock: true,
        product: { select: { name: true, slug: true, id: true } },
      },
    }).then((variants) =>
      variants
        .filter((v) => (v.ownStock + v.supplierStock) <= 2)
        .sort((a, b) => (a.ownStock + a.supplierStock) - (b.ownStock + b.supplierStock))
        .slice(0, 10)
    ),
    prisma.order.findMany({
      where: { paymentStatus: "PAID", createdAt: { gte: sevenDaysAgo } },
      select: { total: true, createdAt: true },
    }),
  ]);

  // Build 7-day revenue chart data
  const revenueByDay: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString("cs-CZ", { weekday: "short" });
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);
    const dayTotal = paidOrdersLast7Days
      .filter((o) => o.createdAt >= dayStart && o.createdAt <= dayEnd)
      .reduce((sum, o) => sum + o.total, 0);
    revenueByDay.push({ label: dayStr, value: dayTotal });
  }
  const maxRevenue = Math.max(...revenueByDay.map((d) => d.value), 1);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Order stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link href="/admin/objednavky">
          <StatCard
            label="Objednávky celkem"
            value={String(orderCount)}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
            }
          />
        </Link>
        <Link href="/admin/objednavky?status=NEW">
          <StatCard
            label="Nové objednávky"
            value={String(newOrders)}
            changeType={newOrders > 0 ? "up" : "neutral"}
            change={newOrders > 0 ? "vyžaduje pozornost" : "žádné nové"}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
            }
          />
        </Link>
        <StatCard
          label="Tržby"
          value={formatPrice(revenue._sum.total || 0)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
      </div>

      {/* Product stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Celkem produktů"
          value={String(productCount)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          }
        />
        <StatCard
          label="Aktivní produkty"
          value={String(activeCount)}
          change={`${productCount > 0 ? Math.round((activeCount / productCount) * 100) : 0}% z celku`}
          changeType="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <StatCard
          label="Kategorie"
          value={String(categoryCount)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
          }
        />
        <StatCard
          label="Nízký sklad"
          value={String(lowStockCount)}
          change={`${variantCount} variant celkem`}
          changeType={lowStockCount > 10 ? "down" : "neutral"}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          }
        />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rychlé akce</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/produkty/novy"
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            + Nový produkt
          </Link>
          <Link
            href="/admin/objednavky"
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Objednávky
          </Link>
          <Link
            href="/admin/produkty"
            className="px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Spravovat produkty
          </Link>
          <Link
            href="/admin/kategorie"
            className="px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Spravovat kategorie
          </Link>
          <Link
            href="/admin/objednavky?export=csv"
            className="px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Export objednávek
          </Link>
          <Link
            href="/admin/nastaveni"
            className="px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Nastavení e-shopu
          </Link>
          <Link
            href="/"
            target="_blank"
            className="px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Zobrazit e-shop &rarr;
          </Link>
        </div>
      </div>

      {/* Revenue chart — last 7 days */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tržby za posledních 7 dní</h2>
        <div className="flex items-end gap-2 h-[180px]">
          {revenueByDay.map((day) => (
            <div key={day.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[11px] font-medium text-gray-500">
                {day.value > 0 ? formatPrice(day.value) : ""}
              </span>
              <div
                className="w-full bg-gray-900 rounded-t-md transition-all min-h-[4px]"
                style={{ height: `${Math.max((day.value / maxRevenue) * 140, 4)}px` }}
              />
              <span className="text-[11px] font-medium text-gray-400 mt-1">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent orders */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Poslední objednávky</h2>
            <Link href="/admin/objednavky" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Zobrazit vše &rarr;
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-500 pb-2">Č.</th>
                    <th className="text-left font-medium text-gray-500 pb-2">Zákazník</th>
                    <th className="text-right font-medium text-gray-500 pb-2">Částka</th>
                    <th className="text-right font-medium text-gray-500 pb-2">Stav</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5">
                        <Link href={`/admin/objednavky/${order.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 text-gray-700">{order.firstName} {order.lastName}</td>
                      <td className="py-2.5 text-right font-medium text-gray-900">{formatPrice(order.total)}</td>
                      <td className="py-2.5 text-right">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          order.status === "NEW" ? "bg-blue-100 text-blue-700"
                          : order.status === "PROCESSING" ? "bg-yellow-100 text-yellow-700"
                          : order.status === "SHIPPED" ? "bg-purple-100 text-purple-700"
                          : order.status === "DELIVERED" ? "bg-green-100 text-green-700"
                          : order.status === "CANCELLED" ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                        }`}>
                          {order.status === "NEW" ? "Nová"
                          : order.status === "PROCESSING" ? "Zpracovává se"
                          : order.status === "SHIPPED" ? "Odesláno"
                          : order.status === "DELIVERED" ? "Doručeno"
                          : order.status === "CANCELLED" ? "Zrušeno"
                          : order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Zatím žádné objednávky.</p>
          )}
        </div>

        {/* Low stock warning */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Nízké zásoby</h2>
            {lowStockVariants.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {lowStockCount} variant
              </span>
            )}
          </div>
          {lowStockVariants.length > 0 ? (
            <div className="space-y-2">
              {lowStockVariants.map((v) => {
                const totalStock = v.ownStock + v.supplierStock;
                return (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/produkty/${v.product.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block">
                        {v.product.name}
                      </Link>
                      <span className="text-xs text-gray-500">{v.title}</span>
                    </div>
                    <span className={`text-sm font-bold ml-3 shrink-0 ${
                      totalStock === 0 ? "text-red-600" : "text-amber-600"
                    }`}>
                      {totalStock === 0 ? "Vyprodáno" : `${totalStock} ks`}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Všechny varianty mají dostatečné zásoby.</p>
          )}
        </div>
      </div>

      {/* Recent activity log */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Poslední aktivita</h2>
          <Link href="/admin/log" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Zobrazit vše &rarr;
          </Link>
        </div>
        {await (async () => {
          const logs = await prisma.adminLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
          });
          if (logs.length === 0) {
            return <p className="text-sm text-gray-500">Zatím žádná aktivita.</p>;
          }
          const actionLabels: Record<string, string> = {
            create: "Vytvořeno",
            update: "Upraveno",
            delete: "Smazáno",
            status_change: "Změna stavu",
            bulk_update: "Hromadná úprava",
            bulk_delete: "Hromadné smazání",
          };
          const entityLabels: Record<string, string> = {
            product: "Produkt",
            order: "Objednávka",
            discount: "Sleva",
            review: "Recenze",
          };
          return (
            <div className="space-y-0 divide-y divide-gray-50">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 py-2.5">
                  <span className={`shrink-0 mt-0.5 w-2 h-2 rounded-full ${
                    log.action === "create" ? "bg-green-400"
                    : log.action === "delete" || log.action === "bulk_delete" ? "bg-red-400"
                    : log.action === "status_change" ? "bg-blue-400"
                    : "bg-amber-400"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-gray-900">
                      <span className="font-medium">{actionLabels[log.action] || log.action}</span>
                      {" · "}
                      <span className="text-gray-500">{entityLabels[log.entity] || log.entity}</span>
                    </div>
                    {log.detail && (
                      <p className="text-xs text-gray-500 truncate">{log.detail}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                    {log.createdAt.toLocaleDateString("cs-CZ")} {log.createdAt.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Brands overview */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Značky</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(await prisma.brand.findMany({
            include: { _count: { select: { products: true } } },
            orderBy: { name: "asc" },
          })).map((brand) => (
            <div key={brand.id} className="text-center p-3 bg-gray-50 rounded-md">
              <p className="font-medium text-gray-900">{brand.name}</p>
              <p className="text-sm text-gray-500">{brand._count.products} produktů</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/StatCard";
import { formatPrice } from "@/lib/products";
import Link from "next/link";

function LineChart({
  current,
  previous,
  labels,
  formatValue,
}: {
  current: number[];
  previous: number[];
  labels: string[];
  formatValue: (v: number) => string;
}) {
  const allValues = [...current, ...previous];
  const max = Math.max(...allValues, 1);
  const w = 800;
  const h = 300;
  const padX = 50;
  const padY = 30;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  function toPoints(data: number[]): string {
    return data
      .map((v, i) => {
        const x = padX + (i / Math.max(data.length - 1, 1)) * chartW;
        const y = padY + chartH - (v / max) * chartH;
        return `${x},${y}`;
      })
      .join(" ");
  }

  const yLines = Array.from({ length: 5 }, (_, i) => {
    const val = (max / 4) * i;
    const y = padY + chartH - (val / max) * chartH;
    return { y, label: formatValue(Math.round(val)) };
  });

  const xLabels = labels
    .map((l, i) => ({ label: l, x: padX + (i / Math.max(labels.length - 1, 1)) * chartW }))
    .filter((_, i) => i % 5 === 0 || i === labels.length - 1);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {yLines.map((line) => (
        <g key={line.y}>
          <line x1={padX} y1={line.y} x2={w - padX} y2={line.y} stroke="#e5e7eb" strokeWidth="1" />
          <text x={padX - 8} y={line.y + 4} textAnchor="end" className="text-[10px] fill-gray-400">
            {line.label}
          </text>
        </g>
      ))}
      {xLabels.map((item) => (
        <text key={item.x} x={item.x} y={h - 5} textAnchor="middle" className="text-[10px] fill-gray-400">
          {item.label}
        </text>
      ))}
      {previous.length > 1 && (
        <polyline
          points={toPoints(previous)}
          fill="none"
          stroke="#9ca3af"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <polyline
        points={toPoints(current)}
        fill="none"
        stroke="#111827"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function dailyAgg(
  orders: Array<{ createdAt: Date; total: number; paymentStatus: string }>,
  days: number,
  start: Date,
  metricFn: (dayOrders: typeof orders) => number,
): number[] {
  const result: number[] = [];
  for (let i = 0; i < days; i++) {
    const dayStart = new Date(start);
    dayStart.setDate(dayStart.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const dayOrders = orders.filter((o) => o.createdAt >= dayStart && o.createdAt <= dayEnd);
    result.push(metricFn(dayOrders));
  }
  return result;
}

function pctChange(
  current: number,
  previous: number,
): { text: string; type: "up" | "down" | "neutral" } {
  if (previous === 0)
    return current > 0 ? { text: "+100%", type: "up" } : { text: "0%", type: "neutral" };
  const pct = Math.round(((current - previous) / previous) * 100);
  return {
    text: `${pct > 0 ? "+" : ""}${pct}% vs předchozí období`,
    type: pct > 0 ? "up" : pct < 0 ? "down" : "neutral",
  };
}

function formatDateRange(from: Date, to: Date): string {
  return `${from.toLocaleDateString("cs-CZ")} – ${to.toLocaleDateString("cs-CZ")}`;
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawObdobi = parseInt((sp.obdobi as string) || "30");
  const periodDays = [7, 30, 90].includes(rawObdobi) ? rawObdobi : 30;
  const stat = (sp.stat as string) || "";

  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - periodDays);
  periodStart.setHours(0, 0, 0, 0);

  const prevStart = new Date(periodStart);
  prevStart.setDate(prevStart.getDate() - periodDays);

  const [
    currentOrders,
    prevOrders,
    newOrders,
    recentOrders,
    lowStockVariants,
    lowStockCount,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: periodStart } },
      select: {
        createdAt: true,
        total: true,
        paymentStatus: true,
        status: true,
      },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: prevStart, lt: periodStart } },
      select: {
        createdAt: true,
        total: true,
        paymentStatus: true,
      },
    }),
    prisma.order.count({ where: { status: "NEW" } }),
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
    prisma.variant
      .findMany({
        where: { active: true, product: { status: "ACTIVE" } },
        select: {
          id: true,
          title: true,
          ownStock: true,
          supplierStock: true,
          product: { select: { name: true, slug: true, id: true } },
        },
      })
      .then((variants) =>
        variants
          .filter((v) => v.ownStock + v.supplierStock <= 2)
          .sort((a, b) => a.ownStock + a.supplierStock - (b.ownStock + b.supplierStock))
          .slice(0, 10),
      ),
    prisma.variant
      .findMany({ where: { active: true }, select: { ownStock: true, supplierStock: true } })
      .then((variants) => variants.filter((v) => v.ownStock + v.supplierStock <= 2).length),
  ]);

  // Sparklines — current period
  const salesSparkline = dailyAgg(currentOrders, periodDays, periodStart, (day) =>
    day.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0),
  );
  const ordersSparkline = dailyAgg(currentOrders, periodDays, periodStart, (day) => day.length);
  const conversionSparkline = dailyAgg(currentOrders, periodDays, periodStart, (day) =>
    day.length > 0
      ? Math.round((day.filter((o) => o.paymentStatus === "PAID").length / day.length) * 100)
      : 0,
  );
  const avgSparkline = dailyAgg(currentOrders, periodDays, periodStart, (day) => {
    const paid = day.filter((o) => o.paymentStatus === "PAID");
    return paid.length > 0 ? Math.round(paid.reduce((s, o) => s + o.total, 0) / paid.length) : 0;
  });

  // Previous period sparklines (for drill-down charts)
  const prevSalesDaily = dailyAgg(prevOrders, periodDays, prevStart, (day) =>
    day.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0),
  );
  const prevOrdersDaily = dailyAgg(prevOrders, periodDays, prevStart, (day) => day.length);
  const prevConversionDaily = dailyAgg(prevOrders, periodDays, prevStart, (day) =>
    day.length > 0
      ? Math.round((day.filter((o) => o.paymentStatus === "PAID").length / day.length) * 100)
      : 0,
  );
  const prevAvgDaily = dailyAgg(prevOrders, periodDays, prevStart, (day) => {
    const paid = day.filter((o) => o.paymentStatus === "PAID");
    return paid.length > 0 ? Math.round(paid.reduce((s, o) => s + o.total, 0) / paid.length) : 0;
  });

  // Period totals
  const periodRevenue = currentOrders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((s, o) => s + o.total, 0);
  const periodOrderCount = currentOrders.length;
  const periodPaidCount = currentOrders.filter((o) => o.paymentStatus === "PAID").length;
  const periodConversion =
    periodOrderCount > 0 ? ((periodPaidCount / periodOrderCount) * 100).toFixed(1) : "0";
  const periodAvg = periodPaidCount > 0 ? Math.round(periodRevenue / periodPaidCount) : 0;

  // Previous period totals
  const prevRevenue = prevOrders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((s, o) => s + o.total, 0);
  const prevOrderCount = prevOrders.length;
  const prevPaidCount = prevOrders.filter((o) => o.paymentStatus === "PAID").length;
  const prevConversion = prevOrderCount > 0 ? (prevPaidCount / prevOrderCount) * 100 : 0;
  const prevAvg = prevPaidCount > 0 ? Math.round(prevRevenue / prevPaidCount) : 0;

  // Date labels for chart X-axis
  const dateLabels = Array.from({ length: periodDays }, (_, i) => {
    const d = new Date(periodStart);
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
  });

  // Drill-down config
  const statConfig: Record<
    string,
    {
      title: string;
      description: string;
      value: string;
      change: ReturnType<typeof pctChange>;
      currentData: number[];
      previousData: number[];
      formatFn: (v: number) => string;
    }
  > = {
    prodeje: {
      title: "Celkové prodeje v čase",
      description: "Tržby za zvolené období po dnech",
      value: formatPrice(periodRevenue),
      change: pctChange(periodRevenue, prevRevenue),
      currentData: salesSparkline,
      previousData: prevSalesDaily,
      formatFn: (v) => formatPrice(v),
    },
    objednavky: {
      title: "Objednávky v čase",
      description: "Počet objednávek za zvolené období po dnech",
      value: String(periodOrderCount),
      change: pctChange(periodOrderCount, prevOrderCount),
      currentData: ordersSparkline,
      previousData: prevOrdersDaily,
      formatFn: (v) => String(v),
    },
    konverze: {
      title: "Konverzní poměr v čase",
      description: "Podíl zaplacených objednávek z celku po dnech",
      value: `${periodConversion} %`,
      change: pctChange(Number(periodConversion), prevConversion),
      currentData: conversionSparkline,
      previousData: prevConversionDaily,
      formatFn: (v) => `${v}%`,
    },
    prumer: {
      title: "Průměrná objednávka v čase",
      description: "Průměrná hodnota zaplacené objednávky po dnech",
      value: formatPrice(periodAvg),
      change: pctChange(periodAvg, prevAvg),
      currentData: avgSparkline,
      previousData: prevAvgDaily,
      formatFn: (v) => formatPrice(v),
    },
  };

  const activeStat = stat && statConfig[stat] ? statConfig[stat] : null;

  return (
    <div>
      {/* Header + period selector */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          {[
            { days: 7, label: "7 dní" },
            { days: 30, label: "30 dní" },
            { days: 90, label: "90 dní" },
          ].map(({ days, label }) => (
            <Link
              key={days}
              href={`/admin?obdobi=${days}${stat ? `&stat=${stat}` : ""}`}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                periodDays === days
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* 4 hero stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href={`/admin?stat=prodeje&obdobi=${periodDays}`}>
          <StatCard
            label="Celkové prodeje"
            value={formatPrice(periodRevenue)}
            change={pctChange(periodRevenue, prevRevenue).text}
            changeType={pctChange(periodRevenue, prevRevenue).type}
            sparkline={salesSparkline}
          />
        </Link>
        <Link href={`/admin?stat=objednavky&obdobi=${periodDays}`}>
          <StatCard
            label="Objednávky"
            value={String(periodOrderCount)}
            change={pctChange(periodOrderCount, prevOrderCount).text}
            changeType={pctChange(periodOrderCount, prevOrderCount).type}
            sparkline={ordersSparkline}
          />
        </Link>
        <Link href={`/admin?stat=konverze&obdobi=${periodDays}`}>
          <StatCard
            label="Konverzní poměr"
            value={`${periodConversion} %`}
            change={pctChange(Number(periodConversion), prevConversion).text}
            changeType={pctChange(Number(periodConversion), prevConversion).type}
            sparkline={conversionSparkline}
          />
        </Link>
        <Link href={`/admin?stat=prumer&obdobi=${periodDays}`}>
          <StatCard
            label="Průměrná objednávka"
            value={formatPrice(periodAvg)}
            change={pctChange(periodAvg, prevAvg).text}
            changeType={pctChange(periodAvg, prevAvg).type}
            sparkline={avgSparkline}
          />
        </Link>
      </div>

      {/* Drill-down panel */}
      {activeStat && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <Link
            href={`/admin?obdobi=${periodDays}`}
            className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Zpět na dashboard
          </Link>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{activeStat.title}</h2>
              <p className="text-sm text-gray-500">{activeStat.description}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{activeStat.value}</p>
              <p
                className={`text-sm font-medium ${
                  activeStat.change.type === "up"
                    ? "text-green-600"
                    : activeStat.change.type === "down"
                      ? "text-red-500"
                      : "text-gray-500"
                }`}
              >
                {activeStat.change.text}
              </p>
            </div>
          </div>

          <LineChart
            current={activeStat.currentData}
            previous={activeStat.previousData}
            labels={dateLabels}
            formatValue={activeStat.formatFn}
          />

          {/* Legend */}
          <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <span className="w-6 h-0.5 bg-gray-900 inline-block" />
              {formatDateRange(periodStart, now)}
            </span>
            <span className="flex items-center gap-2">
              <span
                className="w-6 inline-block"
                style={{ borderTop: "2px dashed #9ca3af", height: 0 }}
              />
              {formatDateRange(prevStart, periodStart)}
            </span>
          </div>
        </div>
      )}

      {/* Promo / info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex gap-4">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Obnovte prodeje e-mailem</h3>
            <p className="text-xs text-gray-500 mt-0.5">Upomínky na nedokončené nákupy zvýší konverzi.</p>
            <Link href="/admin/opustene-pokladny" className="text-xs font-medium text-blue-600 hover:text-blue-800 mt-2 inline-block">
              Nastavit &rarr;
            </Link>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex gap-4">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Růst e-shopu</h3>
            <p className="text-xs text-gray-500 mt-0.5">SEO doporučení, kampaně a automatizace.</p>
            <Link href="/admin/rust" className="text-xs font-medium text-green-600 hover:text-green-800 mt-2 inline-block">
              Zobrazit &rarr;
            </Link>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex gap-4">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Analytika</h3>
            <p className="text-xs text-gray-500 mt-0.5">Detailní přehledy tržeb, produktů a zákazníků.</p>
            <Link href="/admin/analytika" className="text-xs font-medium text-purple-600 hover:text-purple-800 mt-2 inline-block">
              Zobrazit &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Two-column: Recent orders + Low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent orders */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Poslední objednávky</h2>
            <Link
              href="/admin/objednavky"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
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
                        <Link
                          href={`/admin/objednavky/${order.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 text-gray-700">
                        {order.firstName} {order.lastName}
                      </td>
                      <td className="py-2.5 text-right font-medium text-gray-900">
                        {formatPrice(order.total)}
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            order.status === "NEW"
                              ? "bg-blue-100 text-blue-700"
                              : order.status === "PROCESSING"
                                ? "bg-yellow-100 text-yellow-700"
                                : order.status === "SHIPPED"
                                  ? "bg-purple-100 text-purple-700"
                                  : order.status === "DELIVERED"
                                    ? "bg-green-100 text-green-700"
                                    : order.status === "CANCELLED"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {order.status === "NEW"
                            ? "Nová"
                            : order.status === "PROCESSING"
                              ? "Zpracovává se"
                              : order.status === "SHIPPED"
                                ? "Odesláno"
                                : order.status === "DELIVERED"
                                  ? "Doručeno"
                                  : order.status === "CANCELLED"
                                    ? "Zrušeno"
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
                  <div
                    key={v.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/produkty/${v.product.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                      >
                        {v.product.name}
                      </Link>
                      <span className="text-xs text-gray-500">{v.title}</span>
                    </div>
                    <span
                      className={`text-sm font-bold ml-3 shrink-0 ${
                        totalStock === 0 ? "text-red-600" : "text-amber-600"
                      }`}
                    >
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
          <Link
            href="/admin/log"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
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
                  <span
                    className={`shrink-0 mt-0.5 w-2 h-2 rounded-full ${
                      log.action === "create"
                        ? "bg-green-400"
                        : log.action === "delete" || log.action === "bulk_delete"
                          ? "bg-red-400"
                          : log.action === "status_change"
                            ? "bg-blue-400"
                            : "bg-amber-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-gray-900">
                      <span className="font-medium">
                        {actionLabels[log.action] || log.action}
                      </span>
                      {" · "}
                      <span className="text-gray-500">
                        {entityLabels[log.entity] || log.entity}
                      </span>
                    </div>
                    {log.detail && (
                      <p className="text-xs text-gray-500 truncate">{log.detail}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                    {log.createdAt.toLocaleDateString("cs-CZ")}{" "}
                    {log.createdAt.toLocaleTimeString("cs-CZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Quick actions — moved to bottom */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
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
    </div>
  );
}

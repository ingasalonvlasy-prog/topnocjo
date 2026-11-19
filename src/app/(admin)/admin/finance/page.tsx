import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { StatCard } from "@/components/admin/StatCard";
import Link from "next/link";

function LineChart({
  data,
  labels,
  formatValue,
}: {
  data: number[];
  labels: string[];
  formatValue: (v: number) => string;
}) {
  const max = Math.max(...data, 1);
  const w = 800;
  const h = 240;
  const padX = 60;
  const padY = 20;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const points = data
    .map((v, i) => {
      const x = padX + (i / Math.max(data.length - 1, 1)) * chartW;
      const y = padY + chartH - (v / max) * chartH;
      return `${x},${y}`;
    })
    .join(" ");

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
        <text key={item.x} x={item.x} y={h - 2} textAnchor="middle" className="text-[10px] fill-gray-400">
          {item.label}
        </text>
      ))}
      <polyline
        points={points}
        fill="none"
        stroke="#111827"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawObdobi = parseInt((sp.obdobi as string) || "30");
  const periodDays = [7, 30, 90].includes(rawObdobi) ? rawObdobi : 30;

  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - periodDays);
  periodStart.setHours(0, 0, 0, 0);

  const [periodOrders, recentPaidOrders] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: periodStart } },
      select: {
        id: true,
        orderNumber: true,
        firstName: true,
        lastName: true,
        total: true,
        subtotal: true,
        shippingPrice: true,
        discountAmount: true,
        paymentStatus: true,
        paymentMethod: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            variantId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { paymentStatus: "PAID", createdAt: { gte: periodStart } },
      select: {
        id: true,
        orderNumber: true,
        firstName: true,
        lastName: true,
        total: true,
        paymentMethod: true,
        paymentStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // Collect variant IDs for cost lookup
  const variantIds = [
    ...new Set(
      periodOrders.flatMap((o) => o.items.map((i) => i.variantId).filter(Boolean) as string[]),
    ),
  ];
  const variants =
    variantIds.length > 0
      ? await prisma.variant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, costPrice: true },
        })
      : [];
  const costMap = new Map(variants.map((v) => [v.id, v.costPrice]));

  // Period stats
  const paidOrders = periodOrders.filter((o) => o.paymentStatus === "PAID");
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const totalTransactions = paidOrders.length;
  const avgOrder = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  // Margin calculation
  let totalCost = 0;
  let hasCostData = false;
  for (const order of paidOrders) {
    for (const item of order.items) {
      const cp = item.variantId ? costMap.get(item.variantId) : null;
      if (cp != null) {
        totalCost += cp * item.quantity;
        hasCostData = true;
      }
    }
  }
  const totalMargin = totalRevenue - totalCost;
  const marginPct = totalRevenue > 0 ? ((totalMargin / totalRevenue) * 100).toFixed(1) : "0";

  // VAT (21%)
  const vatAmount = Math.round(totalRevenue * 0.1736); // 21/121

  // Daily revenue sparkline
  const revenueByDay: number[] = [];
  const dateLabels: string[] = [];
  for (let i = 0; i < periodDays; i++) {
    const dayStart = new Date(periodStart);
    dayStart.setDate(dayStart.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const dayTotal = paidOrders
      .filter((o) => o.createdAt >= dayStart && o.createdAt <= dayEnd)
      .reduce((s, o) => s + o.total, 0);
    revenueByDay.push(dayTotal);
    dateLabels.push(
      dayStart.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" }),
    );
  }

  // Payment method breakdown
  const byMethod: Record<string, { count: number; total: number }> = {};
  for (const o of paidOrders) {
    const m = o.paymentMethod || "other";
    if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
    byMethod[m].count++;
    byMethod[m].total += o.total;
  }
  const methodLabels: Record<string, string> = {
    card: "Kartou online",
    transfer: "Bankovní převod",
    cash: "Hotově",
    cod: "Dobírka",
    other: "Ostatní",
  };

  return (
    <div>
      {/* Header + period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Finanční přehled za{" "}
            {periodDays === 7 ? "posledních 7 dní" : periodDays === 90 ? "posledních 90 dní" : "posledních 30 dní"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { days: 7, label: "7 dní" },
            { days: 30, label: "30 dní" },
            { days: 90, label: "90 dní" },
          ].map(({ days, label }) => (
            <Link
              key={days}
              href={`/admin/finance?obdobi=${days}`}
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Celkové tržby"
          value={formatPrice(totalRevenue)}
          sparkline={revenueByDay}
          changeType={totalRevenue > 0 ? "up" : "neutral"}
        />
        <StatCard
          label="Marže"
          value={hasCostData ? formatPrice(totalMargin) : "—"}
          change={hasCostData ? `${marginPct}% z tržeb` : "Chybí nákupní ceny"}
          changeType={hasCostData && totalMargin > 0 ? "up" : "neutral"}
        />
        <StatCard
          label="Počet transakcí"
          value={String(totalTransactions)}
          changeType="neutral"
        />
        <StatCard
          label="Průměrná objednávka"
          value={formatPrice(avgOrder)}
          changeType="neutral"
        />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tržby po dnech</h2>
        {revenueByDay.some((v) => v > 0) ? (
          <LineChart data={revenueByDay} labels={dateLabels} formatValue={(v) => formatPrice(v)} />
        ) : (
          <p className="text-sm text-gray-400 py-8 text-center">Žádné tržby v tomto období.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* DPH summary */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">DPH souhrn</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tržby s DPH</span>
              <span className="font-medium text-gray-900">{formatPrice(totalRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">DPH 21%</span>
              <span className="font-medium text-gray-900">{formatPrice(vatAmount)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between text-sm">
              <span className="text-gray-500">Základ bez DPH</span>
              <span className="font-bold text-gray-900">{formatPrice(totalRevenue - vatAmount)}</span>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platební metody</h2>
          {Object.keys(byMethod).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(byMethod)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([method, data]) => (
                  <div key={method} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-medium">
                        {methodLabels[method] || method}
                      </span>
                      <span className="text-xs text-gray-400">{data.count}x</span>
                    </div>
                    <span className="font-medium text-gray-900">{formatPrice(data.total)}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Žádné transakce.</p>
          )}
        </div>

        {/* Margin breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Marže</h2>
          {hasCostData ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tržby</span>
                <span className="font-medium text-gray-900">{formatPrice(totalRevenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Náklady (nákupní ceny)</span>
                <span className="font-medium text-gray-900">{formatPrice(totalCost)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between text-sm">
                <span className="text-gray-500">Hrubá marže</span>
                <span className="font-bold text-green-600">{formatPrice(totalMargin)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Marže %</span>
                <span className="font-medium text-gray-900">{marginPct}%</span>
              </div>
              {/* Margin bar */}
              <div className="mt-2">
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${Math.min(parseFloat(marginPct), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400">
                Vyplňte nákupní ceny (costPrice) u variant pro výpočet marží.
              </p>
              <Link
                href="/admin/produkty"
                className="text-xs font-medium text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                Správa produktů &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Poslední transakce</h2>
          <a
            href="/api/admin/orders/export"
            download
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Export CSV
          </a>
        </div>
        {recentPaidOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Datum</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Objednávka</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Zákazník</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Částka</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Metoda</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentPaidOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap hidden md:table-cell">
                      {order.createdAt.toLocaleDateString("cs-CZ", {
                        day: "numeric",
                        month: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/objednavky/${order.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        #{order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700 hidden sm:table-cell">
                      {order.firstName} {order.lastName}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-600">
                        {methodLabels[order.paymentMethod] || order.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        Zaplaceno
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">Žádné zaplacené objednávky v tomto období.</p>
          </div>
        )}
      </div>
    </div>
  );
}

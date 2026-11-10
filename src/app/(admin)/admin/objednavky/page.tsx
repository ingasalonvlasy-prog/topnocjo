import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { StatCard } from "@/components/admin/StatCard";
import { OrderFilters } from "@/components/admin/OrderFilters";
import { ExportOrdersButton } from "@/components/admin/ExportOrdersButton";
import { OrderTableClient } from "@/components/admin/OrderTableClient";
import type { OrderRow } from "@/components/admin/OrderTableClient";
import Link from "next/link";
import { Suspense } from "react";

const PER_PAGE = 50;

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

// Helper: aggregate daily counts from order list
function dailyCounts(orders: { createdAt: Date }[], days: number): number[] {
  const now = new Date();
  const result: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(now.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    result.push(
      orders.filter((o) => o.createdAt >= dayStart && o.createdAt <= dayEnd).length
    );
  }
  return result;
}

function pctChange(today: number, yesterday: number): { text: string; type: "up" | "down" | "neutral" } {
  if (yesterday === 0 && today === 0) return { text: "0%", type: "neutral" };
  if (yesterday === 0) return { text: "+100%", type: "up" };
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  if (pct > 0) return { text: `${pct}%`, type: "up" };
  if (pct < 0) return { text: `${pct}%`, type: "down" };
  return { text: "0%", type: "neutral" };
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = params.status || "";
  const paymentStatus = params.paymentStatus || "";
  const dateFrom = params.dateFrom || "";
  const dateTo = params.dateTo || "";
  const search = params.search || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));

  // Build where clause for filtered list
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom);
    if (dateTo) createdAt.lte = new Date(dateTo + "T23:59:59");
    where.createdAt = createdAt;
  }
  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { email: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
    ];
  }

  // 7 days ago for sparkline data
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const [orders, total, recentOrders] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { shipping: true, items: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.order.count({ where }),
    // Last 7 days for stats — all orders regardless of filters
    prisma.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: {
        createdAt: true,
        status: true,
        total: true,
        shippedAt: true,
        items: { select: { quantity: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  // Compute stat card data
  const todayOrders = recentOrders.filter((o) => o.createdAt >= todayStart);
  const yesterdayOrders = recentOrders.filter(
    (o) => o.createdAt >= yesterdayStart && o.createdAt < todayStart
  );

  const ordersToday = todayOrders.length;
  const ordersYesterday = yesterdayOrders.length;
  const orderChange = pctChange(ordersToday, ordersYesterday);

  const itemsToday = todayOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0
  );
  const itemsYesterday = yesterdayOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0
  );
  const itemsChange = pctChange(itemsToday, itemsYesterday);

  const refundedToday = todayOrders.filter((o) => o.status === "CANCELLED").length;
  const refundedYesterday = yesterdayOrders.filter((o) => o.status === "CANCELLED").length;
  const refundChange = pctChange(refundedToday, refundedYesterday);

  const fulfilledToday = todayOrders.filter((o) => o.status === "SHIPPED").length;
  const fulfilledYesterday = yesterdayOrders.filter((o) => o.status === "SHIPPED").length;
  const fulfilledChange = pctChange(fulfilledToday, fulfilledYesterday);

  const deliveredToday = todayOrders.filter((o) => o.status === "DELIVERED").length;
  const deliveredYesterday = yesterdayOrders.filter((o) => o.status === "DELIVERED").length;
  const deliveredChange = pctChange(deliveredToday, deliveredYesterday);

  // Avg fulfillment time (shipped orders in last 7 days)
  const shippedRecent = recentOrders.filter((o) => o.shippedAt);
  const avgFulfillmentHours =
    shippedRecent.length > 0
      ? Math.round(
          shippedRecent.reduce(
            (sum, o) =>
              sum + (o.shippedAt!.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60),
            0
          ) / shippedRecent.length
        )
      : 0;
  const avgFulfillmentDays = (avgFulfillmentHours / 24).toFixed(1);

  // Sparkline data (7 days)
  const sparkAll = dailyCounts(recentOrders, 7);
  const sparkFulfilled = dailyCounts(
    recentOrders.filter((o) => o.status === "SHIPPED"),
    7
  );
  const sparkDelivered = dailyCounts(
    recentOrders.filter((o) => o.status === "DELIVERED"),
    7
  );
  const sparkItems: number[] = (() => {
    const now = new Date();
    const result: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      result.push(
        recentOrders
          .filter((o) => o.createdAt >= dayStart && o.createdAt <= dayEnd)
          .reduce((s, o) => s + o.items.reduce((q, i) => q + i.quantity, 0), 0)
      );
    }
    return result;
  })();

  // Serialize orders for client component
  const orderRows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    firstName: o.firstName,
    lastName: o.lastName,
    email: o.email,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: o.total,
    itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
    shippingName: o.shipping?.name || null,
  }));

  return (
    <div>
      {/* Header with buttons */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Objednávky</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} {total === 1 ? "objednávka" : total < 5 ? "objednávky" : "objednávek"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <ExportOrdersButton />
          </Suspense>
          <MoreActionsDropdown />
          <Link
            href="/admin/objednavky/nova"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Vytvořit objednávku
          </Link>
        </div>
      </div>

      {/* Stat cards — 6 in grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          label="Objednávky dnes"
          value={String(ordersToday)}
          change={orderChange.text}
          changeType={orderChange.type}
          sparkline={sparkAll}
        />
        <StatCard
          label="Objednané položky"
          value={String(itemsToday)}
          change={itemsChange.text}
          changeType={itemsChange.type}
          sparkline={sparkItems}
        />
        <StatCard
          label="Vrácení"
          value={String(refundedToday)}
          change={refundChange.text}
          changeType={refundChange.type}
        />
        <StatCard
          label="Splněné"
          value={String(fulfilledToday)}
          change={fulfilledChange.text}
          changeType={fulfilledChange.type}
          sparkline={sparkFulfilled}
        />
        <StatCard
          label="Doručené"
          value={String(deliveredToday)}
          change={deliveredChange.text}
          changeType={deliveredChange.type}
          sparkline={sparkDelivered}
        />
        <StatCard
          label="Doba plnění"
          value={avgFulfillmentHours < 48 ? `${avgFulfillmentHours}h` : `${avgFulfillmentDays}d`}
          changeType="neutral"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
        <Suspense fallback={<div className="h-8" />}>
          <OrderFilters />
        </Suspense>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Žádné objednávky nenalezeny.</p>
          </div>
        ) : (
          <OrderTableClient orders={orderRows} />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Strana {page} z {totalPages}
            </p>
            <div className="flex gap-1">
              {page > 1 && (
                <PaginationLink page={page - 1} params={params} label="&larr;" />
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
                  <PaginationLink
                    key={p}
                    page={p}
                    params={params}
                    label={String(p)}
                    active={p === page}
                  />
                );
              })}
              {page < totalPages && (
                <PaginationLink page={page + 1} params={params} label="&rarr;" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MoreActionsDropdown() {
  return (
    <div className="relative group">
      <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
        Další akce
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
        <div className="py-1">
          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
            Import objednávek
          </button>
          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
            Hromadná editace
          </button>
        </div>
      </div>
    </div>
  );
}

function PaginationLink({
  page,
  params,
  label,
  active = false,
}: {
  page: number;
  params: Record<string, string | undefined>;
  label: string;
  active?: boolean;
}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "page") sp.set(k, v);
  }
  sp.set("page", String(page));

  return (
    <Link
      href={`/admin/objednavky?${sp.toString()}`}
      className={`inline-flex items-center justify-center w-8 h-8 text-sm rounded-md transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-600 hover:bg-gray-100"
      }`}
      dangerouslySetInnerHTML={{ __html: label }}
    />
  );
}

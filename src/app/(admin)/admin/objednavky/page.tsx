import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/lib/order-constants";
import type { OrderStatus, PaymentStatus } from "@/lib/order-constants";
import { OrderFilters } from "@/components/admin/OrderFilters";
import { ExportOrdersButton } from "@/components/admin/ExportOrdersButton";
import Link from "next/link";
import { Suspense } from "react";

const PER_PAGE = 20;

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = params.status || "";
  const paymentStatus = params.paymentStatus || "";
  const dateFrom = params.dateFrom || "";
  const dateTo = params.dateTo || "";
  const search = params.search || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));

  // Build where clause
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

  const [orders, total, newCount, pendingPayment, awaitingSupplier, readyToShip] =
    await Promise.all([
      prisma.order.findMany({
        where,
        include: { shipping: true, items: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
      prisma.order.count({ where }),
      prisma.order.count({ where: { status: "NEW" } }),
      prisma.order.count({
        where: { paymentStatus: "PENDING", status: { not: "CANCELLED" } },
      }),
      prisma.order.count({ where: { status: "AWAITING_SUPPLIER" } }),
      prisma.order.count({
        where: {
          status: { in: ["CONFIRMED", "PROCESSING"] },
          paymentStatus: "PAID",
        },
      }),
    ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  function StatLink({
    href,
    color,
    label,
    count,
  }: {
    href: string;
    color: string;
    label: string;
    count: number;
  }) {
    return (
      <Link
        href={href}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:shadow-sm ${color}`}
      >
        {label}: <span className="font-bold">{count}</span>
      </Link>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Objednávky</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} {total === 1 ? "objednávka" : total < 5 ? "objednávky" : "objednávek"}
          </p>
        </div>
        <Suspense fallback={null}>
          <ExportOrdersButton />
        </Suspense>
      </div>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-2 mb-6">
        <StatLink
          href="/admin/objednavky?status=NEW"
          color="border-blue-200 bg-blue-50 text-blue-700"
          label="Nové"
          count={newCount}
        />
        <StatLink
          href="/admin/objednavky?paymentStatus=PENDING"
          color="border-yellow-200 bg-yellow-50 text-yellow-700"
          label="Čeká platba"
          count={pendingPayment}
        />
        <StatLink
          href="/admin/objednavky?status=AWAITING_SUPPLIER"
          color="border-orange-200 bg-orange-50 text-orange-700"
          label="Čeká dodavatel"
          count={awaitingSupplier}
        />
        <StatLink
          href="/admin/objednavky?status=CONFIRMED&paymentStatus=PAID"
          color="border-purple-200 bg-purple-50 text-purple-700"
          label="K odeslání"
          count={readyToShip}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Číslo
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Zákazník
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Datum
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Doprava
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Stav
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Platba
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">
                    Celkem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const statusKey = order.status as OrderStatus;
                  const paymentKey = order.paymentStatus as PaymentStatus;
                  const statusColor = ORDER_STATUS_COLORS[statusKey] || {
                    bg: "bg-gray-100",
                    text: "text-gray-700",
                  };
                  const paymentColor = PAYMENT_STATUS_COLORS[paymentKey] || {
                    bg: "bg-gray-100",
                    text: "text-gray-700",
                  };

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/objednavky/${order.id}`}
                          className="font-mono text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {order.firstName} {order.lastName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {order.createdAt.toLocaleDateString("cs-CZ", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {order.shipping?.name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusColor.bg} ${statusColor.text}`}
                        >
                          {ORDER_STATUS_LABELS[statusKey] || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${paymentColor.bg} ${paymentColor.text}`}
                        >
                          {PAYMENT_STATUS_LABELS[paymentKey] ||
                            order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                        {formatPrice(order.total)}
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

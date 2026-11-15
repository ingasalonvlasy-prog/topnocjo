import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/lib/order-constants";
import type { OrderStatus, PaymentStatus } from "@/lib/order-constants";
import Link from "next/link";

const FULFILLMENT_MAP: Record<string, { label: string; bg: string; text: string }> = {
  NEW: { label: "Nesplněno", bg: "bg-yellow-100", text: "text-yellow-700" },
  CONFIRMED: { label: "Nesplněno", bg: "bg-yellow-100", text: "text-yellow-700" },
  PROCESSING: { label: "Probíhá", bg: "bg-blue-100", text: "text-blue-700" },
  AWAITING_SUPPLIER: { label: "Čeká dodavatel", bg: "bg-orange-100", text: "text-orange-700" },
  SHIPPED: { label: "Splněno", bg: "bg-green-100", text: "text-green-700" },
  DELIVERED: { label: "Doručeno", bg: "bg-green-100", text: "text-green-700" },
  CANCELLED: { label: "Zrušeno", bg: "bg-red-100", text: "text-red-700" },
};

const UNFULFILLED_STATUSES = ["NEW", "CONFIRMED", "PROCESSING", "AWAITING_SUPPLIER"];
const FULFILLED_STATUSES = ["SHIPPED", "DELIVERED"];

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function FulfillmentPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab = params.tab || "nesplnene";

  // Build where clause based on tab
  const where: Record<string, unknown> = {};
  if (tab === "nesplnene") {
    where.status = { in: UNFULFILLED_STATUSES };
    where.paymentStatus = "PAID";
  } else if (tab === "splnene") {
    where.status = { in: FULFILLED_STATUSES };
  }
  // "vse" = no filter

  const orders = await prisma.order.findMany({
    where,
    include: {
      shipping: true,
      items: { select: { quantity: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const [unfulfilledCount, fulfilledCount] = await Promise.all([
    prisma.order.count({
      where: { status: { in: UNFULFILLED_STATUSES }, paymentStatus: "PAID" },
    }),
    prisma.order.count({
      where: { status: { in: FULFILLED_STATUSES } },
    }),
  ]);

  const tabs = [
    { key: "nesplnene", label: "Nesplněné", count: unfulfilledCount },
    { key: "splnene", label: "Splněné", count: fulfilledCount },
    { key: "vse", label: "Vše", count: null },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expedice</h1>
          <p className="text-sm text-gray-500 mt-1">
            Přehled objednávek k odeslání a splněných zásilek
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12Zm-2.25 0h.008v.008H16.5V12Z" />
            </svg>
            Packing slipy
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportovat CSV
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            Předávací protokol
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/objednavky/expedice?tab=${t.key}`}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {t.label}
            {t.count !== null && (
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full ${
                tab === t.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {t.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            <p className="text-gray-500">
              {tab === "nesplnene"
                ? "Žádné objednávky k expedici."
                : tab === "splnene"
                ? "Žádné splněné objednávky."
                : "Žádné objednávky."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Číslo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Zákazník</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Vytvořeno</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Cena</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Stav</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Plnění</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tracking</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Doprava</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const statusKey = order.status as OrderStatus;
                  const paymentKey = order.paymentStatus as PaymentStatus;
                  const statusColor = ORDER_STATUS_COLORS[statusKey] || { bg: "bg-gray-100", text: "text-gray-700" };
                  const fulfillment = FULFILLMENT_MAP[order.status] || { label: order.status, bg: "bg-gray-100", text: "text-gray-700" };
                  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/objednavky/${order.id}`}
                          className="font-mono text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          #{order.orderNumber}
                        </Link>
                        <div className="text-xs text-gray-400">{itemCount} pol.</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {order.firstName} {order.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{order.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {order.createdAt.toLocaleDateString("cs-CZ", {
                          day: "numeric",
                          month: "short",
                        })}
                        <span className="text-gray-400 ml-1">
                          {order.createdAt.toLocaleTimeString("cs-CZ", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusColor.bg} ${statusColor.text}`}>
                          {ORDER_STATUS_LABELS[statusKey] || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${fulfillment.bg} ${fulfillment.text}`}>
                          {fulfillment.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {order.trackingNumber ? (
                          <div>
                            {order.trackingUrl ? (
                              <a
                                href={order.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-mono text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {order.trackingNumber}
                              </a>
                            ) : (
                              <span className="text-xs font-mono text-gray-600">{order.trackingNumber}</span>
                            )}
                            {order.shippedAt && (
                              <div className="text-xs text-gray-400">
                                {order.shippedAt.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-900">{order.shipping?.name || "—"}</div>
                        {order.pickupPointName && (
                          <div className="text-xs text-gray-500 truncate max-w-[140px]" title={order.pickupPointName}>
                            {order.pickupPointName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/admin/objednavky/${order.id}`}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                            title="Detail"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                          </Link>
                          <a
                            href={`/admin/objednavky/${order.id}/balici-list`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                            title="Balicí list"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12Zm-2.25 0h.008v.008H16.5V12Z" />
                            </svg>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

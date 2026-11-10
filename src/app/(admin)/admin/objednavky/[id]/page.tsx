import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_TRANSITIONS,
  ORDER_TRANSITION_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/order-constants";
import type { OrderStatus, PaymentStatus } from "@/lib/order-constants";
import {
  updateOrderStatus,
  updateTracking,
  updateAdminNote,
  markSupplierOrdered,
  markSupplierReceived,
} from "./actions";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface TimelineEvent {
  date: Date;
  label: string;
  color: string;
}

function buildTimeline(order: {
  createdAt: Date;
  paidAt: Date | null;
  supplierOrderedAt: Date | null;
  supplierReceivedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({ date: order.createdAt, label: "Objednávka vytvořena", color: "blue" });
  if (order.paidAt) events.push({ date: order.paidAt, label: "Zaplaceno", color: "green" });
  if (order.supplierOrderedAt)
    events.push({ date: order.supplierOrderedAt, label: "Objednáno od dodavatele", color: "orange" });
  if (order.supplierReceivedAt)
    events.push({ date: order.supplierReceivedAt, label: "Zboží od dodavatele přijato", color: "orange" });
  if (order.shippedAt) events.push({ date: order.shippedAt, label: "Odesláno", color: "purple" });
  if (order.deliveredAt) events.push({ date: order.deliveredAt, label: "Doručeno", color: "green" });
  if (order.cancelledAt) events.push({ date: order.cancelledAt, label: "Zrušeno", color: "red" });

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

const TIMELINE_COLORS: Record<string, { dot: string; line: string }> = {
  blue: { dot: "bg-blue-500", line: "border-blue-200" },
  green: { dot: "bg-green-500", line: "border-green-200" },
  orange: { dot: "bg-orange-500", line: "border-orange-200" },
  purple: { dot: "bg-purple-500", line: "border-purple-200" },
  red: { dot: "bg-red-500", line: "border-red-200" },
};

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      shipping: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  if (!order) notFound();

  const statusKey = order.status as OrderStatus;
  const paymentKey = order.paymentStatus as PaymentStatus;
  const statusColor = ORDER_STATUS_COLORS[statusKey] || { bg: "bg-gray-100", text: "text-gray-700" };
  const paymentColor = PAYMENT_STATUS_COLORS[paymentKey] || { bg: "bg-gray-100", text: "text-gray-700" };
  const allowedTransitions = ORDER_STATUS_TRANSITIONS[statusKey] || [];
  const timeline = buildTimeline(order);

  const hasShippingAddress =
    order.shippingStreet && order.shippingCity && order.shippingZip;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/objednavky"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          &larr; Zpět na objednávky
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Objednávka {order.orderNumber}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{formatDateTime(order.createdAt)}</p>
          </div>
          <a
            href={`/admin/objednavky/${order.id}/faktura`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12Zm-2.25 0h.008v.008H16.5V12Z" />
            </svg>
            Tisk faktury
          </a>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order items */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Položky</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left font-medium text-gray-600">#</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Produkt</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Varianta</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">SKU</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-600">Ks</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Cena/ks</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Celkem</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Zdroj</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items.map((item, idx) => {
                    let source: { label: string; color: string };
                    if (item.fromOwnStock > 0 && item.fromSupplierStock === 0) {
                      source = { label: "Vlastní sklad", color: "text-green-700 bg-green-50" };
                    } else if (item.fromOwnStock === 0 && item.fromSupplierStock > 0) {
                      source = { label: "Dodavatel", color: "text-orange-700 bg-orange-50" };
                    } else if (item.fromOwnStock > 0 && item.fromSupplierStock > 0) {
                      source = {
                        label: `${item.fromOwnStock} vlastní + ${item.fromSupplierStock} dodavatel`,
                        color: "text-amber-700 bg-amber-50",
                      };
                    } else {
                      source = { label: "-", color: "text-gray-500" };
                    }

                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{item.productName}</td>
                        <td className="px-4 py-2 text-gray-600">{item.variantTitle}</td>
                        <td className="px-4 py-2 text-gray-500 font-mono text-xs">{item.sku || "-"}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatPrice(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">
                          {formatPrice(item.totalPrice)}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-1.5 py-0.5 text-xs rounded ${source.color}`}>
                            {source.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Mezisoučet</span>
                <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Doprava ({order.shipping?.name})</span>
                <span className="text-gray-900">{formatPrice(order.shippingPrice)}</span>
              </div>
              <div className="flex justify-between py-1 border-t border-gray-200 mt-1 pt-2">
                <span className="font-bold text-gray-900">Celkem</span>
                <span className="font-bold text-gray-900 text-base">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Supplier banner */}
          {order.needsSupplierOrder && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-800 mb-2">
                Objednávka vyžaduje dodání od dodavatele
              </h3>
              <ul className="text-sm text-amber-700 space-y-1 mb-3">
                {order.items
                  .filter((i) => i.fromSupplierStock > 0)
                  .map((i) => (
                    <li key={i.id}>
                      {i.productName} ({i.variantTitle}) — {i.fromSupplierStock} ks
                    </li>
                  ))}
              </ul>
              <div className="flex gap-2">
                <form action={markSupplierOrdered}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button
                    type="submit"
                    disabled={!!order.supplierOrderedAt}
                    className="px-3 py-1.5 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {order.supplierOrderedAt
                      ? `Objednáno ${formatDate(order.supplierOrderedAt)}`
                      : "Označit jako objednáno"}
                  </button>
                </form>
                <form action={markSupplierReceived}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button
                    type="submit"
                    disabled={!!order.supplierReceivedAt || !order.supplierOrderedAt}
                    className="px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {order.supplierReceivedAt
                      ? `Přijato ${formatDate(order.supplierReceivedAt)}`
                      : "Zboží přijato"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Admin note */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Admin poznámka</h2>
            <form action={updateAdminNote}>
              <input type="hidden" name="orderId" value={order.id} />
              <textarea
                name="adminNote"
                defaultValue={order.adminNote || ""}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none resize-y"
                placeholder="Interní poznámka k objednávce..."
              />
              <button
                type="submit"
                className="mt-2 px-4 py-1.5 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                Uložit poznámku
              </button>
            </form>
          </div>

          {/* Customer note */}
          {order.note && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Poznámka zákazníka</h2>
              <p className="text-sm text-gray-700">{order.note}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Historie</h2>
            <div className="space-y-0">
              {timeline.map((event, idx) => {
                const colors = TIMELINE_COLORS[event.color] || TIMELINE_COLORS.blue;
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${colors.dot}`} />
                      {idx < timeline.length - 1 && (
                        <div className={`w-px h-6 border-l-2 ${colors.line}`} />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-gray-900">{event.label}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(event.date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column — 1/3 sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Stav</h3>
            <span
              className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${statusColor.bg} ${statusColor.text}`}
            >
              {ORDER_STATUS_LABELS[statusKey] || order.status}
            </span>
            {allowedTransitions.length > 0 && (
              <div className="mt-3 space-y-2">
                {allowedTransitions.map((nextStatus) => {
                  const nextColor = ORDER_STATUS_COLORS[nextStatus];
                  const isCancelAction = nextStatus === "CANCELLED";
                  return (
                    <form action={updateOrderStatus} key={nextStatus}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="newStatus" value={nextStatus} />
                      <button
                        type="submit"
                        className={`w-full px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          isCancelAction
                            ? "border border-red-300 text-red-700 hover:bg-red-50"
                            : `${nextColor.bg} ${nextColor.text} hover:opacity-80`
                        }`}
                      >
                        {ORDER_TRANSITION_LABELS[nextStatus]}
                      </button>
                    </form>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Platba</h3>
            <span
              className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${paymentColor.bg} ${paymentColor.text}`}
            >
              {PAYMENT_STATUS_LABELS[paymentKey] || order.paymentStatus}
            </span>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <p>{PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}</p>
              {order.comgateTransId && (
                <p className="font-mono text-xs text-gray-500">ID: {order.comgateTransId}</p>
              )}
              {order.paidAt && <p>Zaplaceno: {formatDate(order.paidAt)}</p>}
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Doprava</h3>
            <p className="text-sm font-medium text-gray-900">{order.shipping?.name || "-"}</p>
            <p className="text-sm text-gray-600">{formatPrice(order.shippingPrice)}</p>
            {order.packetaPointName && (
              <div className="mt-2 text-sm text-gray-600">
                <p className="font-medium">Výdejní místo:</p>
                <p>{order.packetaPointName}</p>
                {order.packetaPointId && (
                  <p className="text-xs text-gray-500">ID: {order.packetaPointId}</p>
                )}
              </div>
            )}
          </div>

          {/* Tracking */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tracking</h3>
            <form action={updateTracking} className="space-y-2">
              <input type="hidden" name="orderId" value={order.id} />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tracking číslo</label>
                <input
                  name="trackingNumber"
                  defaultValue={order.trackingNumber || ""}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tracking URL</label>
                <input
                  name="trackingUrl"
                  defaultValue={order.trackingUrl || ""}
                  placeholder="https://..."
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full px-3 py-1.5 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                Uložit tracking
              </button>
            </form>
            {order.trackingUrl && (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Sledovat zásilku &rarr;
              </a>
            )}
          </div>

          {/* Customer */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Zákazník</h3>
            <p className="text-sm font-medium text-gray-900">
              {order.firstName} {order.lastName}
            </p>
            <a href={`mailto:${order.email}`} className="text-sm text-blue-600 hover:text-blue-800">
              {order.email}
            </a>
            {order.phone && (
              <p>
                <a href={`tel:${order.phone}`} className="text-sm text-blue-600 hover:text-blue-800">
                  {order.phone}
                </a>
              </p>
            )}
            {order.user && (
              <p className="mt-1">
                <Link
                  href={`/admin/zakaznici/${order.user.id}`}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Profil zákazníka &rarr;
                </Link>
              </p>
            )}
          </div>

          {/* Billing address */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Fakturační adresa
            </h3>
            <div className="text-sm text-gray-700">
              <p>{order.firstName} {order.lastName}</p>
              <p>{order.street}</p>
              <p>{order.zip} {order.city}</p>
            </div>
          </div>

          {/* Shipping address */}
          {hasShippingAddress && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Doručovací adresa
              </h3>
              <div className="text-sm text-gray-700">
                {order.shippingName && <p>{order.shippingName}</p>}
                <p>{order.shippingStreet}</p>
                <p>{order.shippingZip} {order.shippingCity}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

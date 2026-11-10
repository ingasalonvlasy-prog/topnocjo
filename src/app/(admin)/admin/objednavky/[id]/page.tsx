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

// Fulfillment status mapping
const FULFILLMENT_MAP: Record<string, { label: string; bg: string; text: string }> = {
  NEW: { label: "Nesplněno", bg: "bg-yellow-100", text: "text-yellow-700" },
  CONFIRMED: { label: "Nesplněno", bg: "bg-yellow-100", text: "text-yellow-700" },
  PROCESSING: { label: "Probíhá", bg: "bg-blue-100", text: "text-blue-700" },
  AWAITING_SUPPLIER: { label: "Probíhá", bg: "bg-blue-100", text: "text-blue-700" },
  SHIPPED: { label: "Splněno", bg: "bg-green-100", text: "text-green-700" },
  DELIVERED: { label: "Doručeno", bg: "bg-green-100", text: "text-green-700" },
  CANCELLED: { label: "Zrušeno", bg: "bg-red-100", text: "text-red-700" },
};

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  result.setHours(12, 0, 0, 0);
  return result;
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

  // Fetch product photos for item thumbnails
  const productIds = order.items.map((i) => i.productId).filter(Boolean) as string[];
  const products = productIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, photos: true, slug: true },
      })
    : [];
  const photoMap = new Map(
    products.map((p) => [p.id, (JSON.parse(p.photos || "[]") as string[])[0] || null])
  );
  const slugMap = new Map(products.map((p) => [p.id, p.slug]));

  // Fetch variant costPrices for margin calculation
  const variantIds = order.items.map((i) => i.variantId).filter(Boolean) as string[];
  const variants = variantIds.length > 0
    ? await prisma.variant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, costPrice: true },
      })
    : [];
  const costMap = new Map(variants.map((v) => [v.id, v.costPrice]));

  // Customer order count
  const customerOrderCount = order.email
    ? await prisma.order.count({ where: { email: order.email } })
    : 1;

  const statusKey = order.status as OrderStatus;
  const paymentKey = order.paymentStatus as PaymentStatus;
  const statusColor = ORDER_STATUS_COLORS[statusKey] || { bg: "bg-gray-100", text: "text-gray-700" };
  const paymentColor = PAYMENT_STATUS_COLORS[paymentKey] || { bg: "bg-gray-100", text: "text-gray-700" };
  const allowedTransitions = ORDER_STATUS_TRANSITIONS[statusKey] || [];
  const fulfillment = FULFILLMENT_MAP[order.status] || { label: order.status, bg: "bg-gray-100", text: "text-gray-700" };
  const timeline = buildTimeline(order);

  const hasShippingAddress = order.shippingStreet && order.shippingCity && order.shippingZip;

  // Fulfillment deadline: createdAt + 2 business days at 12:00
  const fulfillmentDeadline = addBusinessDays(order.createdAt, 2);
  const isOverdue = !order.shippedAt && new Date() > fulfillmentDeadline;

  // Estimated delivery: shippedAt + 2-4 days
  const estimatedDelivery = order.shippedAt
    ? (() => {
        const from = new Date(order.shippedAt);
        from.setDate(from.getDate() + 2);
        const to = new Date(order.shippedAt);
        to.setDate(to.getDate() + 4);
        return `${from.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" })} – ${to.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" })}`;
      })()
    : null;

  // Financial calculations
  const vat = Math.round(order.total * 0.1736); // 21% from price including VAT
  const totalCost = order.items.reduce((sum, item) => {
    const cost = item.variantId ? (costMap.get(item.variantId) || 0) : 0;
    return sum + cost * item.quantity;
  }, 0);
  const margin = totalCost > 0 ? order.subtotal - totalCost : null;

  // Risk assessment
  const isHighValue = order.total > 300000; // > 3000 Kč
  const isNewCustomer = customerOrderCount <= 1;
  const riskLevel = isHighValue && isNewCustomer ? "Střední" : "Nízké";
  const riskColor = riskLevel === "Střední" ? "text-amber-600 bg-amber-50" : "text-green-600 bg-green-50";

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {order.orderNumber}
            </h1>
            {/* Payment badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${paymentColor.bg} ${paymentColor.text}`}>
              {PAYMENT_STATUS_LABELS[paymentKey] || order.paymentStatus}
            </span>
            {/* Fulfillment badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${fulfillment.bg} ${fulfillment.text}`}>
              {fulfillment.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
              Vrátit peníze
            </button>
            <a
              href={`/admin/objednavky/${order.id}/faktura`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12Zm-2.25 0h.008v.008H16.5V12Z" />
              </svg>
              Faktura
            </a>
            <a
              href={`/admin/objednavky/${order.id}/balici-list`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
              Balicí list
            </a>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {formatDateTime(order.createdAt)} &middot; Online obchod
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — 2/3 */}
        <div className="lg:col-span-2 space-y-6">

          {/* Fulfillment section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">Plnění</h2>
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${fulfillment.bg} ${fulfillment.text}`}>
                  {fulfillment.label}
                </span>
              </div>
              {!order.shippedAt && statusKey !== "CANCELLED" && (
                <form action={updateOrderStatus}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="newStatus" value="SHIPPED" />
                  <button
                    type="submit"
                    disabled={!allowedTransitions.includes("SHIPPED")}
                    className="px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Označit jako splněno
                  </button>
                </form>
              )}
            </div>
            <div className="px-4 py-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Dopravce</span>
                <p className="font-medium text-gray-900">{order.shipping?.name || "—"}</p>
              </div>
              <div>
                <span className="text-gray-500">Dodavatel</span>
                <p className="font-medium text-gray-900">
                  {order.needsSupplierOrder ? "Vyžaduje dodavatele" : "Vlastní sklad"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Deadline</span>
                <p className={`font-medium ${isOverdue ? "text-red-600" : "text-gray-900"}`}>
                  {formatDateTime(fulfillmentDeadline)}
                  {isOverdue && <span className="ml-1 text-xs text-red-500">(po termínu)</span>}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Odhad doručení</span>
                <p className="font-medium text-gray-900">
                  {estimatedDelivery || "Po odeslání"}
                </p>
              </div>
              {order.packetaPointName && (
                <div className="col-span-2">
                  <span className="text-gray-500">Výdejní místo</span>
                  <p className="font-medium text-gray-900">
                    {order.packetaPointName}
                    {order.packetaPointId && (
                      <span className="text-xs text-gray-400 ml-1">#{order.packetaPointId}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order items with thumbnails */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Položky</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => {
                const photo = item.productId ? photoMap.get(item.productId) : null;
                const slug = item.productId ? slugMap.get(item.productId) : null;
                let source: { label: string; color: string };
                if (item.fromOwnStock > 0 && item.fromSupplierStock === 0) {
                  source = { label: "Vlastní sklad", color: "text-green-700 bg-green-50" };
                } else if (item.fromOwnStock === 0 && item.fromSupplierStock > 0) {
                  source = { label: "Dodavatel", color: "text-orange-700 bg-orange-50" };
                } else if (item.fromOwnStock > 0 && item.fromSupplierStock > 0) {
                  source = { label: "Mix", color: "text-amber-700 bg-amber-50" };
                } else {
                  source = { label: "—", color: "text-gray-400" };
                }

                return (
                  <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded border border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden">
                      {photo ? (
                        <img
                          src={photo}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {slug ? (
                          <Link href={`/produkt/${slug}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate">
                            {item.productName}
                          </Link>
                        ) : (
                          <span className="text-sm font-medium text-gray-900 truncate">{item.productName}</span>
                        )}
                        <span className={`inline-flex px-1.5 py-0.5 text-xs rounded ${source.color}`}>
                          {source.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span>{item.variantTitle}</span>
                        {item.sku && <span className="font-mono">SKU: {item.sku}</span>}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right text-sm flex-shrink-0">
                      <p className="text-gray-500">
                        {formatPrice(item.unitPrice)} &times; {item.quantity}
                      </p>
                      <p className="font-bold text-gray-900">{formatPrice(item.totalPrice)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial summary */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm space-y-1">
              <div className="flex justify-between py-0.5">
                <span className="text-gray-600">Mezisoučet</span>
                <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-600">
                    Sleva{order.discountCode && <span className="ml-1 font-mono text-xs">({order.discountCode})</span>}
                  </span>
                  <span className="text-green-600">-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between py-0.5">
                <span className="text-gray-600">Doprava ({order.shipping?.name})</span>
                <span className="text-gray-900">
                  {order.shippingPrice === 0 ? "Zdarma" : formatPrice(order.shippingPrice)}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-600">DPH 21%</span>
                <span className="text-gray-900">{formatPrice(vat)}</span>
              </div>
              <div className="flex justify-between py-1 border-t border-gray-200 mt-1 pt-2">
                <span className="font-bold text-gray-900">Celkem</span>
                <span className="font-bold text-gray-900 text-base">{formatPrice(order.total)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500 text-xs">
                  {order.paymentStatus === "PAID" ? "Zaplaceno" : "Čeká na platbu"}
                  {order.paidAt && ` ${formatDate(order.paidAt)}`}
                </span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${paymentColor.bg} ${paymentColor.text}`}>
                  {PAYMENT_STATUS_LABELS[paymentKey]}
                </span>
              </div>
            </div>
          </div>

          {/* Margin / Meta fields */}
          {(margin !== null || totalCost > 0) && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Ekonomika objednávky</h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Nákupní cena</span>
                  <p className="font-medium text-gray-900">{formatPrice(totalCost)}</p>
                </div>
                {margin !== null && (
                  <div>
                    <span className="text-gray-500">Marže</span>
                    <p className={`font-medium ${margin > 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatPrice(margin)}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Zdroj položek</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {order.items.some((i) => i.fromOwnStock > 0) && (
                      <span className="flex items-center gap-1 text-xs">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Vlastní
                      </span>
                    )}
                    {order.items.some((i) => i.fromSupplierStock > 0) && (
                      <span className="flex items-center gap-1 text-xs">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        Dodavatel
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

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
            <p className="text-sm font-medium text-gray-900">{order.shipping?.name || "—"}</p>
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
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {customerOrderCount === 1 ? "1. objednávka" : `${customerOrderCount} objednávek`}
              </span>
              {customerOrderCount <= 1 && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">Nový</span>
              )}
            </div>
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

          {/* Risk assessment */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Riziko objednávky</h3>
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${riskColor}`}>
              {riskLevel}
            </span>
            {riskLevel === "Střední" && (
              <p className="text-xs text-gray-500 mt-1">
                Nový zákazník, částka nad 3 000 Kč
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Doručovací adresa
                </h3>
                <a
                  href={`https://mapy.cz/zakladni?q=${encodeURIComponent(`${order.shippingStreet}, ${order.shippingZip} ${order.shippingCity}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Zobrazit mapu
                </a>
              </div>
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

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
  addComment,
} from "./actions";
import { OrderTimelineItem } from "./timeline-item";
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

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      shipping: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      events: { orderBy: { createdAt: "desc" } },
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

  // Customer order count + total spend
  const customerOrderCount = order.email
    ? await prisma.order.count({ where: { email: order.email } })
    : 1;
  const customerTotalSpend = order.email
    ? (await prisma.order.aggregate({
        where: { email: order.email, paymentStatus: "PAID" },
        _sum: { total: true },
      }))._sum.total || 0
    : 0;
  const customerSegment = customerTotalSpend > 1000000
    ? { label: "VIP", color: "bg-amber-100 text-amber-800" }
    : customerOrderCount > 1
    ? { label: "Vracející se", color: "bg-green-100 text-green-700" }
    : { label: "Nový", color: "bg-blue-100 text-blue-700" };
  const customerInitials = `${(order.firstName || "?")[0]}${(order.lastName || "?")[0]}`.toUpperCase();

  const statusKey = order.status as OrderStatus;
  const paymentKey = order.paymentStatus as PaymentStatus;
  const statusColor = ORDER_STATUS_COLORS[statusKey] || { bg: "bg-gray-100", text: "text-gray-700" };
  const paymentColor = PAYMENT_STATUS_COLORS[paymentKey] || { bg: "bg-gray-100", text: "text-gray-700" };
  const allowedTransitions = ORDER_STATUS_TRANSITIONS[statusKey] || [];
  const fulfillment = FULFILLMENT_MAP[order.status] || { label: order.status, bg: "bg-gray-100", text: "text-gray-700" };

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
  const vat = Math.round(order.total * 0.1736);
  const totalCost = order.items.reduce((sum, item) => {
    const cost = item.variantId ? (costMap.get(item.variantId) || 0) : 0;
    return sum + cost * item.quantity;
  }, 0);
  const margin = totalCost > 0 ? order.subtotal - totalCost : null;

  // Risk assessment
  const isHighValue = order.total > 300000;
  const isNewCustomer = customerOrderCount <= 1;
  const riskLevel = isHighValue && isNewCustomer ? "Střední" : null;

  // Non-cancel transitions for select
  const nextTransitions = allowedTransitions.filter((s) => s !== "CANCELLED");
  const canCancel = allowedTransitions.includes("CANCELLED");

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              #{order.orderNumber}
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${paymentColor.bg} ${paymentColor.text}`}>
              {PAYMENT_STATUS_LABELS[paymentKey] || order.paymentStatus}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${fulfillment.bg} ${fulfillment.text}`}>
              {fulfillment.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
              Vrátit peníze
            </button>
            <a
              href={`/admin/objednavky/${order.id}/faktura`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Faktura
            </a>
            <a
              href={`/admin/objednavky/${order.id}/balici-list`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
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
        {/* ============ LEFT COLUMN (2/3) ============ */}
        <div className="lg:col-span-2 space-y-6">

          {/* CARD 1: Fulfillment + Items (merged) */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
            {/* Fulfillment header */}
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${fulfillment.bg} ${fulfillment.text}`}>
                  {fulfillment.label}
                </span>
                <span className="text-sm text-gray-700 truncate">
                  {order.shipping?.name || "—"}
                  {order.pickupPointName && (
                    <> &middot; {order.pickupPointName}</>
                  )}
                </span>
                {order.needsSupplierOrder && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-orange-50 text-orange-700 border border-orange-200">
                    Dodavatel
                  </span>
                )}
              </div>
              {!order.shippedAt && statusKey !== "CANCELLED" && (
                <form action={updateOrderStatus} className="shrink-0">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="newStatus" value="SHIPPED" />
                  <button
                    type="submit"
                    disabled={!allowedTransitions.includes("SHIPPED")}
                    className="px-4 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Označit jako splněno
                  </button>
                </form>
              )}
            </div>

            {/* Items */}
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => {
                const photo = item.productId ? photoMap.get(item.productId) : null;
                const slug = item.productId ? slugMap.get(item.productId) : null;
                const isSupplier = item.fromSupplierStock > 0 && item.fromOwnStock === 0;
                const isOwn = item.fromOwnStock > 0 && item.fromSupplierStock === 0;

                return (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-11 h-11 rounded-lg border border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden">
                      {photo ? (
                        <img src={photo} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {slug ? (
                          <Link href={`/produkt/${slug}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate">
                            {item.productName}
                          </Link>
                        ) : (
                          <span className="text-sm font-medium text-gray-900 truncate">{item.productName}</span>
                        )}
                        {isSupplier && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-orange-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            Dodavatel
                          </span>
                        )}
                        {isOwn && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-green-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Sklad
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">{item.variantTitle}</span>
                        {item.sku && <span className="font-mono text-[11px] text-gray-400">{item.sku}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">
                        {formatPrice(item.unitPrice)} &times; {item.quantity}
                      </p>
                      <p className="font-semibold text-gray-900 text-sm">{formatPrice(item.totalPrice)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Supplier action — inside the card */}
            {order.needsSupplierOrder && (
              <div className="px-5 py-3 border-t border-orange-200 bg-orange-50/50">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-orange-800">
                    <span className="font-medium">Čeká na dodavatele</span>
                    <span className="text-orange-600 ml-1.5">
                      ({order.items.filter((i) => i.fromSupplierStock > 0).reduce((sum, i) => sum + i.fromSupplierStock, 0)} ks)
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <form action={markSupplierOrdered}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <button
                        type="submit"
                        disabled={!!order.supplierOrderedAt}
                        className="px-3 py-1 text-xs font-medium rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        {order.supplierOrderedAt ? `Objednáno ${formatDate(order.supplierOrderedAt)}` : "Objednat"}
                      </button>
                    </form>
                    <form action={markSupplierReceived}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <button
                        type="submit"
                        disabled={!!order.supplierReceivedAt || !order.supplierOrderedAt}
                        className="px-3 py-1 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        {order.supplierReceivedAt ? `Přijato ${formatDate(order.supplierReceivedAt)}` : "Přijato"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CARD 2: Zaplaceno (financial summary) */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2.5">
              <h2 className="font-semibold text-gray-900">Zaplaceno</h2>
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${paymentColor.bg} ${paymentColor.text}`}>
                {PAYMENT_STATUS_LABELS[paymentKey]}
              </span>
            </div>
            <div className="px-5 py-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Mezisoučet <span className="text-gray-400">({order.items.length} {order.items.length === 1 ? "položka" : order.items.length < 5 ? "položky" : "položek"})</span></span>
                <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Sleva{order.discountCode && <span className="ml-1 font-mono text-xs text-gray-400">({order.discountCode})</span>}
                  </span>
                  <span className="text-green-600 font-medium">-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Doprava
                  <span className="text-gray-400 ml-1">({order.shipping?.name})</span>
                </span>
                <span className="text-gray-900">
                  {order.shippingPrice === 0 ? <span className="text-green-600">Zdarma</span> : formatPrice(order.shippingPrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">DPH 21%</span>
                <span className="text-gray-400">Zahrnuto</span>
              </div>
              <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-200">
                <span className="font-bold text-gray-900 text-base">Celkem</span>
                <span className="font-bold text-gray-900 text-lg">{formatPrice(order.total)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
                <span className="flex items-center gap-1.5">
                  {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
                  {order.comgateTransId && (
                    <span className="font-mono text-gray-400">#{order.comgateTransId}</span>
                  )}
                </span>
                <span>
                  {order.paymentStatus === "PAID" && order.paidAt
                    ? `Zaplaceno ${formatDate(order.paidAt)}`
                    : PAYMENT_STATUS_LABELS[paymentKey]}
                </span>
              </div>
            </div>
          </div>

          {/* CARD 3: Ekonomika (conditional) */}
          {(margin !== null || totalCost > 0) && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
              <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Ekonomika objednávky</h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">Nákupní cena</span>
                  <p className="font-medium text-gray-900">{formatPrice(totalCost)}</p>
                </div>
                {margin !== null && (
                  <div>
                    <span className="text-gray-500 text-xs">Marže</span>
                    <p className={`font-medium ${margin > 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatPrice(margin)}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 text-xs">Zdroj</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {order.items.some((i) => i.fromOwnStock > 0) && (
                      <span className="flex items-center gap-1 text-xs">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Sklad
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

          {/* Customer note */}
          {order.note && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3.5">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Poznámka zákazníka</p>
              <p className="text-sm text-blue-900">{order.note}</p>
            </div>
          )}

          {/* CARD 4: Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Časová osa</h2>

            <form action={addComment} className="mb-6">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  A
                </div>
                <div className="flex-1">
                  <textarea
                    name="text"
                    rows={2}
                    placeholder="Přidat komentář..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none resize-y"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      Přidat
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {order.events.length > 0 ? (
              <div className="space-y-0 border-l-2 border-gray-200 ml-4">
                {order.events.map((event) => (
                  <OrderTimelineItem key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Zatím žádné události.</p>
            )}
          </div>
        </div>

        {/* ============ RIGHT COLUMN (1/3 sidebar) ============ */}
        <div className="space-y-5">

          {/* SIDEBAR 1: Poznámky */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Poznámky</h3>
            <form action={updateAdminNote}>
              <input type="hidden" name="orderId" value={order.id} />
              <textarea
                name="adminNote"
                defaultValue={order.adminNote || ""}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none resize-y"
                placeholder="Interní poznámka..."
              />
              <button
                type="submit"
                className="mt-2 w-full px-3 py-1.5 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Uložit
              </button>
            </form>
          </div>

          {/* SIDEBAR 2: Stav objednávky */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Stav</h3>
            <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${statusColor.bg} ${statusColor.text}`}>
              {ORDER_STATUS_LABELS[statusKey] || order.status}
            </span>

            {nextTransitions.length > 0 && (
              <div className="mt-3 space-y-2">
                {nextTransitions.map((nextStatus) => (
                  <form action={updateOrderStatus} key={nextStatus}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="newStatus" value={nextStatus} />
                    <button
                      type="submit"
                      className="w-full px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      {ORDER_TRANSITION_LABELS[nextStatus]}
                    </button>
                  </form>
                ))}
              </div>
            )}

            {canCancel && (
              <form action={updateOrderStatus} className="mt-3 pt-3 border-t border-gray-100">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="newStatus" value="CANCELLED" />
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                >
                  Zrušit objednávku
                </button>
              </form>
            )}
          </div>

          {/* SIDEBAR 3: Zákazník */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Zákazník</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {customerInitials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {order.firstName} {order.lastName}
                  </p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${customerSegment.color}`}>
                    {customerSegment.label}
                  </span>
                  {riskLevel && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                      Riziko: {riskLevel}
                    </span>
                  )}
                </div>
                <a href={`mailto:${order.email}`} className="text-xs text-blue-600 hover:text-blue-800 truncate block">
                  {order.email}
                </a>
              </div>
            </div>
            {order.phone && (
              <a href={`tel:${order.phone}`} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 mb-3">
                {order.phone}
              </a>
            )}
            <div className="flex items-center gap-3 py-2.5 border-t border-gray-100 text-xs text-gray-600">
              <div className="flex-1 text-center">
                <p className="font-bold text-gray-900 text-sm">{customerOrderCount}</p>
                <p>objednávek</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="flex-1 text-center">
                <p className="font-bold text-gray-900 text-sm">{formatPrice(customerTotalSpend)}</p>
                <p>útrata</p>
              </div>
            </div>
            {order.user && (
              <Link
                href={`/admin/zakaznici/${order.user.id}`}
                className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Profil zákazníka &rarr;
              </Link>
            )}
          </div>

          {/* SIDEBAR 4: Doprava & Tracking (merged) */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Doprava</h3>
            <p className="text-sm font-medium text-gray-900">{order.shipping?.name || "—"}</p>
            <p className="text-sm text-gray-500">{formatPrice(order.shippingPrice)}</p>

            {order.pickupPointName && (
              <div className="mt-2 text-sm">
                <p className="text-xs text-gray-500">Výdejní místo</p>
                <p className="font-medium text-gray-900">{order.pickupPointName}</p>
                {order.pickupPointId && (
                  <p className="text-xs text-gray-400">ID: {order.pickupPointId}</p>
                )}
              </div>
            )}

            {!order.shippedAt && statusKey !== "CANCELLED" && (
              <div className="mt-2 text-sm">
                <p className="text-xs text-gray-500">Splnit do</p>
                <p className={`font-medium ${isOverdue ? "text-red-600" : "text-gray-900"}`}>
                  {formatDateTime(fulfillmentDeadline)}
                  {isOverdue && <span className="text-xs text-red-500 ml-1">(po termínu!)</span>}
                </p>
              </div>
            )}

            {estimatedDelivery && (
              <div className="mt-2 text-sm">
                <p className="text-xs text-gray-500">Odhad doručení</p>
                <p className="font-medium text-gray-900">{estimatedDelivery}</p>
              </div>
            )}

            {/* Tracking */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tracking</p>
              {order.trackingNumber ? (
                <div>
                  <p className="font-mono text-sm font-semibold text-gray-900">{order.trackingNumber}</p>
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Sledovat zásilku &rarr;
                    </a>
                  )}
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Upravit</summary>
                    <form action={updateTracking} className="space-y-2 mt-2">
                      <input type="hidden" name="orderId" value={order.id} />
                      <input
                        name="trackingNumber"
                        defaultValue={order.trackingNumber || ""}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                      />
                      <input
                        name="trackingUrl"
                        defaultValue={order.trackingUrl || ""}
                        placeholder="https://..."
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="w-full px-3 py-1.5 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        Uložit
                      </button>
                    </form>
                  </details>
                </div>
              ) : (
                <form action={updateTracking} className="space-y-2">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input
                    name="trackingNumber"
                    placeholder="Tracking číslo"
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                  />
                  <input
                    name="trackingUrl"
                    placeholder="https://..."
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full px-3 py-1.5 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Uložit tracking
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* SIDEBAR 5: Fakturační adresa */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Fakturační adresa</h3>
            <div className="text-sm text-gray-700 space-y-0.5">
              <p className="font-medium text-gray-900">{order.firstName} {order.lastName}</p>
              <p>{order.street}</p>
              <p>{order.zip} {order.city}</p>
            </div>
          </div>

          {/* SIDEBAR 6: Doručovací adresa */}
          {hasShippingAddress && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Doručovací adresa</h3>
                <a
                  href={`https://mapy.cz/zakladni?q=${encodeURIComponent(`${order.shippingStreet}, ${order.shippingZip} ${order.shippingCity}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Mapa
                </a>
              </div>
              <div className="text-sm text-gray-700 space-y-0.5">
                {order.shippingName && <p className="font-medium text-gray-900">{order.shippingName}</p>}
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

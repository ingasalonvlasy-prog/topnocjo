import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { getCurrentUser } from "@/lib/auth";
import { ClearCartOnMount } from "./ClearCart";

interface Props {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ new?: string; fallback?: string; platba?: string; token?: string }>;
}

const statusLabels: Record<string, string> = {
  NEW: "Nová",
  CONFIRMED: "Potvrzená",
  PROCESSING: "Zpracovává se",
  SHIPPED: "Odesláno",
  DELIVERED: "Doručeno",
  CANCELLED: "Zrušeno",
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: "Čeká na platbu",
  PAID: "Zaplaceno",
  CANCELLED: "Platba zrušena",
  REFUNDED: "Vráceno",
};

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const { orderNumber } = await params;
  const sp = await searchParams;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      shipping: true,
    },
  });

  if (!order) notFound();

  // Auth check: valid token, or logged-in owner
  const hasValidToken = sp.token && order.viewToken && sp.token === order.viewToken;
  if (!hasValidToken) {
    const user = await getCurrentUser();
    const isOwner = user && order.userId && user.id === order.userId;
    if (!isOwner) notFound();
  }

  const isNew = sp.new === "1";
  const isFallback = sp.fallback === "1";
  const paymentFailed = sp.platba === "fail";

  return (
    <div className="max-w-[700px] mx-auto px-6 py-12">
      {isNew && <ClearCartOnMount />}

      {/* Header */}
      <div className="text-center mb-8">
        {paymentFailed ? (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-sale" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-[26px] font-extrabold text-navy mb-2">Platba se nezdařila</h1>
            <p className="text-[14px] text-muted">
              Objednávka {order.orderNumber} byla vytvořena, ale platba nebyla dokončena.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-lime/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-[26px] font-extrabold text-navy mb-2">
              {isNew ? "Děkujeme za objednávku!" : "Detail objednávky"}
            </h1>
            <p className="text-[14px] text-muted">
              Číslo objednávky: <span className="font-bold text-ink">{order.orderNumber}</span>
            </p>
            {isFallback && (
              <p className="text-[13px] text-sale mt-2">
                Platba kartou se nezdařila — objednávka byla převedena na bankovní převod.
              </p>
            )}
          </>
        )}
      </div>

      {/* Status badges */}
      <div className="flex justify-center gap-4 mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-wash text-ink">
          Stav: {statusLabels[order.status] || order.status}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold ${
          order.paymentStatus === "PAID" ? "bg-lime/20 text-navy" :
          order.paymentStatus === "CANCELLED" ? "bg-red-50 text-sale" :
          "bg-amber-50 text-amber-700"
        }`}>
          {paymentStatusLabels[order.paymentStatus] || order.paymentStatus}
        </span>
      </div>

      {/* Order progress stepper */}
      {order.status !== "CANCELLED" && (
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-[500px] mx-auto">
            {[
              { key: "NEW", label: "Přijato" },
              { key: "CONFIRMED", label: "Potvrzeno" },
              { key: "SHIPPED", label: "Odesláno" },
              { key: "DELIVERED", label: "Doručeno" },
            ].map((step, idx, arr) => {
              const stepOrder = ["NEW", "CONFIRMED", "PROCESSING", "AWAITING_SUPPLIER", "SHIPPED", "DELIVERED"];
              const currentIdx = stepOrder.indexOf(order.status);
              const stepIdx = stepOrder.indexOf(step.key);
              const isActive = currentIdx >= stepIdx;

              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold ${
                      isActive
                        ? "bg-navy text-white"
                        : "bg-wash text-muted border border-line"
                    }`}>
                      {isActive ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span className={`text-[11px] mt-1.5 font-medium ${isActive ? "text-navy" : "text-muted"}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mt-[-16px] ${isActive ? "bg-navy" : "bg-line"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tracking info */}
      {order.trackingNumber && (
        <div className="bg-wash rounded-[10px] p-5 mb-6">
          <h3 className="text-[14px] font-bold text-navy mb-2">Sledování zásilky</h3>
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-ink">
              Tracking: <span className="font-bold font-mono">{order.trackingNumber}</span>
            </span>
            {order.trackingUrl && (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[13px] font-bold text-blue hover:underline"
              >
                Sledovat zásilku
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Order items */}
      <div className="bg-white border border-line rounded-[10px] p-6 mb-6">
        <h2 className="text-[16px] font-bold text-navy mb-4">Položky objednávky</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center">
              <div>
                <p className="text-[14px] font-medium text-ink">{item.productName}</p>
                <p className="text-[12px] text-muted">
                  {item.variantTitle} &times; {item.quantity}
                </p>
              </div>
              <span className="text-[14px] font-bold text-ink">{formatPrice(item.totalPrice)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-line mt-4 pt-4 space-y-2 text-[14px]">
          <div className="flex justify-between">
            <span className="text-muted">Mezisoučet</span>
            <span className="font-medium text-ink">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Doprava ({order.shipping.name})</span>
            <span className="font-medium text-ink">
              {order.shippingPrice === 0 ? (
                <span className="text-navy font-bold">Zdarma</span>
              ) : (
                formatPrice(order.shippingPrice)
              )}
            </span>
          </div>
          <div className="flex justify-between border-t border-line pt-2">
            <span className="text-[16px] font-bold text-navy">Celkem</span>
            <span className="text-[20px] font-extrabold text-navy">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-line rounded-[10px] p-5">
          <h3 className="text-[13px] font-bold text-muted mb-2 uppercase tracking-wide">Fakturační adresa</h3>
          <p className="text-[14px] text-ink font-medium">{order.firstName} {order.lastName}</p>
          <p className="text-[13px] text-muted">{order.street}</p>
          <p className="text-[13px] text-muted">{order.zip} {order.city}</p>
          <p className="text-[13px] text-muted mt-1">{order.email}</p>
          {order.phone && <p className="text-[13px] text-muted">{order.phone}</p>}
        </div>

        <div className="bg-white border border-line rounded-[10px] p-5">
          <h3 className="text-[13px] font-bold text-muted mb-2 uppercase tracking-wide">Doručení</h3>
          <p className="text-[14px] text-ink font-medium">{order.shipping.name}</p>
          {order.packetaPointName && (
            <p className="text-[13px] text-muted">{order.packetaPointName}</p>
          )}
          {order.shippingStreet ? (
            <>
              <p className="text-[13px] text-muted">{order.shippingName}</p>
              <p className="text-[13px] text-muted">{order.shippingStreet}</p>
              <p className="text-[13px] text-muted">{order.shippingZip} {order.shippingCity}</p>
            </>
          ) : (
            <>
              <p className="text-[13px] text-muted">{order.street}</p>
              <p className="text-[13px] text-muted">{order.zip} {order.city}</p>
            </>
          )}
        </div>
      </div>

      {/* Bank transfer info */}
      {order.paymentMethod === "transfer" && order.paymentStatus !== "PAID" && (
        <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-6 mb-6">
          <h3 className="text-[16px] font-bold text-amber-800 mb-3">Pokyny k platbě převodem</h3>
          <div className="space-y-2 text-[14px]">
            <div className="flex justify-between">
              <span className="text-amber-700">Číslo účtu</span>
              <span className="font-bold text-amber-900">6424423004/5500</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-700">Variabilní symbol</span>
              <span className="font-bold text-amber-900">{order.orderNumber.replace(/\D/g, "")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-700">Částka</span>
              <span className="font-bold text-amber-900">{formatPrice(order.total)}</span>
            </div>
          </div>
          <p className="text-[12px] text-amber-600 mt-3">
            Platbu proveďte prosím do 3 pracovních dnů. Po připsání na účet objednávku potvrdíme.
          </p>
        </div>
      )}

      {/* Payment failed — retry */}
      {paymentFailed && order.paymentMethod === "card" && order.paymentStatus !== "PAID" && (
        <div className="bg-red-50 border border-red-200 rounded-[10px] p-6 mb-6 text-center">
          <p className="text-[14px] text-red-700 mb-3">
            Platbu kartou můžete zkusit znovu nebo zvolte bankovní převod.
          </p>
        </div>
      )}

      {/* Note */}
      {order.note && (
        <div className="bg-white border border-line rounded-[10px] p-5 mb-6">
          <h3 className="text-[13px] font-bold text-muted mb-2 uppercase tracking-wide">Poznámka</h3>
          <p className="text-[14px] text-ink">{order.note}</p>
        </div>
      )}

      {/* CTA */}
      <div className="text-center mt-8">
        <Link
          href="/"
          className="inline-flex h-[44px] items-center px-8 bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] hover:bg-ink transition-colors"
        >
          Pokračovat v nákupu
        </Link>
      </div>
    </div>
  );
}

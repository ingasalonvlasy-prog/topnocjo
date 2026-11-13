"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { CrossSellProducts } from "@/components/CrossSellProducts";
import { ShippingSelector } from "@/components/ShippingSelector";

const FREE_SHIPPING_THRESHOLD = 200000; // 2000 Kč in haléře

function CartSkeleton() {
  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-12">
      <nav className="text-[13px] text-muted mb-6">
        <Link href="/" className="hover:text-navy transition-colors">Domů</Link>
        <span className="mx-1.5 text-line">/</span>
        <span className="text-ink font-medium">Košík</span>
      </nav>
      <div className="animate-pulse space-y-4">
        <div className="h-9 w-48 bg-wash rounded" />
        <div className="h-24 bg-wash rounded-[10px]" />
        <div className="h-24 bg-wash rounded-[10px]" />
      </div>
    </div>
  );
}

export default function CartPage() {
  const { items, itemCount, subtotal, loaded, updateQuantity, removeItem, selectedShipping, shippingPrice } = useCart();

  if (!loaded) {
    return <CartSkeleton />;
  }

  const freeFrom = selectedShipping?.freeFrom || FREE_SHIPPING_THRESHOLD;
  const freeShippingRemaining = Math.max(0, freeFrom - subtotal);
  const freeShippingPercent = Math.min(100, (subtotal / freeFrom) * 100);
  const total = subtotal + shippingPrice;
  const totalSavings = items.reduce((sum, item) => {
    if (item.comparePrice && item.comparePrice > item.price) {
      return sum + (item.comparePrice - item.price) * item.quantity;
    }
    return sum;
  }, 0);

  if (items.length === 0) {
    return (
      <div className="max-w-[var(--container)] mx-auto px-6 py-12">
        <nav className="text-[13px] text-muted mb-6">
          <Link href="/" className="hover:text-navy transition-colors">Domů</Link>
          <span className="mx-1.5 text-line">/</span>
          <span className="text-ink font-medium">Košík</span>
        </nav>

        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-wash flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <h1 className="text-[22px] font-extrabold text-navy mb-2">Košík je prázdný</h1>
          <p className="text-[14px] text-muted mb-6">Zatím tu nic není. Mrkni na novinky.</p>
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

  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      {/* Breadcrumbs */}
      <nav className="text-[13px] text-muted mb-6">
        <Link href="/" className="hover:text-navy transition-colors">Domů</Link>
        <span className="mx-1.5 text-line">/</span>
        <span className="text-ink font-medium">Košík</span>
      </nav>

      <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-8">
        Košík ({itemCount})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* Cart items */}
        <div>
          {/* Free shipping progress */}
          <div className="bg-wash rounded-[10px] p-4 mb-6">
            {freeShippingRemaining > 0 ? (
              <>
                <p className="text-[13px] font-medium text-ink mb-2">
                  Do dopravy zdarma ti chybí <strong className="text-navy">{formatPrice(freeShippingRemaining)}</strong>
                </p>
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  <div
                    className="h-full bg-lime rounded-full transition-all duration-500"
                    style={{ width: `${freeShippingPercent}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-[13px] font-bold text-navy flex items-center gap-2">
                <span className="w-5 h-5 bg-lime rounded-full flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                Doprava zdarma!
              </p>
            )}
          </div>

          {/* Items */}
          <div className="space-y-0 divide-y divide-line">
            {items.map((item) => (
              <div key={item.variantId} className="flex gap-4 py-5">
                {/* Photo */}
                <Link href={`/produkt/${item.productSlug}`} className="shrink-0">
                  <div className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] bg-wash rounded-[8px] overflow-hidden">
                    {item.photo ? (
                      <Image
                        src={item.photo}
                        alt={item.productName}
                        width={100}
                        height={100}
                        className="w-full h-full object-contain p-2"
                        style={{ mixBlendMode: "multiply" }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted text-xs">Foto</div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/produkt/${item.productSlug}`}
                    className="text-[14px] font-bold text-ink hover:text-navy transition-colors line-clamp-1"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-[13px] text-muted mt-0.5">{item.variantTitle}</p>
                  {item.quantity > 1 && (
                    <p className="text-[12px] text-muted mt-0.5">
                      {item.quantity} &times; {formatPrice(item.price)}
                    </p>
                  )}

                  {/* Qty + price */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 gap-2">
                    <div className="flex items-center gap-0 border border-line rounded-[6px] overflow-hidden">
                      <button
                        onClick={() => {
                          if (item.quantity === 1) {
                            removeItem(item.variantId);
                          } else {
                            updateQuantity(item.variantId, item.quantity - 1);
                          }
                        }}
                        className="w-10 h-10 flex items-center justify-center text-ink hover:bg-wash transition-colors"
                        aria-label={item.quantity === 1 ? "Odebrat z košíku" : "Snížit množství"}
                      >
                        {item.quantity === 1 ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sale">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        )}
                      </button>
                      <span className="w-10 h-10 flex items-center justify-center text-[14px] font-bold text-navy border-x border-line">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        aria-label="Zvýšit množství"
                        className="w-10 h-10 flex items-center justify-center text-ink hover:bg-wash transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.comparePrice && item.comparePrice > item.price && (
                        <span className="text-[13px] text-muted line-through">
                          {formatPrice(item.comparePrice * item.quantity)}
                        </span>
                      )}
                      <span className="text-[16px] font-extrabold text-navy">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="w-10 h-10 flex items-center justify-center text-muted hover:text-sale transition-colors"
                        aria-label="Odebrat položku"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Link href="/" className="text-[13px] text-blue hover:underline">
              &larr; Pokračovat v nákupu
            </Link>
          </div>

          {/* Shipping selector — Bretton.cz style cards */}
          <div className="mt-8">
            <ShippingSelector />
          </div>
        </div>

        {/* Summary sidebar */}
        <div>
          <div className="bg-wash rounded-[10px] p-6 sticky top-[100px]">
            <h2 className="text-[18px] font-bold text-navy mb-4">Souhrn objednávky</h2>

            <div className="space-y-2 text-[14px]">
              <div className="flex justify-between">
                <span className="text-muted">Mezisoučet</span>
                <span className="font-medium text-ink">{formatPrice(subtotal)}</span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Ušetříš</span>
                  <span className="font-bold text-sale">&minus;{formatPrice(totalSavings)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">
                  Doprava{selectedShipping ? ` (${selectedShipping.methodName})` : ""}
                </span>
                <span className="font-medium text-ink">
                  {!selectedShipping ? (
                    <span className="text-muted text-[12px]">Vyberte dopravu</span>
                  ) : shippingPrice === 0 ? (
                    <span className="text-navy font-bold">Zdarma</span>
                  ) : (
                    formatPrice(shippingPrice)
                  )}
                </span>
              </div>
            </div>

            <div className="border-t border-line mt-4 pt-4">
              <div className="flex justify-between">
                <span className="text-[16px] font-bold text-navy">Celkem</span>
                <span className="text-[20px] font-extrabold text-navy">{formatPrice(total)}</span>
              </div>
              <p className="text-[12px] text-muted mt-1">vč. DPH</p>
            </div>

            {selectedShipping?.methodType === "pickup_point" && !selectedShipping.pickupPointId ? (
              <button
                type="button"
                disabled
                className="mt-6 w-full h-[48px] bg-lime/50 text-navy/50 text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] flex items-center justify-center cursor-not-allowed"
              >
                Vyber výdejní místo
              </button>
            ) : (
              <Link
                href="/pokladna"
                className="mt-6 w-full h-[48px] bg-lime text-navy text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] flex items-center justify-center hover:brightness-110 transition-all"
              >
                Pokračovat k pokladně
              </Link>
            )}

            <div className="mt-4 space-y-2 text-[12px] text-muted">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Bezpečná platba</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 16l3-8 3.001 8A11.955 11.955 0 0 1 18 20.001 11.955 11.955 0 0 1 14 18"/><path d="M2 16l3-8 3 8c-1.773.927-3.827 1.419-6 1"/>
                  <line x1="12" y1="2" x2="12" y2="10"/>
                </svg>
                <span>Vrácení do 14 dní</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CrossSellProducts />
    </div>
  );
}

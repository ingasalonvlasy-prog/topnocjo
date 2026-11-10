"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";

const FREE_SHIPPING_THRESHOLD = 200000; // 2000 Kč in haléře
const CHEAPEST_SHIPPING = 4900; // 49 Kč

export default function CartPage() {
  const { items, itemCount, subtotal, updateQuantity, removeItem } = useCart();

  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingPercent = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const estimatedShipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : CHEAPEST_SHIPPING;
  const total = subtotal + estimatedShipping;

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
          <p className="text-[14px] text-muted mb-6">Zatím tu nic není. Mrkni, co máme nového.</p>
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
                  <div className="w-[80px] h-[80px] bg-wash rounded-[8px] overflow-hidden">
                    {item.photo ? (
                      <Image
                        src={item.photo}
                        alt={item.productName}
                        width={80}
                        height={80}
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

                  {/* Qty + price — mobile stacked, desktop row */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-0 border border-line rounded-[6px] overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        className="w-10 h-10 flex items-center justify-center text-ink hover:bg-wash transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                      <span className="w-10 h-10 flex items-center justify-center text-[14px] font-bold text-navy border-x border-line">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        className="w-10 h-10 flex items-center justify-center text-ink hover:bg-wash transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[16px] font-extrabold text-navy">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="w-10 h-10 flex items-center justify-center text-muted hover:text-sale transition-colors"
                        aria-label="Odebrat"
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
        </div>

        {/* Summary sidebar */}
        <div>
          <div className="bg-wash rounded-[10px] p-6 sticky top-[80px]">
            <h2 className="text-[18px] font-bold text-navy mb-4">Souhrn objednávky</h2>

            <div className="space-y-2 text-[14px]">
              <div className="flex justify-between">
                <span className="text-muted">Mezisoučet</span>
                <span className="font-medium text-ink">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Doprava</span>
                <span className="font-medium text-ink">
                  {estimatedShipping === 0 ? (
                    <span className="text-navy font-bold">Zdarma</span>
                  ) : (
                    `od ${formatPrice(estimatedShipping)}`
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

            <Link
              href="/pokladna"
              className="mt-6 w-full h-[48px] bg-lime text-navy text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] flex items-center justify-center hover:brightness-110 transition-all"
            >
              Pokračovat k pokladně
            </Link>

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
    </div>
  );
}

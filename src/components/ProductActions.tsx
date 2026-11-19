"use client";

import { useState } from "react";
import { AddToCartButton } from "./AddToCartButton";
import { WishlistButton } from "./WishlistButton";
import { getAvailability } from "@/lib/stock";
import { isValidSize } from "@/lib/filter-options";

interface ProductActionsProps {
  variants: Array<{
    id: string;
    title: string;
    size: string | null;
    price: number;
    comparePrice: number | null;
    ownStock: number;
    supplierStock: number;
  }>;
  product: {
    id: string;
    slug: string;
    name: string;
    photo: string;
  };
}

export function ProductActions({ variants, product }: ProductActionsProps) {
  const firstInStock = variants.find((v) => (v.ownStock + v.supplierStock) > 0);
  const [selectedId, setSelectedId] = useState<string | null>(firstInStock?.id || null);
  const selected = variants.find((v) => v.id === selectedId);

  const hasOwnStock = variants.some((v) => v.ownStock > 0);
  const hasSupplierStock = variants.some((v) => v.supplierStock > 0);

  return (
    <>
      {/* Stock badge — always visible */}
      {(hasOwnStock || hasSupplierStock) ? (
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-[14px] text-green-700 font-semibold">Skladem</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="text-[14px] text-red-600 font-semibold">Vyprodáno</span>
        </div>
      )}

      {/* Size chips — only show when multiple variants with valid sizes */}
      {variants.length > 1 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-bold text-ink">Vyber si velikost</span>
            <a href="/velikosti" target="_blank" className="text-[13px] text-blue font-medium hover:underline">
              Tabulka velikostí
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              // Show size if valid, otherwise show clean title or "UNI"
              const label = v.size && isValidSize(v.size) ? v.size : (v.title && isValidSize(v.title) ? v.title : "UNI");
              return (
                <button
                  key={v.id}
                  onClick={() => (v.ownStock + v.supplierStock) > 0 && setSelectedId(v.id)}
                  className={`min-w-[52px] h-[44px] flex items-center justify-center text-[14px] font-bold rounded-[8px] border transition-all px-3 cursor-pointer ${
                    v.id === selectedId
                      ? "border-navy bg-navy text-white"
                      : (v.ownStock + v.supplierStock) > 0
                        ? "border-line bg-white text-ink hover:border-navy"
                        : "border-line text-muted/40 bg-white cursor-not-allowed"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-variant expedition info */}
      {selected && (() => {
        const avail = getAvailability(selected);
        if (avail === "in_stock" || avail === "on_order") return (
          <p className="text-[13px] text-muted mb-4">Expedice 1–3 pracovní dny</p>
        );
        return null;
      })()}

      {/* CTA row */}
      <div className="flex gap-2 mb-6">
        {selected ? (
          <AddToCartButton variant={selected} product={product} />
        ) : (
          <button
            disabled
            className="flex-1 h-[52px] bg-navy/50 text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] cursor-not-allowed"
          >
            Vyberte velikost
          </button>
        )}
        <WishlistButton productId={product.id} />
      </div>
    </>
  );
}

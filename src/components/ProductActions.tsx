"use client";

import { useState } from "react";
import { AddToCartButton } from "./AddToCartButton";
import { WishlistButton } from "./WishlistButton";
import { getAvailability } from "@/lib/stock";

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

  return (
    <>
      {/* Size chips */}
      {variants.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-bold text-ink">Vyber si velikost (EU)</span>
            <button className="text-[13px] text-blue font-medium hover:underline">
              Tabulka velikostí
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => (v.ownStock + v.supplierStock) > 0 && setSelectedId(v.id)}
                className={`min-w-[52px] h-[44px] flex items-center justify-center text-[14px] font-bold rounded-[8px] border transition-all px-3 cursor-pointer ${
                  v.id === selectedId
                    ? "border-navy bg-navy text-white"
                    : (v.ownStock + v.supplierStock) > 0
                      ? "border-line bg-white text-ink hover:border-navy"
                      : "border-line text-line bg-white cursor-not-allowed line-through"
                }`}
              >
                {v.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Availability info */}
      {selected && (() => {
        const avail = getAvailability(selected);
        if (avail === "in_stock") return (
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[13px] text-green-700 font-medium">Skladem &middot; Expedice 1–3 pracovní dny</span>
          </div>
        );
        if (avail === "on_order") return (
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[13px] text-amber-700 font-medium">Na objednávku &middot; Expedice 3–7 pracovních dnů</span>
          </div>
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

"use client";

import { useCart } from "@/lib/cart";
import { useState } from "react";
import { trackAddToCart } from "@/lib/analytics";

interface AddToCartButtonProps {
  variant: {
    id: string;
    title: string;
    price: number;
    comparePrice: number | null;
    ownStock: number;
    supplierStock: number;
  };
  product: {
    id: string;
    slug: string;
    name: string;
    photo: string;
  };
}

export function AddToCartButton({ variant, product }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      variantId: variant.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      variantTitle: variant.title,
      price: variant.price,
      comparePrice: variant.comparePrice || undefined,
      photo: product.photo,
    });
    trackAddToCart(
      {
        item_id: variant.id,
        item_name: product.name,
        item_variant: variant.title,
        price: variant.price / 100,
        quantity: 1,
      },
      variant.price / 100
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <button
      onClick={handleAdd}
      disabled={(variant.ownStock + variant.supplierStock) === 0}
      className="flex-1 h-[52px] bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {added ? (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Přidáno
        </>
      ) : (
        "Přidat do košíku"
      )}
    </button>
  );
}

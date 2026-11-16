"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/products";
import { useCart } from "@/lib/cart";

interface MobileStickyBarProps {
  price: number;
  discount: number | null;
  productId: string;
  productSlug: string;
  productName: string;
  photo: string;
  variants: {
    id: string;
    title: string;
    price: number;
    comparePrice: number | null;
    ownStock: number;
    supplierStock: number;
  }[];
}

export function MobileStickyBar({
  price,
  discount,
  productId,
  productSlug,
  productName,
  photo,
  variants,
}: MobileStickyBarProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const inStockVariants = variants.filter(v => (v.ownStock + v.supplierStock) > 0);
  const totalStock = variants.reduce((sum, v) => sum + v.ownStock + v.supplierStock, 0);

  if (totalStock === 0) return null;

  function handleAdd() {
    if (inStockVariants.length === 0) return;

    // If only one variant in stock, add directly
    const variant = inStockVariants.length === 1 ? inStockVariants[0] : inStockVariants[0];
    addItem({
      variantId: variant.id,
      productId,
      productSlug,
      productName,
      variantTitle: variant.title,
      price: variant.price,
      comparePrice: variant.comparePrice || undefined,
      photo,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line p-3 flex items-center justify-between md:hidden z-40 safe-area-bottom">
      <div>
        <span className="text-[20px] font-extrabold text-navy">{formatPrice(price)}</span>
        {discount && (
          <span className="text-[12px] text-sale font-bold ml-2">-{discount}%</span>
        )}
      </div>
      <button
        onClick={handleAdd}
        className="h-[44px] px-6 bg-lime text-navy text-[12px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] cursor-pointer"
      >
        {added ? "Pridano!" : "Do kosiku"}
      </button>
    </div>
  );
}

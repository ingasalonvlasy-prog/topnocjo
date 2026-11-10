"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";

const STORAGE_KEY = "qsport_recently_viewed";
const MAX_ITEMS = 10;

interface RecentItem {
  id: string;
  viewedAt: number;
}

export function trackProductView(productId: string) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const items: RecentItem[] = stored ? JSON.parse(stored) : [];
    const filtered = items.filter((i) => i.id !== productId);
    filtered.unshift({ id: productId, viewedAt: Date.now() });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(filtered.slice(0, MAX_ITEMS))
    );
  } catch {
    // localStorage unavailable
  }
}

function getRecentIds(excludeId: string): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const items: RecentItem[] = JSON.parse(stored);
    return items
      .filter((i) => i.id !== excludeId)
      .slice(0, 4)
      .map((i) => i.id);
  } catch {
    return [];
  }
}

interface RecentlyViewedProps {
  currentProductId: string;
}

export function RecentlyViewed({ currentProductId }: RecentlyViewedProps) {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const ids = getRecentIds(currentProductId);
    if (ids.length === 0) return;

    fetch(`/api/products/by-ids?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.products?.length > 0) {
          setProducts(data.products);
        }
      })
      .catch(() => {});
  }, [currentProductId]);

  if (products.length === 0) return null;

  return (
    <section className="max-w-[var(--container)] mx-auto px-6 pb-14">
      <h2 className="text-[20px] font-extrabold text-navy tracking-[-0.02em] mb-5">
        Naposledy prohlížené
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

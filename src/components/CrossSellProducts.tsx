"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";

type Product = Parameters<typeof ProductCard>[0]["product"];

export function CrossSellProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/products/cross-sell")
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => {});
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="mt-12 border-t border-line pt-10">
      <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-navy mb-5">
        Mohlo by se ti hodit
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductCard } from "./ProductCard";
import type { ProductWithVariants } from "@/lib/products";

interface ProductTabsProps {
  description: string | null;
  bodyHtml: string | null;
  brand: string;
  productType: string | null;
  sku: string | null;
  relatedProducts: ProductWithVariants[];
}

export function ProductTabs({ description, bodyHtml, brand, productType, sku, relatedProducts }: ProductTabsProps) {
  const [active, setActive] = useState<"popis" | "parametry" | "related">("popis");

  const tabs = [
    { id: "popis" as const, label: "Popis" },
    { id: "parametry" as const, label: "Parametry" },
    { id: "related" as const, label: "Hodí se k tomu" },
  ];

  return (
    <div className="max-w-[var(--container)] mx-auto px-6 pb-14">
      {/* Tab nav */}
      <div className="flex gap-0 border-b border-line mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-5 py-3 text-[13px] font-bold transition-colors -mb-px ${
              active === tab.id
                ? "text-navy border-b-2 border-navy"
                : "text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {active === "popis" && (
        <div>
          {bodyHtml ? (
            <div
              className="text-[14px] leading-relaxed text-muted max-w-[700px] prose prose-sm"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : (
            <p className="text-[14px] text-muted font-medium">{description}</p>
          )}

          <div className="mt-8 pt-6 border-t border-line max-w-[700px]">
            <dl className="grid grid-cols-[120px_1fr] gap-2 text-[13px]">
              <dt className="text-muted">Značka</dt>
              <dd className="font-bold text-ink">{brand}</dd>
              {productType && (
                <>
                  <dt className="text-muted">Typ</dt>
                  <dd className="font-bold text-ink">{productType}</dd>
                </>
              )}
              {sku && (
                <>
                  <dt className="text-muted">SKU</dt>
                  <dd className="font-bold text-ink">{sku}</dd>
                </>
              )}
            </dl>
          </div>
        </div>
      )}

      {active === "parametry" && (
        <div className="max-w-[700px]">
          <dl className="grid grid-cols-[160px_1fr] gap-y-3 gap-x-4 text-[14px]">
            <dt className="text-muted font-medium">Značka</dt>
            <dd className="font-bold text-ink">{brand}</dd>
            {productType && (
              <>
                <dt className="text-muted font-medium">Typ</dt>
                <dd className="font-bold text-ink">{productType}</dd>
              </>
            )}
            {sku && (
              <>
                <dt className="text-muted font-medium">SKU</dt>
                <dd className="font-bold text-ink">{sku}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      {active === "related" && (
        <div>
          {relatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {relatedProducts.map((product) => (
                <Link key={product.id} href={`/produkt/${product.slug}`}>
                  <ProductCard product={product} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-muted">Zatím žádná doporučení.</p>
          )}
        </div>
      )}
    </div>
  );
}

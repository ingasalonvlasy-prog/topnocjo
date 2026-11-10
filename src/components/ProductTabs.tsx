"use client";

import { useState } from "react";
import { ReviewSection } from "./ReviewSection";

interface ProductTabsProps {
  description: string | null;
  bodyHtml: string | null;
  brand: string;
  productType: string | null;
  sku: string | null;
  variants: { size?: string | null; color?: string | null; weight?: number | null; title: string }[];
  tags: string;
  productId: string;
  reviewCount: number;
}

export function ProductTabs({ description, bodyHtml, brand, productType, sku, variants, tags, productId, reviewCount }: ProductTabsProps) {
  const [active, setActive] = useState<"popis" | "parametry" | "recenze">("popis");

  const tabs = [
    { id: "popis" as const, label: "Popis" },
    { id: "parametry" as const, label: "Parametry" },
    { id: "recenze" as const, label: `Recenze${reviewCount > 0 ? ` (${reviewCount})` : ""}` },
  ];

  // Extract structured data for Parametry tab
  const sizes = [...new Set(variants.filter(v => v.size).map(v => v.size!))];
  const colors = [...new Set(variants.filter(v => v.color).map(v => v.color!))];
  const weight = variants[0]?.weight;
  const tagsList: string[] = JSON.parse(tags || "[]");

  const params: { label: string; value: string }[] = [
    { label: "Značka", value: brand },
  ];
  if (productType) params.push({ label: "Typ", value: productType });
  if (sizes.length > 0) params.push({ label: "Velikosti", value: sizes.join(", ") });
  if (colors.length > 0) params.push({ label: "Barvy", value: colors.join(", ") });
  if (weight) params.push({ label: "Hmotnost", value: `${weight} g` });
  if (sku) params.push({ label: "SKU", value: sku });
  if (tagsList.length > 0) params.push({ label: "Štítky", value: tagsList.join(", ") });

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
              className="text-[14px] leading-relaxed text-ink max-w-[700px]
                [&_h2]:text-[20px] [&_h2]:font-extrabold [&_h2]:text-navy [&_h2]:mt-8 [&_h2]:mb-3
                [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:text-navy [&_h3]:mt-6 [&_h3]:mb-2
                [&_p]:mb-4 [&_p]:text-ink
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1
                [&_li]:text-ink
                [&_a]:text-blue [&_a]:hover:underline
                [&_strong]:font-bold [&_strong]:text-navy
                [&_img]:rounded-[8px] [&_img]:my-4
                [&_table]:w-full [&_table]:text-[13px] [&_table]:border-collapse
                [&_th]:text-left [&_th]:font-bold [&_th]:text-navy [&_th]:py-2 [&_th]:border-b [&_th]:border-line
                [&_td]:py-2 [&_td]:border-b [&_td]:border-line"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : (
            <p className="text-[14px] text-muted font-medium max-w-[700px]">{description}</p>
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
          <div className="rounded-[var(--radius-card)] border border-line overflow-hidden">
            {params.map((param, i) => (
              <div
                key={param.label}
                className={`grid grid-cols-[160px_1fr] gap-x-4 px-4 py-3 text-[14px] ${
                  i % 2 === 0 ? "bg-wash" : "bg-white"
                }`}
              >
                <span className="text-muted font-medium">{param.label}</span>
                <span className="font-bold text-ink">{param.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {active === "recenze" && (
        <div className="max-w-[700px]">
          <ReviewSection productId={productId} />
        </div>
      )}

    </div>
  );
}

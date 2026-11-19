"use client";

import { useState } from "react";
import { sanitizeHtml } from "@/lib/sanitize";
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
  category: string | null;
}

function ParameterGroup({ title, icon, params }: {
  title: string;
  icon: React.ReactNode;
  params: { label: string; value: string }[];
}) {
  if (params.length === 0) return null;

  return (
    <div className="rounded-[10px] border border-line overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-wash border-b border-line">
        <span className="w-6 h-6 text-navy">{icon}</span>
        <h3 className="text-[13px] font-bold text-navy uppercase tracking-[0.06em]">{title}</h3>
      </div>
      {params.map((param, i) => (
        <div
          key={param.label}
          className={`grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-x-4 px-4 py-3 text-[14px] ${
            i % 2 === 0 ? "bg-white" : "bg-wash/50"
          }`}
        >
          <span className="text-muted font-medium">{param.label}</span>
          <span className="font-bold text-ink">{param.value}</span>
        </div>
      ))}
    </div>
  );
}

function ShortDescriptionCard({ bodyHtml }: { bodyHtml: string }) {
  return (
    <div className="flex gap-4 p-5 bg-wash rounded-[10px] max-w-[700px]">
      <span className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy shrink-0">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
      </span>
      <div>
        <h3 className="text-[14px] font-bold text-navy mb-1">O produktu</h3>
        <div
          className="text-[14px] leading-relaxed text-ink [&_p]:mb-0"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyHtml) }}
        />
      </div>
    </div>
  );
}

export function ProductTabs({ description, bodyHtml, brand, productType, sku, variants, tags, productId, reviewCount, category }: ProductTabsProps) {
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

  // Description detection
  const isShortDescription = bodyHtml != null && bodyHtml.length < 300 && !bodyHtml.includes("<h");
  const hasDescription = bodyHtml || description;

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
        <div className="max-w-[700px]">
          {!hasDescription ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-wash flex items-center justify-center text-muted">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
              </div>
              <p className="text-[14px] text-muted">Podrobný popis připravujeme.</p>
            </div>
          ) : bodyHtml ? (
            isShortDescription ? (
              <ShortDescriptionCard bodyHtml={bodyHtml} />
            ) : (
              <div
                className="overflow-hidden text-[14px] leading-relaxed text-ink
                  [&_h2]:text-[20px] [&_h2]:font-extrabold [&_h2]:text-navy [&_h2]:mt-8 [&_h2]:mb-3
                  [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:text-navy [&_h3]:mt-6 [&_h3]:mb-2
                  [&_p]:mb-4 [&_p]:text-ink
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1
                  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1
                  [&_li]:text-ink
                  [&_a]:text-blue [&_a]:hover:underline
                  [&_strong]:font-bold [&_strong]:text-navy
                  [&_img]:rounded-[8px] [&_img]:my-4 [&_img]:max-w-full [&_img]:h-auto
                  [&_table]:block [&_table]:overflow-x-auto [&_table]:text-[13px]
                  [&_th]:text-left [&_th]:font-bold [&_th]:text-navy [&_th]:py-2 [&_th]:border-b [&_th]:border-line
                  [&_td]:py-2 [&_td]:border-b [&_td]:border-line"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyHtml) }}
              />
            )
          ) : (
            <ShortDescriptionCard bodyHtml={`<p>${description}</p>`} />
          )}
        </div>
      )}

      {active === "parametry" && (
        <div className="max-w-[700px] space-y-6">
          {/* Obecné */}
          <ParameterGroup
            title="Obecné"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" /></svg>}
            params={[
              { label: "Značka", value: brand },
              ...(productType ? [{ label: "Typ", value: productType }] : []),
              ...(category ? [{ label: "Kategorie", value: category }] : []),
            ]}
          />

          {/* Velikosti & Varianty */}
          {(sizes.length > 0 || colors.length > 0 || weight) && (
            <ParameterGroup
              title="Velikosti & varianty"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-3L16.5 18m0 0L12 13.5m4.5 4.5V4.5" /></svg>}
              params={[
                ...(sizes.length > 0 ? [{ label: "Velikosti", value: sizes.join(", ") }] : []),
                ...(colors.length > 0 ? [{ label: "Barvy", value: colors.join(", ") }] : []),
                ...(weight ? [{ label: "Hmotnost", value: `${weight} g` }] : []),
              ]}
            />
          )}

          {/* Identifikace */}
          {(sku || tagsList.length > 0) && (
            <ParameterGroup
              title="Identifikace"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" /></svg>}
              params={[
                ...(sku ? [{ label: "SKU", value: sku }] : []),
                ...(tagsList.length > 0 ? [{ label: "Štítky", value: tagsList.join(", ") }] : []),
              ]}
            />
          )}
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

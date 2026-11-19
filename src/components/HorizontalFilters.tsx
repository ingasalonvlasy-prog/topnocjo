"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import type { SizeType } from "@/lib/filter-options";

const priceRanges = [
  { label: "Do 3 000 Kč", min: 0, max: 300000 },
  { label: "3 000 – 5 000 Kč", min: 300000, max: 500000 },
  { label: "Nad 5 000 Kč", min: 500000, max: 99999900 },
];

interface Props {
  brands: { slug: string; name: string; count: number }[];
  sizes: string[];
  sizeType: SizeType | "mixed" | null;
  priceRange: { min: number; max: number };
  showSizeFilter: boolean;
}

type PopoverKey = "price" | "size" | "brand" | null;

export function HorizontalFilters({ brands, sizes, sizeType, showSizeFilter }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openPopover, setOpenPopover] = useState<PopoverKey>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentBrand = searchParams.get("znacka") || "";
  const currentSize = searchParams.get("velikost") || "";
  const currentPriceMin = searchParams.get("cena_od") || "";
  const currentPriceMax = searchParams.get("cena_do") || "";
  const currentInStock = searchParams.get("skladem") === "1";

  // Close popover on click outside
  useEffect(() => {
    if (!openPopover) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openPopover]);

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("strana");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  function handlePriceRange(min: number, max: number) {
    const params = new URLSearchParams(searchParams.toString());
    const isActive = currentPriceMin === String(min) && currentPriceMax === String(max);
    if (isActive) {
      params.delete("cena_od");
      params.delete("cena_do");
    } else {
      params.set("cena_od", String(min));
      params.set("cena_do", String(max));
    }
    params.delete("strana");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpenPopover(null);
  }

  function togglePopover(key: PopoverKey) {
    setOpenPopover((prev) => (prev === key ? null : key));
  }

  const showSize = showSizeFilter && sizeType !== "mixed" && sizeType !== null && sizes.length > 0;
  const hasPrice = !!currentPriceMin;
  const hasBrand = !!currentBrand;
  const hasSize = !!currentSize;

  return (
    <div ref={containerRef} className="flex flex-wrap items-center gap-2 mb-4">
      {/* Price chip */}
      <div className="relative">
        <button
          onClick={() => togglePopover("price")}
          className={`flex items-center gap-1.5 h-[36px] px-4 rounded-full text-[13px] font-bold border transition-colors cursor-pointer ${
            hasPrice
              ? "bg-navy text-white border-navy"
              : "border-line text-ink hover:border-muted"
          }`}
        >
          Cena
          <ChevronDown open={openPopover === "price"} />
        </button>
        {openPopover === "price" && (
          <div className="absolute top-[calc(100%+6px)] left-0 z-20 bg-white border border-line rounded-[10px] shadow-lg p-4 min-w-[200px]">
            <div className="space-y-2">
              {priceRanges.map((range) => {
                const isActive = currentPriceMin === String(range.min) && currentPriceMax === String(range.max);
                return (
                  <button
                    key={range.label}
                    onClick={() => handlePriceRange(range.min, range.max)}
                    className={`block w-full text-left text-[13px] font-medium px-3 py-2 rounded-[6px] transition-colors cursor-pointer ${
                      isActive ? "bg-navy text-white" : "text-ink hover:bg-wash"
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Size chip — only on leaf categories */}
      {showSize && (
        <div className="relative">
          <button
            onClick={() => togglePopover("size")}
            className={`flex items-center gap-1.5 h-[36px] px-4 rounded-full text-[13px] font-bold border transition-colors cursor-pointer ${
              hasSize
                ? "bg-navy text-white border-navy"
                : "border-line text-ink hover:border-muted"
            }`}
          >
            Velikost
            <ChevronDown open={openPopover === "size"} />
          </button>
          {openPopover === "size" && (
            <div className="absolute top-[calc(100%+6px)] left-0 z-20 bg-white border border-line rounded-[10px] shadow-lg p-4 min-w-[220px] max-w-[320px]">
              <div className="flex flex-wrap gap-1.5">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      updateParams("velikost", currentSize === s ? null : s);
                      setOpenPopover(null);
                    }}
                    className={`min-w-[44px] h-[36px] flex items-center justify-center text-[13px] font-bold rounded-[6px] border px-2 transition-all cursor-pointer ${
                      currentSize === s
                        ? "bg-navy border-navy text-white"
                        : "border-line text-ink hover:border-muted"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Brand chip */}
      {brands.length > 1 && (
        <div className="relative">
          <button
            onClick={() => togglePopover("brand")}
            className={`flex items-center gap-1.5 h-[36px] px-4 rounded-full text-[13px] font-bold border transition-colors cursor-pointer ${
              hasBrand
                ? "bg-navy text-white border-navy"
                : "border-line text-ink hover:border-muted"
            }`}
          >
            Značka
            <ChevronDown open={openPopover === "brand"} />
          </button>
          {openPopover === "brand" && (
            <div className="absolute top-[calc(100%+6px)] left-0 z-20 bg-white border border-line rounded-[10px] shadow-lg p-4 min-w-[200px] max-h-[280px] overflow-y-auto">
              <div className="space-y-1">
                {brands.map((b) => (
                  <button
                    key={b.slug}
                    onClick={() => {
                      updateParams("znacka", currentBrand === b.slug ? null : b.slug);
                      setOpenPopover(null);
                    }}
                    className={`flex items-center justify-between w-full text-left text-[13px] font-medium px-3 py-2 rounded-[6px] transition-colors cursor-pointer ${
                      currentBrand === b.slug ? "bg-navy text-white" : "text-ink hover:bg-wash"
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className={`text-[11px] ${currentBrand === b.slug ? "text-white/60" : "text-muted"}`}>{b.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* In stock — direct toggle, no popover */}
      <button
        onClick={() => updateParams("skladem", currentInStock ? null : "1")}
        className={`flex items-center gap-1.5 h-[36px] px-4 rounded-full text-[13px] font-bold border transition-colors cursor-pointer ${
          currentInStock
            ? "bg-navy text-white border-navy"
            : "border-line text-ink hover:border-muted"
        }`}
      >
        Skladem
        {currentInStock && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    </div>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

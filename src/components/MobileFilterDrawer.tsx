"use client";

import { useState } from "react";
import { FilterBar } from "./FilterBar";

interface Props {
  brands: { slug: string; name: string; count: number }[];
  sizes: string[];
  priceRange: { min: number; max: number };
  activeFilterCount: number;
  showSizeFilter?: boolean;
}

export function MobileFilterDrawer({ brands, sizes, priceRange, activeFilterCount, showSizeFilter = true }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-[44px] px-4 border border-line rounded-[var(--radius-field)] text-[13px] font-bold text-ink"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
        </svg>
        Filtry
        {activeFilterCount > 0 && (
          <span className="w-5 h-5 bg-navy text-white text-[11px] font-bold rounded-full flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Overlay + Drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[16px] max-h-[85vh] overflow-y-auto p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold text-navy">Filtry</h3>
              <button
                onClick={() => setOpen(false)}
                className="w-[44px] h-[44px] flex items-center justify-center text-muted hover:text-ink transition-colors -mr-2"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FilterBar brands={brands} sizes={sizes} priceRange={priceRange} showSizeFilter={showSizeFilter} />
            <button
              onClick={() => setOpen(false)}
              className="w-full mt-4 h-[44px] bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.1em] rounded-[var(--radius-pill)]"
            >
              Zobrazit výsledky
            </button>
          </div>
        </>
      )}
    </>
  );
}

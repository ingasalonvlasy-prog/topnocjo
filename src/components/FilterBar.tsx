"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";

interface FilterBarProps {
  brands: { slug: string; name: string; count: number }[];
  sizes: string[];
  priceRange: { min: number; max: number };
}

const priceRanges = [
  { label: "Do 3 000 Kč", min: 0, max: 300000 },
  { label: "3 000 – 5 000 Kč", min: 300000, max: 500000 },
  { label: "Nad 5 000 Kč", min: 500000, max: 99999900 },
];

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Checkbox({ checked, onClick, label, suffix }: { checked: boolean; onClick: () => void; label: string; suffix?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 cursor-pointer group w-full text-left"
    >
      <span
        className={`w-4 h-4 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-all ${
          checked ? "bg-navy border-navy" : "border-line group-hover:border-muted"
        }`}
      >
        {checked && <CheckIcon />}
      </span>
      <span className="text-[13px] text-ink font-medium">{label}</span>
      {suffix}
    </button>
  );
}

function Radio({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 cursor-pointer group w-full text-left"
    >
      <span
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          checked ? "bg-navy border-navy" : "border-line group-hover:border-muted"
        }`}
      >
        {checked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
      </span>
      <span className="text-[13px] text-ink font-medium">{label}</span>
    </button>
  );
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-[14px] font-bold text-ink mb-3"
      >
        {title}
        <span className="text-muted text-[18px] leading-none">{open ? "−" : "+"}</span>
      </button>
      {open && children}
    </div>
  );
}

export function FilterBar({ brands, sizes, priceRange }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const currentBrand = searchParams.get("znacka") || "";
  const currentSize = searchParams.get("velikost") || "";
  const currentSort = searchParams.get("razeni") || "";
  const currentPriceMin = searchParams.get("cena_od") || "";
  const currentPriceMax = searchParams.get("cena_do") || "";
  const currentInStock = searchParams.get("skladem") === "1";

  function resetFilters() {
    router.push(pathname);
  }

  const hasFilters = currentBrand || currentSize || currentSort || currentPriceMin || currentPriceMax || currentInStock;

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
  }

  return (
    <div>
      {/* Brand filter */}
      {brands.length > 1 && (
        <Section title="Značka">
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {brands.map((b) => (
              <Checkbox
                key={b.slug}
                checked={currentBrand === b.slug}
                onClick={() => updateParams("znacka", currentBrand === b.slug ? null : b.slug)}
                label={b.name}
                suffix={<span className="text-[11px] text-muted ml-auto">{b.count}</span>}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Size filter */}
      {sizes.length > 0 && (
        <Section title="Velikost skladem">
          <div className="flex flex-wrap gap-1.5">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => updateParams("velikost", currentSize === s ? null : s)}
                className={`min-w-[44px] h-[36px] flex items-center justify-center text-[13px] font-bold rounded-[6px] border px-2 transition-all ${
                  currentSize === s
                    ? "bg-navy border-navy text-white"
                    : "border-line text-ink hover:border-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* In stock */}
      <Section title="Dostupnost">
        <Checkbox
          checked={currentInStock}
          onClick={() => updateParams("skladem", currentInStock ? null : "1")}
          label="Pouze skladem"
        />
      </Section>

      {/* Price range */}
      <Section title="Cena">
        <div className="space-y-2">
          {priceRanges.map((range) => {
            const isActive = currentPriceMin === String(range.min) && currentPriceMax === String(range.max);
            return (
              <Checkbox
                key={range.label}
                checked={isActive}
                onClick={() => handlePriceRange(range.min, range.max)}
                label={range.label}
              />
            );
          })}
        </div>
      </Section>

      {/* Sort — only show on mobile (desktop has sort in top bar) */}
      <div className="lg:hidden">
        <Section title="Řazení">
          <div className="space-y-2">
            {[
              { value: "", label: "Nejnovější" },
              { value: "price_asc", label: "Nejlevnější" },
              { value: "price_desc", label: "Nejdražší" },
              { value: "name", label: "Název A–Z" },
            ].map((opt) => (
              <Radio
                key={opt.value}
                checked={currentSort === opt.value}
                onClick={() => updateParams("razeni", opt.value || null)}
                label={opt.label}
              />
            ))}
          </div>
        </Section>
      </div>

      {/* Reset */}
      {hasFilters && (
        <button
          onClick={resetFilters}
          className="w-full mt-4 h-9 text-[13px] font-bold text-muted hover:text-sale transition-colors border border-line rounded-[var(--radius-field)] hover:border-sale"
        >
          Resetovat filtry
        </button>
      )}
    </div>
  );
}

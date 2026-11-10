"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Brand {
  slug: string;
  name: string;
}

interface Props {
  brands: Brand[];
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-[28px] px-3 bg-wash text-[12px] font-bold text-ink rounded-full">
      {label}
      <button onClick={onRemove} className="text-muted hover:text-sale transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

export function ActiveFilterChips({ brands }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentBrand = searchParams.get("znacka") || "";
  const currentSize = searchParams.get("velikost") || "";
  const currentPriceMin = searchParams.get("cena_od") || "";
  const currentPriceMax = searchParams.get("cena_do") || "";
  const currentInStock = searchParams.get("skladem") === "1";

  const hasFilters = currentBrand || currentSize || currentPriceMin || currentInStock;
  if (!hasFilters) return null;

  function removeParam(...keys: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    for (const k of keys) params.delete(k);
    params.delete("strana");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {currentBrand && (
        <FilterChip
          label={`Značka: ${brands.find(b => b.slug === currentBrand)?.name || currentBrand}`}
          onRemove={() => removeParam("znacka")}
        />
      )}
      {currentSize && (
        <FilterChip
          label={`Velikost: ${currentSize}`}
          onRemove={() => removeParam("velikost")}
        />
      )}
      {currentPriceMin && (
        <FilterChip
          label={`Cena: ${currentPriceMin}–${currentPriceMax} Kč`}
          onRemove={() => removeParam("cena_od", "cena_do")}
        />
      )}
      {currentInStock && (
        <FilterChip
          label="Pouze skladem"
          onRemove={() => removeParam("skladem")}
        />
      )}
    </div>
  );
}

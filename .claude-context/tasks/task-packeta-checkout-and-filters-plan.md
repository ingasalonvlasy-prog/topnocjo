# Plan: Zásilkovna widget v checkoutu + vylepšení filtrů

**Status:** Ready for implementation  
**Priority:** Medium  
**Date:** 2026-11-08  

---

## Část A: Zásilkovna Widget v checkoutu

### Aktuální stav

- **ZasilkovnaWidget** (`src/components/ZasilkovnaWidget.tsx`) — plně funkční, Packeta Widget v6, `onSelect(point)` callback
- **Checkout** (`src/app/(public)/pokladna/page.tsx`) — client component, shipping method selection existuje, ale widget NENÍ napojený
- **createOrder** (`src/app/(public)/pokladna/actions.ts`) — přijímá `packetaPointId` + `packetaPointName` ale checkout posílá prázdné stringy (`""`)
- **Order model** — `packetaPointId` a `packetaPointName` pole existují
- **Zásilkovna API klíč** — uložený v ShippingMethod.config JSON (`{ apiKey: "..." }`)
- **ShippingMethod** — `type` pole: `"address"` | `"pickup_point"` | `"personal"`

### Co chybí

1. Checkout nezobrazuje widget když je vybraná Zásilkovna
2. Vybraný pickup point se nepředává do `createOrder()`
3. Validace: nelze odeslat objednávku se Zásilkovnou bez vybraného bodu
4. API klíč se musí dostat z DB (server) do klienta (checkout page)

### Implementační plán

#### A1. API endpoint pro Zásilkovna config

Vytvořit `src/app/api/shipping/route.ts` úpravu — přidat apiKey do response pro pickup_point methods:

```typescript
// Stávající /api/shipping vrací ShippingOption[]
// Rozšířit interface o:
interface ShippingOption {
  // ... existing fields ...
  type: string;              // "address" | "pickup_point" | "personal"
  packetaApiKey?: string;    // jen pro type="pickup_point"
}

// V GET handleru:
const methods = await prisma.shippingMethod.findMany({
  where: { active: true },
  orderBy: { position: "asc" },
});

return methods.map(m => ({
  ...m,
  packetaApiKey: m.type === "pickup_point" ? getApiKeyFromConfig(m.config) : undefined,
}));
```

#### A2. Checkout state rozšíření

V `src/app/(public)/pokladna/page.tsx` přidat:

```typescript
import { ZasilkovnaWidget, PacketaPoint } from "@/components/ZasilkovnaWidget";

// Nový state
const [selectedPoint, setSelectedPoint] = useState<PacketaPoint | null>(null);

// Rozšířit ShippingOption type
interface ShippingOption {
  // ... existing ...
  type: string;
  packetaApiKey?: string;
}
```

#### A3. Widget integrace do shipping sekce

V sekci "3. Doprava" — pod vybranou Zásilkovna metodu přidat widget:

```typescript
// Po shipping method radio buttons:
{selectedMethod?.type === "pickup_point" && selectedMethod.packetaApiKey && (
  <div className="mt-4 pl-8">
    <ZasilkovnaWidget
      apiKey={selectedMethod.packetaApiKey}
      onSelect={(point) => setSelectedPoint(point)}
      selectedPoint={selectedPoint}
    />
  </div>
)}
```

#### A4. Předání do createOrder

Aktualizovat `handleSubmit`:

```typescript
await createOrder({
  // ... existing ...
  packetaPointId: selectedPoint?.id ? String(selectedPoint.id) : "",
  packetaPointName: selectedPoint
    ? `${selectedPoint.name}, ${selectedPoint.nameStreet}, ${selectedPoint.city}`
    : "",
  // ...
});
```

#### A5. Validace před odesláním

```typescript
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  // Validace: Zásilkovna vyžaduje vybraný bod
  if (selectedMethod?.type === "pickup_point" && !selectedPoint) {
    setError("Vyberte výdejní místo pro Zásilkovnu.");
    return;
  }

  // ... rest of submit logic
}
```

#### A6. Reset pickup point při změně dopravy

```typescript
function handleShippingChange(methodId: string) {
  setSelectedShipping(methodId);
  // Reset point pokud nová metoda není pickup_point
  const method = shipping.find(s => s.id === methodId);
  if (method?.type !== "pickup_point") {
    setSelectedPoint(null);
  }
}
```

#### A7. Dotčené soubory

| Soubor | Akce |
|---|---|
| `src/app/api/shipping/route.ts` | **UPRAVIT** — přidat `type` + `packetaApiKey` do response |
| `src/app/(public)/pokladna/page.tsx` | **UPRAVIT** — přidat widget, state, validaci, reset |

**Žádné schema změny** — `packetaPointId` a `packetaPointName` už existují v Order modelu.

---

## Část B: Vylepšení product filtrů na kategorii

### Aktuální stav — JIŽ EXISTUJE

Filtry jsou **už implementované** a funkční:

- **FilterBar** (`src/components/FilterBar.tsx`) — client component s:
  - Značka (checkboxy s počty)
  - Velikost (chip buttons)
  - Dostupnost ("Pouze skladem" checkbox)
  - Cena (range checkboxy: do 2k, 2-5k, 5-10k, 10k+)
  - Řazení (mobile only: radio buttons)
  - Reset filtrů tlačítko
- **filter-options.ts** (`src/lib/filter-options.ts`) — `getFilterOptions(categoryId)` vrací brands (s počty), sizes, priceRange
- **Category page** (`src/app/(public)/kategorie/[slug]/page.tsx`) — sidebar layout na desktop (220px), inline na mobile
- **URL params**: `?znacka=`, `?velikost=`, `?cena_od=`, `?cena_do=`, `?skladem=1`, `?razeni=`, `?strana=`
- **getFilteredProducts** (`src/lib/products.ts`) — Prisma where filtrace funguje

### Co lze vylepšit

Filtry fungují, ale existuje pár UX vylepšení:

#### B1. Mobilní filtry jako drawer (místo inline)

**Aktuálně:** Na mobilu se FilterBar zobrazí inline nad produkty — zabírá hodně místa.

**Nově:** Tlačítko "Filtry" + drawer/bottom sheet:

```typescript
// Nový soubor: src/components/MobileFilterDrawer.tsx

"use client";

import { useState } from "react";
import { FilterBar } from "./FilterBar";

interface Props {
  brands: { slug: string; name: string; count: number }[];
  sizes: string[];
  priceRange: { min: number; max: number };
  activeFilterCount: number;
}

export function MobileFilterDrawer({ brands, sizes, priceRange, activeFilterCount }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-[40px] px-4 border border-line rounded-[var(--radius-field)] text-[13px] font-bold text-ink"
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
                className="text-muted hover:text-ink transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FilterBar brands={brands} sizes={sizes} priceRange={priceRange} />
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
```

CSS animation přidat do globals:
```css
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
```

#### B2. Sort dropdown na desktopu (klikatelný)

**Aktuálně:** Sort label je statický text ("Řadit: Nejprodávanější ▼") — neklikatelný.

**Nově:** Klikatelný dropdown:

```typescript
// Nový soubor: src/components/SortDropdown.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const sortOptions = [
  { value: "", label: "Nejnovější" },
  { value: "price_asc", label: "Nejlevnější" },
  { value: "price_desc", label: "Nejdražší" },
  { value: "name", label: "Název A–Z" },
];

export function SortDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("razeni") || "";

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  function handleSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("razeni", value);
    else params.delete("razeni");
    params.delete("strana");
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  const currentLabel = sortOptions.find(o => o.value === current)?.label || "Nejnovější";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-[13px] text-muted hover:text-ink transition-colors cursor-pointer"
      >
        Řadit: <span className="font-bold text-ink">{currentLabel}</span>
        <span className="ml-1">&#9660;</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-line rounded-[8px] shadow-lg py-1 z-20 min-w-[160px]">
          {sortOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleSort(opt.value)}
              className={`w-full text-left px-4 py-2 text-[13px] hover:bg-wash transition-colors ${
                current === opt.value ? "font-bold text-navy" : "text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### B3. Active filter chips (nad produkty)

Zobrazit aktivní filtry jako removable chips:

```typescript
// V kategorie page, nad product grid:
{hasActiveFilters && (
  <div className="flex flex-wrap gap-2 mb-4">
    {currentBrand && (
      <FilterChip
        label={`Značka: ${brands.find(b => b.slug === currentBrand)?.name}`}
        onRemove={() => updateParams("znacka", null)}
      />
    )}
    {currentSize && (
      <FilterChip label={`Velikost: ${currentSize}`} onRemove={() => updateParams("velikost", null)} />
    )}
    {currentPriceMin && (
      <FilterChip
        label={`Cena: ${currentPriceMin}–${currentPriceMax} Kč`}
        onRemove={() => { updateParams("cena_od", null); updateParams("cena_do", null); }}
      />
    )}
    {currentInStock && (
      <FilterChip label="Pouze skladem" onRemove={() => updateParams("skladem", null)} />
    )}
  </div>
)}

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
```

#### B4. Dotčené soubory

| Soubor | Akce |
|---|---|
| `src/components/MobileFilterDrawer.tsx` | **NOVÝ** — bottom sheet drawer pro mobilní filtry |
| `src/components/SortDropdown.tsx` | **NOVÝ** — klikatelný sort dropdown |
| `src/app/(public)/kategorie/[slug]/page.tsx` | **UPRAVIT** — nahradit inline mobile FilterBar za MobileFilterDrawer, nahradit sort label za SortDropdown, přidat active filter chips |
| `src/app/globals.css` | **UPRAVIT** — přidat `animate-slide-up` keyframes |

**FilterBar samotný se NEMĚNÍ** — funguje správně, jen ho obalíme drawer wrapperem na mobilu.

---

## Pořadí implementace

| # | Fáze | Složitost | Priorita |
|---|------|-----------|----------|
| A1-A2 | Zásilkovna API key v shipping response | Nízká | Vysoká |
| A3-A6 | Widget integrace v checkoutu | Střední | Vysoká |
| B1 | Mobilní filter drawer | Střední | Střední |
| B2 | Sort dropdown | Nízká | Nízká |
| B3 | Active filter chips | Nízká | Nízká |

**Část A (Zásilkovna)** je důležitější — bez ní checkout nefunguje správně pro Zásilkovnu.  
**Část B (filtry)** jsou UX vylepšení existující funkcionality.

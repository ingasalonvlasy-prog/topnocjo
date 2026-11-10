# P4-P7: FilterBar prepsat na sidebar checkboxy — Implementation Plan

**Task ID:** #4
**Status:** Ready for implementation
**Files:** `src/components/FilterBar.tsx` (rewrite), `src/app/(public)/kategorie/[slug]/page.tsx` (layout tweak)

---

## Problem

Current FilterBar uses horizontal dropdown selects in a bordered card. The mockup (web-kategorie.png) shows a vertical sidebar with collapsible checkbox sections.

## Mockup Design (web-kategorie.png)

Left sidebar (~220px) with these sections:

```
Znacka                    -
[x] On
[ ] POC
[ ] Mizuno
[ ] Leki

Velikost skladem          -
[ ] 42
[x] 43
[x] 44
[ ] 45

Pohlavi                   -
[x] Panske
[ ] Damske

Cena                      -
[ ] do 3 000 Kc
[x] 3 000-5 000 Kc
[ ] nad 5 000 Kc
```

Each section:
- Title (14px bold) + collapse toggle "-" / "+"
- Collapsible content: checkboxes (navy filled square = checked)
- Separated by bottom border

## Current FilterBar Analysis

`src/components/FilterBar.tsx`:
- Uses `useRouter` + `useSearchParams` for URL-based filtering
- Single-value params: `znacka`, `velikost`, `razeni`, `cena_od`, `cena_do`, `skladem`
- `<select>` dropdowns for brand and size
- Number inputs for price range
- Checkbox for "Skladem" only
- Wrapped in bordered card

**Key constraint:** Current URL params support single values only. Mockup checkboxes imply multi-select. For simplicity, implement visual checkbox UI but keep single-select behavior initially (clicking a checked checkbox deselects, clicking another selects that one).

Actually, looking more carefully at the mockup — multiple checkboxes are checked (e.g., sizes 43 AND 44), suggesting true multi-select. This needs comma-separated URL params.

## Multi-Select URL Params

Change from:
```
?znacka=on&velikost=43
```
To:
```
?znacka=on,poc&velikost=43,44
```

This requires changes in:
1. `FilterBar.tsx` — UI + param handling
2. `kategorie/[slug]/page.tsx` — parse multi-value params
3. `lib/products.ts` — filter by multiple brands/sizes (use `in` operator)

## Implementation Steps

### Step 1: Update `lib/products.ts` — Support multi-value filters

**Change `GetProductsParams`:**
```typescript
export interface GetProductsParams {
  categoryId?: string;
  brandSlugs?: string[];    // was brandSlug (single)
  sizes?: string[];          // was size (single)
  priceMin?: number;
  priceMax?: number;
  search?: string;
  sort?: "price_asc" | "price_desc" | "name" | "newest";
  page?: number;
  perPage?: number;
  inStock?: boolean;
}
```

**Change `getFilteredProducts`:**
```typescript
// Brand filter
if (brandSlugs && brandSlugs.length > 0) {
  where.brand = { slug: { in: brandSlugs } };
}

// Size filter
if (sizes && sizes.length > 0) {
  where.variants = { some: { size: { in: sizes }, active: true } };
}
```

**Backward compatibility:** Also keep single `brandSlug` / `size` support, or update all callers (kategorie page + hledat page).

### Step 2: Update `kategorie/[slug]/page.tsx` — Parse multi-value params

```typescript
// Parse comma-separated params
const brandSlugs = sp.znacka ? (sp.znacka as string).split(",").filter(Boolean) : undefined;
const sizes = sp.velikost ? (sp.velikost as string).split(",").filter(Boolean) : undefined;

// Price ranges from checkbox (predefined ranges)
// "do3000" = max 3000, "3000-5000" = min 3000 max 5000, "nad5000" = min 5000
const priceRange = sp.cena as string | undefined;
let priceMin: number | undefined;
let priceMax: number | undefined;
if (priceRange === "do3000") priceMax = 3000;
else if (priceRange === "3000-5000") { priceMin = 3000; priceMax = 5000; }
else if (priceRange === "nad5000") priceMin = 5000;
// Also support custom cena_od/cena_do for direct input
if (!priceRange) {
  priceMin = sp.cena_od ? Number(sp.cena_od) : undefined;
  priceMax = sp.cena_do ? Number(sp.cena_do) : undefined;
}
```

### Step 3: Rewrite `src/components/FilterBar.tsx`

Complete rewrite to vertical sidebar with collapsible sections.

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";

interface FilterBarProps {
  brands: { slug: string; name: string; count: number }[];
  sizes: string[];
  priceRange: { min: number; max: number };
}

// Collapsible section component
function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-line pb-4 mb-4 last:border-0 last:mb-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left mb-3"
      >
        <span className="text-[14px] font-bold text-ink">{title}</span>
        <span className="text-[16px] text-muted leading-none">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="space-y-2.5">{children}</div>}
    </div>
  );
}

export function FilterBar({ brands, sizes, priceRange }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current multi-value params
  const currentBrands = (searchParams.get("znacka") || "").split(",").filter(Boolean);
  const currentSizes = (searchParams.get("velikost") || "").split(",").filter(Boolean);
  const currentPrice = searchParams.get("cena") || "";

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("strana"); // reset pagination
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  // Toggle a value in a comma-separated param
  function toggleMulti(key: string, value: string, currentValues: string[]) {
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    updateParams(key, newValues.length > 0 ? newValues.join(",") : null);
  }

  // Checkbox component
  function Checkbox({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: () => void;
    label: string;
  }) {
    return (
      <label className="flex items-center gap-2.5 cursor-pointer group">
        <span
          className={`w-[18px] h-[18px] rounded-[3px] border flex items-center justify-center transition-colors ${
            checked
              ? "bg-navy border-navy"
              : "border-line bg-white group-hover:border-muted"
          }`}
        >
          {checked && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      </label>
    );
  }

  const priceRanges = [
    { value: "do3000", label: "do 3 000 Kc" },
    { value: "3000-5000", label: "3 000–5 000 Kc" },
    { value: "nad5000", label: "nad 5 000 Kc" },
  ];

  return (
    <div>
      {/* Znacka */}
      {brands.length > 1 && (
        <FilterSection title="Znacka">
          {brands.map((b) => (
            <Checkbox
              key={b.slug}
              checked={currentBrands.includes(b.slug)}
              onChange={() => toggleMulti("znacka", b.slug, currentBrands)}
              label={b.name}
            />
          ))}
        </FilterSection>
      )}

      {/* Velikost skladem */}
      {sizes.length > 0 && (
        <FilterSection title="Velikost skladem">
          {sizes.map((s) => (
            <Checkbox
              key={s}
              checked={currentSizes.includes(s)}
              onChange={() => toggleMulti("velikost", s, currentSizes)}
              label={s}
            />
          ))}
        </FilterSection>
      )}

      {/* Cena */}
      <FilterSection title="Cena">
        {priceRanges.map((range) => (
          <Checkbox
            key={range.value}
            checked={currentPrice === range.value}
            onChange={() => updateParams("cena", currentPrice === range.value ? null : range.value)}
            label={range.label}
          />
        ))}
      </FilterSection>
    </div>
  );
}
```

**Notes:**
- No wrapper card border (mockup shows bare sections against white bg)
- "Pohlavi" (gender) section is in the mockup but NOT in the current data model. Products don't have a gender field. **SKIP for now** — would need a `gender` field on Product or a tag-based approach. Add when data supports it.
- Price uses predefined ranges (checkbox) instead of number inputs (matches mockup)
- Multi-select for brands and sizes using comma-separated URL params

### Step 4: Update category page layout

The category page `kategorie/[slug]/page.tsx` already has the sidebar layout:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
  <aside className="hidden lg:block">
    <FilterBar ... />
  </aside>
```

This is correct. No layout change needed.

But update the FilterBar usage for mobile — on mobile, mockup doesn't show filters at all (they're in the sidebar which is hidden). Could add a "Filtry" button that opens a drawer/sheet. For MVP, keep the mobile FilterBar as-is (collapsed accordion style).

### Step 5: Update `hledat/page.tsx` to use new param format

The search page also uses FilterBar. Update it similarly to parse multi-value params:

```typescript
const brandSlugs = sp.znacka ? (sp.znacka as string).split(",").filter(Boolean) : undefined;
const sizes = sp.velikost ? (sp.velikost as string).split(",").filter(Boolean) : undefined;
```

## File Changes Summary

| File | Change |
|------|--------|
| `src/components/FilterBar.tsx` | **Full rewrite** — checkbox sidebar with collapsible sections |
| `src/lib/products.ts` | Update `GetProductsParams` and `getFilteredProducts` for multi-value brand/size |
| `src/app/(public)/kategorie/[slug]/page.tsx` | Parse comma-separated params, new price range param |
| `src/app/(public)/hledat/page.tsx` | Same param parsing updates |

## Testing Checklist

- [ ] Brand checkboxes: clicking selects/deselects, URL updates with comma-separated values
- [ ] Size checkboxes: same multi-select behavior
- [ ] Price range checkboxes: single-select (clicking another deselects previous)
- [ ] Collapsible sections: clicking "-" collapses, "+" expands
- [ ] Checked checkbox shows navy filled square with white checkmark
- [ ] Products filter correctly with multi-select
- [ ] Pagination resets when filter changes
- [ ] Desktop: sidebar on left, product grid on right
- [ ] Mobile: filters shown in accordion style (or hidden behind button)
- [ ] Search page still works with updated params
- [ ] No card border around filter sidebar
- [ ] Build passes

## Estimated Effort

~60 minutes (FilterBar rewrite + products.ts multi-select + param parsing updates)

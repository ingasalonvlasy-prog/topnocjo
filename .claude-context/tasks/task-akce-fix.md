# Fix: Stránka /akce — mixed sizes ve filtrech (BUG-05)

**Status:** Plan ready for implementation
**Priority:** Střední
**Effort:** 5 minut

---

## PROBLÉM

**Soubor:** `src/app/(public)/akce/page.tsx:50`
```ts
getFilterOptions(undefined, { saleOnly: true })
```

Stránka `/akce` zobrazuje slevové produkty ze VŠECH kategorií. `getFilterOptions` vrací velikosti ze všech slevových produktů — směs obuvi (36-47), oblečení (S-XXL), dětských výšek (80-176).

`sizeType` je v response (`filterOptions.sizeType`) ale stránka ho ignoruje — předává `sizes` do FilterBar/MobileFilterDrawer bez kontroly jestli jsou mixed.

## ANALÝZA

`getFilterOptions()` již vrací `sizeType: "mixed" | SizeType | null`:
- Když jsou velikosti z různých kategorií → `sizeType = "mixed"`
- FilterBar již podporuje `showSizeFilter` prop (default `true`)
- MobileFilterDrawer již podporuje `showSizeFilter` prop (default `true`)

Stránka `/akce` ale nepředává `showSizeFilter` do FilterBar ani MobileFilterDrawer.

## FIX

### Krok 1: Přidat `showSizeFilter` prop na základě `sizeType`

**Soubor:** `src/app/(public)/akce/page.tsx`

Přidat logic pro `showSizeFilter`:

```ts
// Po řádku 51 (po Promise.all):
const showSizeFilter = filterOptions.sizeType !== null && filterOptions.sizeType !== "mixed";
```

### Krok 2: Předat do FilterBar (desktop sidebar)

**Soubor:** `src/app/(public)/akce/page.tsx:99-103`

```tsx
// PŘED:
<FilterBar
  brands={filterOptions.brands}
  sizes={filterOptions.sizes}
  priceRange={filterOptions.priceRange}
/>

// PO:
<FilterBar
  brands={filterOptions.brands}
  sizes={filterOptions.sizes}
  priceRange={filterOptions.priceRange}
  showSizeFilter={showSizeFilter}
/>
```

### Krok 3: Předat do MobileFilterDrawer

**Soubor:** `src/app/(public)/akce/page.tsx:113-118`

```tsx
// PŘED:
<MobileFilterDrawer
  brands={filterOptions.brands}
  sizes={filterOptions.sizes}
  priceRange={filterOptions.priceRange}
  activeFilterCount={activeFilterCount}
/>

// PO:
<MobileFilterDrawer
  brands={filterOptions.brands}
  sizes={filterOptions.sizes}
  priceRange={filterOptions.priceRange}
  activeFilterCount={activeFilterCount}
  showSizeFilter={showSizeFilter}
/>
```

## HOTOVO

Žádné změny v `filter-options.ts` — `classifySizeType` a `sizeType` return už existují.
Žádné změny v `FilterBar.tsx` — `showSizeFilter` prop už existuje.
Žádné změny v `MobileFilterDrawer.tsx` — `showSizeFilter` prop už existuje.

**Pouze 3 změny v jednom souboru** (`akce/page.tsx`):
1. Přidat `const showSizeFilter = ...` (1 řádek)
2. Přidat `showSizeFilter={showSizeFilter}` do FilterBar (1 řádek)
3. Přidat `showSizeFilter={showSizeFilter}` do MobileFilterDrawer (1 řádek)

## POZNÁMKA

Stejný fix by měl být aplikován i na:
- `/hledat` (`src/app/(public)/hledat/page.tsx`) — stejný problém, `getFilterOptions()` bez scope
- `/znacky/[slug]` (`src/app/(public)/znacky/[slug]/page.tsx`) — `getFilterOptions()` bez parametrů

Tyto jsou ale v samostatných plánech (Task #4 pro hledat, Task #7 pro značky).

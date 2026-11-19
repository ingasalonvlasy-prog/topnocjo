# TASK #1: Kategorie strana — AboutYou logika filtru a navigace

**Status:** Plan ready for implementation
**Priority:** Critical — user is frustrated with mixed shoe/clothing sizes

---

## ROOT CAUSE ANALYSIS

### Problem 1: Mixed sizes on parent categories (Zeny/Muzi/Deti)
**File:** `src/app/(public)/kategorie/[slug]/page.tsx:78`
```ts
getFilterOptions(isParent ? undefined : category.id),
```
When viewing a parent category (e.g. "Zeny"), `isParent` is `true`, so `categoryId` is `undefined`.
In `src/lib/filter-options.ts:57-58`, when `categoryId` is undefined, there's no category filter at all — it fetches sizes for ALL products across the entire shop. This means shoe sizes (22, 23, 36...) and clothing sizes (3XL, 4XL, S, M, L) appear TOGETHER.

**Fix:** Pass the array of child category IDs to `getFilterOptions` so it at least scopes to the gender. But even then, a gender category spans both clothing and footwear, so sizes will still mix.

**Real fix:** On parent categories, do NOT show size filter at all. Sizes only make sense on leaf categories where products are homogeneous (all shoes OR all clothing).

### Problem 2: Sidebar is filter, should be category navigation
Current layout: left sidebar = FilterBar (brands, sizes, price checkboxes).
AboutYou pattern: left sidebar = category TREE navigation, filters = horizontal dropdown chips ABOVE products.

### Problem 3: Parent category shows useless size filter
Even with correct data, showing "Size" filter on "Zeny" page is meaningless because:
- Clothing uses S/M/L/XL/XXL
- Shoes use 36/37/38/39/40
- Kids use 86/92/98/110/122
These are incompatible systems. User sees "22, 23, 24, S, M, L, 3XL" — garbage.

---

## DESIGN DECISIONS (AboutYou pattern)

### Desktop layout change:
```
BEFORE:
[Sidebar: FilterBar]  [Product Grid]

AFTER:
[Sidebar: CategoryNav] [Horizontal Filter Chips + Product Grid]
```

### Sidebar = Category Tree Navigation
- Shows subcategories of the current parent category
- Collapsible tree: Parent > Children
- Active category highlighted
- Same data already loaded in `category.children` and `category.parent.children`

### Horizontal Filter Chips = Actual Filters
- Row of dropdown buttons above products: `Cena ▾`, `Velikost ▾`, `Znacka ▾`, `Skladem`
- Each dropdown opens a small popover with options
- **SIZE FILTER**: only shown on LEAF categories (not parent)
- **SIZE TYPE DETECTION**: use existing `isValidSize()` logic + new `classifySizeType()`:
  - Numeric 16-52 = shoe size
  - Numeric 80-176 = kids body height
  - Text S/M/L/XL = clothing size

### Mobile:
- Sidebar navigation = horizontal scrolling chips in hero banner (ALREADY DONE on line 136-162)
- Filters = "Filtry" button opens bottom drawer (ALREADY DONE via MobileFilterDrawer)
- MobileFilterDrawer needs same logic: hide size on parent, show horizontal chips

---

## IMPLEMENTATION PLAN

### Step 1: Create `classifySizeType()` in `filter-options.ts`

**File:** `src/lib/filter-options.ts`

Add a function that classifies sizes into groups so they can be displayed separately and hidden when mixed:

```ts
export type SizeType = "shoe" | "clothing" | "kids_height" | "unknown";

export function classifySizeType(size: string): SizeType {
  const s = size.trim();
  const upper = s.toUpperCase().replace(/\s+/g, " ").trim();

  // Standard clothing sizes
  if (CLOTHING_SIZES.has(upper)) return "clothing";
  if (COMPOSITE_RE.test(s)) return "clothing";

  // Numeric sizes
  const num = parseFloat(s.replace(",", "."));
  if (!isNaN(num) && /^\d{2,3}([.,]\d)?$/.test(s)) {
    if (num >= 16 && num <= 52) return "shoe";
    if (num >= 80 && num <= 176) return "kids_height";
  }

  return "unknown";
}
```

### Step 2: Update `getFilterOptions()` to accept multiple category IDs and return classified sizes

**File:** `src/lib/filter-options.ts`

Change signature:
```ts
export interface FilterOptions {
  brands: { slug: string; name: string; count: number }[];
  sizes: string[];
  sizeType: SizeType | "mixed" | null;  // NEW: null = don't show size filter
  priceRange: { min: number; max: number };
}

export async function getFilterOptions(
  categoryId?: string | string[],  // accept array
  opts?: { saleOnly?: boolean }
): Promise<FilterOptions>
```

Logic changes:
- When `categoryId` is an array, use `{ in: categoryId }` in Prisma query
- After collecting sizes, classify them:
  - If ALL sizes are same type -> `sizeType = that type`
  - If sizes are MIXED types -> `sizeType = "mixed"` (UI should NOT show size filter)
  - If no sizes -> `sizeType = null`

### Step 3: Update category page to pass child IDs to `getFilterOptions`

**File:** `src/app/(public)/kategorie/[slug]/page.tsx:78`

Change:
```ts
// BEFORE:
getFilterOptions(isParent ? undefined : category.id),

// AFTER:
getFilterOptions(
  isParent
    ? [category.id, ...category.children.map((c) => c.id)]
    : category.id
),
```

This scopes the filter options to products within the gender, not the entire shop. The `sizeType` classification will then determine if sizes should be shown.

### Step 4: Create `CategorySidebar` component

**New file:** `src/components/CategorySidebar.tsx`

This replaces the FilterBar in the sidebar position. It's a category tree navigation.

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  children?: { id: string; name: string; slug: string }[];
}

interface Props {
  currentSlug: string;
  parentCategory: CategoryNode;
  childCategories: CategoryNode[];
}

export function CategorySidebar({ currentSlug, parentCategory, childCategories }: Props) {
  return (
    <nav>
      {/* Parent category link */}
      <Link
        href={`/kategorie/${parentCategory.slug}`}
        className={`block text-[14px] font-bold mb-3 ${
          currentSlug === parentCategory.slug ? "text-navy" : "text-ink hover:text-navy"
        }`}
      >
        {parentCategory.name}
      </Link>

      {/* Child categories */}
      <ul className="space-y-1.5 border-l-2 border-line pl-4">
        {childCategories.map((cat) => (
          <li key={cat.id}>
            <Link
              href={`/kategorie/${cat.slug}`}
              className={`block text-[13px] py-1 transition-colors ${
                currentSlug === cat.slug
                  ? "text-navy font-bold border-l-2 border-navy -ml-[18px] pl-[16px]"
                  : "text-muted hover:text-ink font-medium"
              }`}
            >
              {cat.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

Data source: Already available in category page query — `category.parent`, `category.children`, `category.parent.children`.

### Step 5: Create `HorizontalFilters` component

**New file:** `src/components/HorizontalFilters.tsx`

Horizontal row of filter dropdown chips above the product grid. Replaces FilterBar's role.

```tsx
"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

interface Props {
  brands: { slug: string; name: string; count: number }[];
  sizes: string[];
  sizeType: "shoe" | "clothing" | "kids_height" | "mixed" | null;
  priceRange: { min: number; max: number };
  showSizeFilter: boolean;  // false for parent categories
}
```

Filter chips layout:
```
[Cena ▾]  [Velikost ▾]  [Znacka ▾]  [Skladem]
```

Each chip:
- Default state: `border border-line rounded-full px-4 h-[36px] text-[13px] font-bold text-ink`
- Active (has filter): `bg-navy text-white border-navy`
- Click opens a dropdown popover below the chip

Popover contents:
- **Cena**: Price range checkboxes (do 3000, 3000-5000, nad 5000)
- **Velikost**: Size buttons grid (only shown when `showSizeFilter = true` AND `sizeType !== "mixed"`)
- **Znacka**: Brand checkboxes with counts
- **Skladem**: Toggle (no popover, just toggles directly)

Close popover: click outside or select an option.

### Step 6: Update category page layout

**File:** `src/app/(public)/kategorie/[slug]/page.tsx`

Change the grid layout:

```tsx
// BEFORE:
<div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
  <aside className="hidden lg:block">
    <FilterBar brands={...} sizes={...} priceRange={...} />
  </aside>
  <div>
    {/* Top bar + filters + products */}
  </div>
</div>

// AFTER:
<div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
  {/* Sidebar: Category tree navigation (desktop only) */}
  <aside className="hidden lg:block">
    <CategorySidebar
      currentSlug={slug}
      parentCategory={parentCat}
      childCategories={childCats}
    />
  </aside>

  <div>
    {/* Horizontal filter chips */}
    <HorizontalFilters
      brands={filterOptions.brands}
      sizes={filterOptions.sizes}
      sizeType={filterOptions.sizeType}
      priceRange={filterOptions.priceRange}
      showSizeFilter={!isParent}
    />

    {/* Active filter chips (already exists) */}
    <ActiveFilterChips brands={filterOptions.brands} />

    {/* Top bar: count + sort */}
    <div className="flex items-center justify-between mb-5">
      ...
    </div>

    {/* Product grid */}
    ...
  </div>
</div>
```

Logic for sidebar data:
```ts
// Determine parent and children for sidebar
const parentCat = category.parent
  ? { id: category.parent.id, name: category.parent.name, slug: category.parent.slug }
  : { id: category.id, name: category.name, slug: category.slug };

const childCats = category.parent
  ? category.parent.children  // sibling categories
  : category.children;         // child categories
```

If category has no parent AND no children (standalone category), hide sidebar entirely.

### Step 7: Update MobileFilterDrawer

**File:** `src/components/MobileFilterDrawer.tsx`

Pass `showSizeFilter` prop. When false, don't render sizes section.
Change internal FilterBar usage to use HorizontalFilters-style layout or keep FilterBar but with size visibility controlled.

Actually, for mobile: keep the drawer approach but update FilterBar to accept `showSizeFilter` prop:

```tsx
interface FilterBarProps {
  brands: { slug: string; name: string; count: number }[];
  sizes: string[];
  priceRange: { min: number; max: number };
  showSizeFilter?: boolean;  // NEW: default true
}
```

In FilterBar, wrap the size section:
```tsx
{showSizeFilter && sizes.length > 0 && (
  <Section title="Velikost skladem">...</Section>
)}
```

### Step 8: Update all pages that use FilterBar

Pages using FilterBar + getFilterOptions:
1. `src/app/(public)/kategorie/[slug]/page.tsx` — MAIN target
2. `src/app/(public)/hledat/page.tsx` — search page (keep sidebar FilterBar, sizes are mixed but OK for search)
3. `src/app/(public)/akce/page.tsx` — sale page (keep sidebar FilterBar)
4. `src/app/(public)/znacky/[slug]/page.tsx` — brand page (keep sidebar FilterBar)
5. `src/app/(public)/bazar/page.tsx` — bazar page

For pages 2-5: keep existing sidebar FilterBar layout. The AboutYou pattern (sidebar nav + horizontal filters) only applies to the CATEGORY page because only there does the category tree navigation make sense.

For search/akce/znacky/bazar: add `showSizeFilter` prop but default to `true` for backward compatibility. Only the category page will set it to `false` on parent categories.

### Step 9: Update FilterOptions interface consumers

The new `sizeType` field in FilterOptions needs to be handled by all consumers. Since it's optional (`sizeType` can just be ignored by pages that don't use it), backward compatibility is maintained.

---

## FILE CHANGES SUMMARY

| File | Action | Description |
|------|--------|-------------|
| `src/lib/filter-options.ts` | EDIT | Add `classifySizeType()`, update `getFilterOptions()` signature to accept `string[]`, add `sizeType` to return |
| `src/components/CategorySidebar.tsx` | NEW | Category tree navigation sidebar |
| `src/components/HorizontalFilters.tsx` | NEW | Horizontal filter dropdown chips row |
| `src/app/(public)/kategorie/[slug]/page.tsx` | EDIT | Replace sidebar FilterBar with CategorySidebar, add HorizontalFilters above grid, pass child IDs to getFilterOptions |
| `src/components/FilterBar.tsx` | EDIT | Add `showSizeFilter` prop (optional, default true) |
| `src/components/MobileFilterDrawer.tsx` | EDIT | Pass through `showSizeFilter` prop to FilterBar |
| `src/components/ActiveFilterChips.tsx` | NO CHANGE | Already works as horizontal chips |
| `src/lib/products.ts` | NO CHANGE | Already supports `categoryId: string[]` |

---

## CRITICAL DETAILS FOR IMPLEMENTOR

### 1. Size filter visibility rules:
- **Parent category** (Zeny/Muzi/Deti with children): `showSizeFilter = false` — NEVER show sizes
- **Leaf category** (e.g. "Panske bundy"): `showSizeFilter = true` — show sizes
- **Leaf category with mixed sizes** (edge case): show sizes but grouped by type if possible, or just show all — this is acceptable because leaf categories should be homogeneous

### 2. getFilterOptions categoryId array:
Current code at `kategorie/[slug]/page.tsx:78`:
```ts
getFilterOptions(isParent ? undefined : category.id)
```
Change to:
```ts
getFilterOptions(isParent ? [category.id, ...category.children.map(c => c.id)] : category.id)
```
This ensures brands and prices are still filtered to the correct scope.

### 3. CategorySidebar data:
The prisma query already includes `children` and `parent.children`:
```ts
include: {
  children: { orderBy: { position: "asc" } },
  parent: {
    include: {
      children: { orderBy: { position: "asc" } },
    },
  },
}
```
No DB query changes needed.

### 4. Existing hero subcategory chips:
Lines 136-162 of category page already render subcategory chips in the hero banner. These should STAY — they're the mobile-friendly category navigation. The sidebar is the DESKTOP equivalent.

### 5. HorizontalFilters popover behavior:
- Only one popover open at a time
- Click on chip toggles its popover
- Click outside closes all popovers
- Use `useRef` + `useEffect` for click-outside detection
- Popover position: absolute, below the chip, left-aligned
- Z-index: 20 (below header z-50)

### 6. FilterBar stays for non-category pages:
Search, Akce, Znacky, Bazar pages keep the existing sidebar FilterBar layout. Only the category page gets the new sidebar nav + horizontal filters layout.

### 7. URL params remain unchanged:
No changes to URL param format (`znacka`, `velikost`, `cena_od`, `cena_do`, `skladem`, `razeni`, `strana`). This ensures backward compatibility with bookmarks and shared links.

---

## TESTING CHECKLIST

- [ ] Parent category (Zeny): sidebar shows child categories, NO size filter in horizontal chips
- [ ] Child category (panske-bundy): sidebar shows siblings, size filter visible in horizontal chips
- [ ] Category with no children and no parent: no sidebar shown
- [ ] Clicking category in sidebar navigates correctly
- [ ] Active category highlighted in sidebar
- [ ] Horizontal filter chips: Cena dropdown works
- [ ] Horizontal filter chips: Znacka dropdown works
- [ ] Horizontal filter chips: Velikost dropdown works (leaf category only)
- [ ] Horizontal filter chips: Skladem toggle works
- [ ] Active filter shown as chip below filter row
- [ ] Mobile: hero subcategory chips still work
- [ ] Mobile: "Filtry" drawer still works, respects showSizeFilter
- [ ] Search page: sidebar FilterBar unchanged
- [ ] Akce page: sidebar FilterBar unchanged
- [ ] Znacky page: sidebar FilterBar unchanged
- [ ] Pagination works with filters
- [ ] URL params backward compatible
- [ ] Build passes (`npm run build`)
- [ ] No TypeScript errors

---

## ESTIMATED EFFORT

- `filter-options.ts` changes: 15 min
- `CategorySidebar.tsx` (new): 20 min
- `HorizontalFilters.tsx` (new): 45 min (most complex — popovers, state, styling)
- `kategorie/[slug]/page.tsx` layout: 20 min
- `FilterBar.tsx` + `MobileFilterDrawer.tsx` props: 10 min
- Testing: 20 min

**Total: ~2 hours**

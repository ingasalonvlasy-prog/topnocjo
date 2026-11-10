# Task #15: Autocomplete Search with Dropdown Results

## Overview

Replace the basic `SearchInput` component with a full autocomplete search featuring debounced API calls, a dropdown with product/brand/category results, and expanded desktop search behavior.

## Current State

- `src/components/SearchInput.tsx` — simple form, `useState` for query, `onSubmit` pushes to `/hledat?q=...`. No debounce, no dropdown, no API call on type.
- `src/components/Header.tsx` — Desktop: search icon button (no input visible), Mobile: `<SearchInput>` always visible below header.
- No existing API routes (`src/app/api/` directory is empty).
- Search logic lives in `src/lib/products.ts` → `getFilteredProducts()` which uses Prisma `contains` on `name`, `brand.name`, `productType`.
- Database: SQLite via `@prisma/adapter-libsql`. No full-text search index — use `contains` (LIKE) which is sufficient for autocomplete with small result sets.

---

## Implementation Plan

### Step 1: Create API Route — `src/app/api/search/route.ts`

**Purpose:** Server-side endpoint for autocomplete queries. Returns products, brands, and categories matching the search term.

```typescript
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  
  if (!q || q.length < 2) {
    return NextResponse.json({ products: [], brands: [], categories: [] });
  }

  const [products, brands, categories] = await Promise.all([
    // Top 6 matching products
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { name: { contains: q } },
          { brand: { name: { contains: q } } },
          { productType: { contains: q } },
        ],
      },
      select: {
        slug: true,
        name: true,
        photos: true,       // JSON string — parse on client
        brand: { select: { name: true } },
        variants: {
          where: { active: true },
          select: { price: true, comparePrice: true },
          orderBy: { price: "asc" },
          take: 1,           // just cheapest variant for display
        },
      },
      take: 6,
    }),

    // Top 3 matching brands
    prisma.brand.findMany({
      where: {
        name: { contains: q },
        products: { some: { status: "ACTIVE" } },
      },
      select: {
        slug: true,
        name: true,
        logo: true,
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
      take: 3,
    }),

    // Top 3 matching categories
    prisma.category.findMany({
      where: {
        name: { contains: q },
        products: { some: { product: { status: "ACTIVE" } } },
      },
      select: {
        slug: true,
        name: true,
        _count: { select: { products: true } },
      },
      take: 3,
    }),
  ]);

  return NextResponse.json({ products, brands, categories });
}
```

**Key decisions:**
- Minimum 2 characters before querying (avoid expensive single-char searches on 14k products)
- 3 parallel Prisma queries for products (6), brands (3), categories (3)
- Products return only `slug`, `name`, `photos` (JSON), `brand.name`, cheapest variant `price`/`comparePrice` — minimal payload
- No pagination needed — fixed limit per type
- Uses SQLite `contains` (LIKE %q%) — no special full-text index required

**Response shape:**
```typescript
{
  products: Array<{
    slug: string;
    name: string;
    photos: string;  // JSON string, parse on client to get first photo
    brand: { name: string };
    variants: Array<{ price: number; comparePrice: number | null }>;
  }>;
  brands: Array<{
    slug: string;
    name: string;
    logo: string | null;
    _count: { products: number };
  }>;
  categories: Array<{
    slug: string;
    name: string;
    _count: { products: number };
  }>;
}
```

---

### Step 2: Rewrite SearchInput → SearchAutocomplete — `src/components/SearchAutocomplete.tsx`

**Purpose:** New client component replacing `SearchInput`. Handles debounced typing, API fetching, dropdown rendering, keyboard navigation.

**File:** `src/components/SearchAutocomplete.tsx` (new file, "use client")

**Props:**
```typescript
interface SearchAutocompleteProps {
  placeholder?: string;
  onClose?: () => void;       // for desktop expand/collapse
  autoFocus?: boolean;        // true when desktop expands
}
```

**State:**
```typescript
const [query, setQuery] = useState("");
const [results, setResults] = useState<SearchResults | null>(null);
const [isOpen, setIsOpen] = useState(false);    // dropdown visible
const [isLoading, setIsLoading] = useState(false);
const [activeIndex, setActiveIndex] = useState(-1); // keyboard nav
```

**Debounce logic:**
```typescript
useEffect(() => {
  if (query.trim().length < 2) {
    setResults(null);
    setIsOpen(false);
    return;
  }

  setIsLoading(true);
  const timer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data);
      setIsOpen(true);
    } catch {
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  return () => clearTimeout(timer);
}, [query]);
```

**Keyboard handling (onKeyDown on input):**
- `ArrowDown` / `ArrowUp` — move `activeIndex` through flattened results list
- `Enter` — if `activeIndex >= 0`, navigate to that item; otherwise navigate to `/hledat?q=...`
- `Escape` — close dropdown, call `onClose?.()` if desktop expanded

**Close on outside click:**
- `useRef` on wrapper div + `useEffect` with `mousedown` listener on document
- Check if click target is outside ref → close dropdown

**Dropdown UI structure (absolutely positioned below input):**
```
┌─────────────────────────────────────┐
│ 🔍 Loading...  (if isLoading)       │  ← only while fetching
├─────────────────────────────────────┤
│ ZNAČKY                    (section) │
│ ┌─[Logo] On Running ── 42 produktů─┐│
│ └───────────────────────────────────┘│
├─────────────────────────────────────┤
│ KATEGORIE                 (section) │
│ ┌─Běžecké boty ──── 120 produktů──┐ │
│ └──────────────────────────────────┘ │
├─────────────────────────────────────┤
│ PRODUKTY                  (section) │
│ ┌─[Photo] Nike Pegasus 41          │
│ │         Nike · 3 490 Kč          │
│ ├─[Photo] Nike Vomero 18           │
│ │         Nike · 4 290 Kč          │
│ ├─ ...                              │
│ └───────────────────────────────────┘│
├─────────────────────────────────────┤
│ Zobrazit všechny výsledky pro "..."→│  ← Link to /hledat?q=...
└─────────────────────────────────────┘
```

**CSS classes for dropdown:**
- Container: `absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-[var(--radius-field)] shadow-lg z-50 max-h-[480px] overflow-y-auto`
- Section header: `text-[11px] font-bold uppercase tracking-[0.08em] text-muted px-4 pt-3 pb-1`
- Product row: `flex items-center gap-3 px-4 py-2.5 hover:bg-wash transition-colors cursor-pointer`
- Product thumbnail: `w-[44px] h-[44px] rounded-[6px] bg-wash object-contain shrink-0` with `mix-blend-mode: multiply`
- Product name: `text-[14px] font-medium text-ink truncate`
- Product brand: `text-[12px] text-muted`
- Product price: `text-[14px] font-bold text-navy`
- Compare price (strikethrough): `text-[12px] text-muted line-through`
- Brand/Category row: `flex items-center justify-between px-4 py-2.5 hover:bg-wash transition-colors cursor-pointer`
- "Zobrazit vše" link: `block px-4 py-3 text-[14px] font-bold text-blue text-center border-t border-line hover:bg-wash transition-colors`
- Active keyboard item: `bg-wash` (same as hover)

**Product row render logic:**
```tsx
function ProductRow({ product }: { product: SearchProduct }) {
  const photos: string[] = JSON.parse(product.photos || "[]");
  const photo = photos[0];
  const price = product.variants[0]?.price;
  const comparePrice = product.variants[0]?.comparePrice;

  return (
    <Link href={`/produkt/${product.slug}`} className="...">
      {photo ? (
        <Image src={photo} alt="" width={44} height={44} className="..." style={{ mixBlendMode: "multiply" }} />
      ) : (
        <div className="w-[44px] h-[44px] rounded-[6px] bg-wash" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-ink truncate">{product.name}</div>
        <div className="text-[12px] text-muted">{product.brand.name}</div>
      </div>
      <div className="text-right shrink-0">
        {price && <div className="text-[14px] font-bold text-navy">{formatPrice(price)}</div>}
        {comparePrice && comparePrice > (price || 0) && (
          <div className="text-[12px] text-muted line-through">{formatPrice(comparePrice)}</div>
        )}
      </div>
    </Link>
  );
}
```

**Important:** Import `formatPrice` from `@/lib/products` — it's already exported and handles Czech number formatting with Kc suffix.

**Empty state:** If results exist but all arrays empty → show "Nic jsme nenašli. Zkuste jiný dotaz." centered in dropdown.

---

### Step 3: Update Header.tsx — Desktop Search Expand

**Current desktop search:** Just a search icon button (`<button aria-label="Hledat">`) at line 73-77 in Header.tsx. No input field visible.

**New behavior:** Click search icon → input expands inline (replaces icon area), with autocomplete dropdown.

**Implementation approach:** Add `searchOpen` state to Header component.

```typescript
const [searchOpen, setSearchOpen] = useState(false);
```

**Desktop header icons section (line 72-88)** — modify to:

```tsx
<div className="flex items-center gap-2">
  {searchOpen ? (
    <div className="relative w-[300px]">
      <SearchAutocomplete
        placeholder="Hledej značku nebo produkt..."
        onClose={() => setSearchOpen(false)}
        autoFocus
      />
    </div>
  ) : (
    <button
      className="w-10 h-10 flex items-center justify-center text-ink hover:text-navy transition-colors"
      onClick={() => setSearchOpen(true)}
      aria-label="Hledat"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    </button>
  )}
  {/* ...user icon, cart icon unchanged */}
</div>
```

**Width note:** `w-[300px]` gives enough space for the input. The flex layout will accommodate this — the nav links have `flex-1` so they'll compress slightly. If this feels too wide, `w-[260px]` is fine too.

**Transition (optional, nice-to-have):** The expand can be animated with `transition-all duration-200` and `w-0 opacity-0` → `w-[300px] opacity-100`. But a simple show/hide is fine for v1.

---

### Step 4: Update Header.tsx — Mobile Search

**Current mobile search (line 126-128):**
```tsx
<div className="lg:hidden pb-3">
  <SearchInput placeholder="Hledej značku nebo produkt..." />
</div>
```

**Change:** Replace `SearchInput` with `SearchAutocomplete`:
```tsx
<div className="lg:hidden pb-3 relative">
  <SearchAutocomplete placeholder="Hledej značku nebo produkt..." />
</div>
```

The `relative` class on the wrapper ensures the absolute-positioned dropdown is anchored correctly.

**Important:** The mobile dropdown should be full-width of the header container. The `relative` on the parent div + `left-0 right-0` on the dropdown achieves this.

---

### Step 5: Update Header.tsx — Imports

Replace `SearchInput` import with `SearchAutocomplete`:
```typescript
// Remove: import { SearchInput } from "./SearchInput";
// Add:    import { SearchAutocomplete } from "./SearchAutocomplete";
```

`SearchInput.tsx` can be kept for now (might be used elsewhere) or deleted if no other imports exist. Check with: `grep -r "SearchInput" src/`.

---

### Step 6: Handle `formatPrice` Import in Client Component

`formatPrice` is defined in `src/lib/products.ts` which imports from `@/lib/db` (Prisma). This means the whole module has server-side dependencies.

**Solution:** Extract `formatPrice` to a shared utility that can be imported from both server and client:

Create `src/lib/format.ts`:
```typescript
export function formatPrice(amount: number): string {
  const formatted = new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted}\u00A0Kč`;
}
```

Then update `src/lib/products.ts` to re-export from `format.ts`:
```typescript
export { formatPrice } from "./format";
// Remove the local formatPrice function definition (lines 193-199)
```

This way existing imports of `formatPrice` from `@/lib/products` keep working, and `SearchAutocomplete.tsx` can import from `@/lib/format` directly (no Prisma dependency in the client bundle).

---

## File Changes Summary

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `src/app/api/search/route.ts` | **CREATE** | API endpoint for autocomplete — 3 parallel Prisma queries (products 6, brands 3, categories 3) |
| 2 | `src/lib/format.ts` | **CREATE** | Extract `formatPrice` for client-safe import |
| 3 | `src/components/SearchAutocomplete.tsx` | **CREATE** | Full autocomplete component — debounce 300ms, dropdown with products/brands/categories, keyboard nav, outside click close |
| 4 | `src/components/Header.tsx` | **EDIT** | Desktop: search icon toggles `SearchAutocomplete` (w-[300px]). Mobile: replace `SearchInput` with `SearchAutocomplete`. Update import. |
| 5 | `src/lib/products.ts` | **EDIT** | Remove local `formatPrice`, re-export from `./format` |
| 6 | `src/components/SearchInput.tsx` | **DELETE** (if unused) | Replaced by `SearchAutocomplete` |

## Edge Cases & Notes

1. **SQLite `contains` is case-sensitive by default.** Prisma with SQLite uses `LIKE` which is case-insensitive for ASCII but NOT for Unicode (Czech diacritics). If "běh" doesn't match when typing "Běh", the API route should lowercase both sides. **Mitigation:** SQLite's LIKE is actually case-insensitive for ASCII a-z. For Czech chars (ě, š, č, ř, ž, etc.), SQLite's `LIKE` IS case-insensitive by default with the `NOCASE` collation. Prisma `contains` maps to `LIKE %q%` which should work. Test with actual data.

2. **Photo URLs:** Product `photos` field is a JSON string array. Parse with `JSON.parse()` in the client component. Handle empty/malformed gracefully.

3. **No results:** If all 3 arrays are empty, show "Nic jsme nenašli" message in dropdown. Don't close dropdown — user should see the empty state.

4. **Mobile z-index:** Dropdown needs `z-50` to appear above other content. The header is already `z-50`, so the dropdown (nested inside header) inherits stacking context.

5. **Accessibility:** 
   - `role="listbox"` on dropdown, `role="option"` on items
   - `aria-activedescendant` on input pointing to active item id
   - `aria-expanded` on input reflecting dropdown state
   - Screen reader announcement for result count

6. **Performance:** 300ms debounce + min 2 chars + `take` limits on queries should keep this fast. No caching needed for v1 — each query is cheap with indexes on `status` and `brandId`.

7. **Close dropdown:** On `blur` with a small delay (150ms) to allow click events on dropdown items to fire before the dropdown disappears. Alternative: use `onMouseDown` with `preventDefault()` on dropdown items instead of `onClick`.

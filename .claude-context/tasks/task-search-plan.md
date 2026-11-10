# Task: Autocomplete Search — Implementation Plan

## 1. API Route — `src/app/api/search/route.ts` (CREATE)

GET `/api/search?q=...` — returns top 8 products matching query.

- Min 2 chars, otherwise return empty array
- Prisma query: `product.findMany` with `status: "ACTIVE"`, `OR: [name contains q, brand.name contains q, productType contains q]`
- `select`: slug, name, photos, brand.name, first active variant (price, comparePrice)
- `take: 8`
- Response: `{ products: [...] }`

**Note:** `formatPrice` lives in `src/lib/products.ts` which imports Prisma — can't use in client component. Extract to `src/lib/format.ts` (pure function, no Prisma dep). Re-export from products.ts to keep existing imports working.

## 2. Client Component — `src/components/SearchBar.tsx` (CREATE)

"use client" component. Props: `placeholder?: string`, `onClose?: () => void`, `autoFocus?: boolean`.

**State:** query, results, isOpen, isLoading

**Debounce:** `useEffect` with 300ms `setTimeout` on query change. Fetch `/api/search?q=...`. Clear results if < 2 chars.

**Dropdown** (absolute positioned below input):
- Product rows: 44x44 thumbnail (mix-blend-mode:multiply, bg-wash) + name (truncate) + brand name (text-muted) + price (font-bold text-navy)
- Compare price strikethrough if exists
- "Zobrazit všechny výsledky" link at bottom → `/hledat?q=...`
- Empty state: "Nic jsme nenašli"

**Keyboard:** Enter → navigate `/hledat?q=...`. Escape → close, call `onClose?.()`.

**Close:** `useRef` + document `mousedown` listener for outside click.

**Styling:** dropdown: `bg-white border border-line rounded-[var(--radius-field)] shadow-lg z-50 max-h-[400px] overflow-y-auto mt-1`

## 3. Header.tsx Integration (EDIT)

**Import:** Replace `SearchInput` → `SearchBar`.

**Desktop (lg+):** Add `searchOpen` state. Search icon click → `setSearchOpen(true)` → render `<SearchBar onClose={() => setSearchOpen(false)} autoFocus />` in `w-[280px]` container replacing the icon. Escape/outside click → collapse back to icon.

**Mobile:** Replace `<SearchInput>` with `<SearchBar>` in the `lg:hidden pb-3` div. Add `relative` class to parent div for dropdown positioning.

## 4. Search Results Page — NO CHANGES

`/hledat?q=...` already works via `src/app/(public)/hledat/page.tsx` using `getFilteredProducts({ search: query })`. No changes needed.

## 5. Cleanup

- **CREATE** `src/lib/format.ts` — move `formatPrice` here
- **EDIT** `src/lib/products.ts` — delete local `formatPrice`, add `export { formatPrice } from "./format"`
- **DELETE** `src/components/SearchInput.tsx` — replaced by SearchBar

## File Summary

| File | Action |
|------|--------|
| `src/app/api/search/route.ts` | CREATE |
| `src/lib/format.ts` | CREATE |
| `src/components/SearchBar.tsx` | CREATE |
| `src/components/Header.tsx` | EDIT |
| `src/lib/products.ts` | EDIT |
| `src/components/SearchInput.tsx` | DELETE |

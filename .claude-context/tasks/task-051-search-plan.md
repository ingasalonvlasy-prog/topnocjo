# TASK #4: Vyhledavani — Vylepsit UX a relevanci

**Status:** Plan ready for implementation
**Priority:** Medium

---

## CURRENT STATE ANALYSIS

### Architecture overview
Search has 3 layers:
1. **Autocomplete API** (`src/app/api/search/route.ts`) — instant suggestions while typing
2. **Autocomplete UI** (`src/components/SearchAutocomplete.tsx`) — header dropdown, 300ms debounce
3. **Full results page** (`src/app/(public)/hledat/page.tsx`) — server-side filtered listing with FilterBar

Plus a duplicate: `src/components/HeroSearch.tsx` — homepage hero search, nearly identical to SearchAutocomplete but with different styling and NO keyboard nav, NO recent searches, NO query highlighting.

### Database: Turso/libsql (SQLite)
- Prisma `contains` = SQLite `LIKE %q%` — case-insensitive for ASCII only
- Czech diacritics: `LIKE` does NOT match `e` to `ě` natively — the API handles this via double query (original + stripped diacritics)
- No FTS5 index available through Prisma adapter
- Product count: ~14k (from Shopify import) — LIKE queries are fast enough at this scale

---

## IDENTIFIED PROBLEMS

### Problem 1: Diacritics search is INCOMPLETE
**API route.ts lines 20-24:**
```ts
const searchOR = [
  { name: { contains: q } },
  { brand: { name: { contains: q } } },
  { productType: { contains: q } },
];
```
The FIRST query uses the original query string. The diacritics-stripped query is a SEPARATE second query (lines 49-66). This means:
- Typing "beh" → first query finds nothing (no product literally named "beh"), then second query finds "Beh" but only if `qNorm !== qLower`
- Typing "beh" → `qNorm = "beh"`, `qLower = "beh"` → `qNorm === qLower` → **second query NEVER runs!**
- Result: User types "beh" and finds nothing, must type "Běh" or "běh" with diacritics

**Root cause:** The condition `if (qNorm !== qLower)` only triggers the diacritics search when the user types WITH diacritics. But the typical user DOESN'T type diacritics. They type "beh" (without hacek) and expect to find "Běh".

**Fix:** Always search with BOTH original and stripped versions. Also strip diacritics from the DB data before comparison (which the scoring function already does on line 81, but the SQL query doesn't).

### Problem 2: No search in tags or description
API searches: `name`, `brand.name`, `productType`. Doesn't search:
- `tags` (JSON string array — contains useful terms like "trail", "waterproof", etc.)
- `description` / `bodyHtml` (product descriptions — may contain key terms)
- `slug` (useful for direct matches)

Tags are especially valuable because they're curated terms from Shopify imports.

### Problem 3: HeroSearch is a code duplicate
`HeroSearch.tsx` (194 lines) duplicates 90% of `SearchAutocomplete.tsx` (446 lines) but:
- Missing keyboard navigation (ArrowUp/ArrowDown/Enter)
- Missing recent searches
- Missing query highlighting
- Missing "Skladem" badge
- Different styling (glass morphism vs standard)

Should be consolidated into SearchAutocomplete with a `variant="hero"` prop (which already exists but HeroSearch doesn't use it).

### Problem 4: Scoring doesn't penalize out-of-stock
The scoring function gives +20 for in-stock products, but doesn't penalize out-of-stock. With a scoring range of 0-280, +20 is too small. A completely out-of-stock product with a good name match (100 pts) still ranks above an in-stock product with a brand match (40+20=60 pts).

### Problem 5: No "did you mean" / typo tolerance
User types "nkie" instead of "nike" → zero results. No fuzzy matching.
Full fuzzy search requires Levenshtein distance which isn't practical in SQL. But we can do SIMPLE mitigations.

### Problem 6: Search page has redundant product count
The search page displays product count TWICE:
- Line 76: `<p className="text-[13px] text-muted...">{result.total} produktu</p>` (below heading)
- Line 92: `<span className="text-[14px] font-bold...">{result.total} produktu</span>` (top bar)

### Problem 7: generateMetadata doesn't include query
Already identified in `task-hledat-review-plan.md` — the metadata title/description doesn't reflect the actual search query. Currently returns generic "Vyhledavani" for all searches.

### Problem 8: Empty search page shows hardcoded category links
Lines 127-144: empty state has hardcoded category links ("Beh", "Kopacky", "Obleceni", "Hory a outdoor", "Doplnky"). These don't reflect actual popular categories and may link to empty categories.

---

## IMPLEMENTATION PLAN

### Step 1: Fix diacritics search in API route

**File:** `src/app/api/search/route.ts`

The core problem: when user types without diacritics ("beh"), the stripped version equals the original, so the second query never runs. But the DB data HAS diacritics ("Běh"). Fix: ALWAYS include diacritics-stripped conditions in the initial query.

```ts
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ products: [], brands: [], categories: [] });
  }

  const qNorm = stripDiacritics(q).toLowerCase();

  // Build search conditions — ALWAYS include both original and stripped
  const searchOR: Prisma.ProductWhereInput[] = [
    { name: { contains: q } },
    { brand: { name: { contains: q } } },
    { productType: { contains: q } },
  ];

  // Always add stripped conditions (even if same as original —
  // the DB data has diacritics that won't match the user's ASCII input)
  // We need to fetch more products and filter in JS
  // because SQLite LIKE can't strip diacritics from stored data

  const [products, brands, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        OR: searchOR,
      },
      include: {
        variants: { where: { active: true }, orderBy: { position: "asc" } },
        brand: true,
      },
      take: 50,
    }),
    prisma.brand.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          // Can't strip diacritics in SQL, fetch all and filter in JS
        ],
      },
      take: 20,
    }),
    prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: q } },
        ],
      },
      take: 20,
    }),
  ]);

  // JS-side diacritics matching for brands/categories
  const matchedBrands = brands.length > 0 ? brands :
    (await prisma.brand.findMany({ take: 50 }))
      .filter(b => stripDiacritics(b.name.toLowerCase()).includes(qNorm));

  const matchedCategories = categories.length > 0 ? categories :
    (await prisma.category.findMany({ take: 100 }))
      .filter(c => stripDiacritics(c.name.toLowerCase()).includes(qNorm));
  ...
}
```

**BUT** — this is inefficient. Better approach:

Since we can't do diacritics-insensitive search in SQLite LIKE, and the dataset is small (~14k products, ~100 brands, ~100 categories), the BEST approach is:

**For brands and categories (small tables < 200 rows):**
Fetch all, filter in JS with diacritics stripping. Cache in memory.

**For products (14k rows):**
Can't fetch all. Keep the dual-query approach but FIX THE BUG:

```ts
// ALWAYS run both queries — original AND stripped
const [productsOriginal, productsStripped] = await Promise.all([
  prisma.product.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { name: { contains: q } },
        { brand: { name: { contains: q } } },
        { productType: { contains: q } },
      ],
    },
    include: { variants: { where: { active: true }, orderBy: { position: "asc" } }, brand: true },
    take: 30,
  }),
  // ALWAYS run stripped query (the fix!)
  prisma.product.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { name: { contains: qNorm } },
        { brand: { name: { contains: qNorm } } },
        { productType: { contains: qNorm } },
      ],
    },
    include: { variants: { where: { active: true }, orderBy: { position: "asc" } }, brand: true },
    take: 30,
  }),
]);

// Merge & deduplicate
const seen = new Set<string>();
const products: typeof productsOriginal = [];
for (const p of [...productsOriginal, ...productsStripped]) {
  if (!seen.has(p.id)) {
    seen.add(p.id);
    products.push(p);
  }
}
```

**Wait** — this still won't work for "beh" matching "Běh" because SQLite LIKE `'%beh%'` does NOT match `'Běh'` (different bytes). And `'%beh%'` on stripped data also fails because the DATA isn't stripped.

**Real fix:** We need a different approach entirely. The problem is that SQLite stores "Běžecké boty" but user searches "bezecke boty". SQLite LIKE can't match across diacritics.

**SOLUTION: Add a `nameSearch` column (denormalized, diacritics-stripped)**

This is the standard approach for diacritics-insensitive search in SQLite:

1. Add `nameSearch String?` column to Product model
2. Populate it with `stripDiacritics(name).toLowerCase()` during import
3. Search against `nameSearch` instead of `name`

This is the ONLY reliable fix for Czech diacritics search in SQLite.

### Step 1 (revised): Add nameSearch column to Product

**File:** `prisma/schema.prisma`

```prisma
model Product {
  ...
  nameSearch     String?    // diacritics-stripped lowercase name for search
  ...
  @@index([nameSearch])    // NEW index for search performance
}
```

**Migration:**
```sql
ALTER TABLE products ADD COLUMN nameSearch TEXT;
CREATE INDEX idx_products_nameSearch ON products(nameSearch);
UPDATE products SET nameSearch = lower(name);  -- will be refined with JS script
```

The UPDATE in SQL can't strip diacritics (SQLite has no unaccent). Need a one-time JS script:
```ts
// scripts/populate-search-fields.ts
const products = await prisma.product.findMany({ select: { id: true, name: true } });
for (const p of products) {
  await prisma.product.update({
    where: { id: p.id },
    data: { nameSearch: stripDiacritics(p.name).toLowerCase() },
  });
}
```

Also update feed import to populate `nameSearch` on new/updated products.

**Similarly for Brand:**
```prisma
model Brand {
  ...
  nameSearch  String?
  ...
}
```

**Category already has slug which is diacritics-stripped** — can search on slug directly.

### Step 2: Update API route to use nameSearch

**File:** `src/app/api/search/route.ts`

```ts
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ products: [], brands: [], categories: [] });
  }

  const qNorm = stripDiacritics(q).toLowerCase();

  const [products, brands, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { nameSearch: { contains: qNorm } },        // diacritics-insensitive!
          { brand: { nameSearch: { contains: qNorm } } },
          { productType: { contains: q } },
          // Optional: search tags (JSON string)
          { tags: { contains: q } },
        ],
      },
      include: {
        variants: { where: { active: true }, orderBy: { position: "asc" } },
        brand: true,
      },
      take: 30,
    }),
    prisma.brand.findMany({
      where: {
        OR: [
          { nameSearch: { contains: qNorm } },
          { name: { contains: q } },
        ],
      },
      take: 5,
    }),
    prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { slug: { contains: qNorm } },  // slugs are already diacritics-stripped
        ],
      },
      take: 5,
    }),
  ]);

  // Score & rank (same as current but with improved weights)
  ...
}
```

### Step 3: Update scoring algorithm

**File:** `src/app/api/search/route.ts`

Improved scoring:

```ts
function scoreProduct(p: typeof products[0], qNorm: string, qLower: string): number {
  let score = 0;
  const name = p.name.toLowerCase();
  const nameNorm = stripDiacritics(name);
  const brand = p.brand.name.toLowerCase();
  const brandNorm = stripDiacritics(brand);

  // Exact name start = highest priority
  if (nameNorm.startsWith(qNorm) || name.startsWith(qLower)) score += 100;
  // Brand exact match
  if (brandNorm === qNorm || brand === qLower) score += 80;
  // Name contains query
  if (nameNorm.includes(qNorm) || name.includes(qLower)) score += 50;
  // Brand starts with query
  if (brandNorm.startsWith(qNorm) || brand.startsWith(qLower)) score += 40;
  // Tag match
  try {
    const tags: string[] = JSON.parse(p.tags || "[]");
    if (tags.some(t => stripDiacritics(t.toLowerCase()).includes(qNorm))) score += 30;
  } catch {}

  // Stock: bigger weight differential
  const hasOwnStock = p.variants.some(v => v.ownStock > 0);
  const hasSupplierStock = p.variants.some(v => v.supplierStock > 0);
  if (hasOwnStock) score += 40;          // was 20 — doubled
  else if (hasSupplierStock) score += 20;  // on order = moderate boost
  // No stock = no bonus (effectively -40 vs in-stock)

  // Has photo
  const photos: string[] = JSON.parse(p.photos || "[]");
  if (photos.length > 0 && photos[0]?.includes("shopify")) score += 10;

  // Has sale price (slight boost for relevance)
  const hasSale = p.variants.some(v => v.comparePrice && v.comparePrice > v.price);
  if (hasSale) score += 5;

  return score;
}
```

### Step 4: Merge HeroSearch into SearchAutocomplete

**File:** `src/components/HeroSearch.tsx` — DELETE
**File:** `src/components/SearchAutocomplete.tsx` — EDIT

The `SearchAutocomplete` already has a `variant` prop: `"default" | "hero"`. But `HeroSearch` is a completely separate component used on the homepage. Merge by:

1. Add hero styling to `SearchAutocomplete` variant="hero":
   - Input: glass morphism styling (`bg-white/10 border-white/20 text-white placeholder:text-white/40`)
   - Dropdown: `rounded-[12px] shadow-2xl` (vs `rounded-[var(--radius-card)]`)
   - Search icon: `text-white/40` (vs `text-muted`)

2. Homepage (`src/app/(public)/page.tsx`): Replace `<HeroSearch />` with `<SearchAutocomplete variant="hero" placeholder="Hledej znacku, produkt nebo kategorii..." />`

3. Delete `src/components/HeroSearch.tsx`

Benefit: HeroSearch gets keyboard navigation, recent searches, and query highlighting for free.

### Step 5: Fix search results page metadata

**File:** `src/app/(public)/hledat/page.tsx`

```ts
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = await searchParams;
  const query = (sp.q as string) || "";
  return {
    title: query ? `${query} — Hledani | Qsport.cz` : "Vyhledavani | Qsport.cz",
    description: query
      ? `Vysledky hledani pro "${query}" na Qsport.cz`
      : "Hledej sportovni vybaveni na Qsport.cz",
    openGraph: {
      title: query ? `${query} — Hledani | Qsport.cz` : "Vyhledavani | Qsport.cz",
      description: query
        ? `Vysledky hledani pro "${query}" na Qsport.cz`
        : "Hledej sportovni vybaveni na Qsport.cz",
    },
    robots: { index: false },
  };
}
```

### Step 6: Remove duplicate product count on search page

**File:** `src/app/(public)/hledat/page.tsx`

Remove line 76 (the `<p>{result.total} produktu</p>` below heading) — the count is already in the top bar on line 92.

### Step 7: Fix full results page diacritics search

**File:** `src/lib/products.ts`

Same diacritics problem exists here. The `getFilteredProducts` function searches `name`, `brand.name`, `productType` with `contains` — which fails for diacritics.

After `nameSearch` column is added:
```ts
if (search) {
  const searchNorm = stripDiacritics(search).toLowerCase();
  where.OR = [
    { nameSearch: { contains: searchNorm } },
    { brand: { nameSearch: { contains: searchNorm } } },
    { productType: { contains: search } },
    { tags: { contains: search } },
  ];
}
```

### Step 8: Update feed import to populate nameSearch

**File:** `src/app/api/feeds/import/route.ts` (or wherever products are created/updated)

After creating/updating a product, also set:
```ts
nameSearch: stripDiacritics(productName).toLowerCase()
```

Similarly for brands.

---

## FILE CHANGES SUMMARY

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | EDIT | Add `nameSearch` column to Product and Brand, add index |
| `src/app/api/search/route.ts` | EDIT | Use `nameSearch` for queries, always search stripped, improve scoring |
| `src/lib/products.ts` | EDIT | Use `nameSearch` in `getFilteredProducts` search |
| `src/components/SearchAutocomplete.tsx` | EDIT | Add hero variant styling from HeroSearch |
| `src/components/HeroSearch.tsx` | DELETE | Merged into SearchAutocomplete |
| `src/app/(public)/page.tsx` | EDIT | Replace HeroSearch import with SearchAutocomplete variant="hero" |
| `src/app/(public)/hledat/page.tsx` | EDIT | Fix generateMetadata, remove duplicate count |
| `src/app/api/feeds/import/route.ts` | EDIT | Populate nameSearch on import |
| Migration script | NEW | One-time script to populate nameSearch for existing products/brands |

---

## ALTERNATIVE: No schema change, JS-side filtering

If adding a DB column is too disruptive, there's a lighter approach:

For the autocomplete API (small result set, 8 products):
1. Fetch MORE products (50-100) with the original query
2. ALSO fetch by tags
3. Do ALL scoring and diacritics matching in JS
4. Return top 8

For the full results page (pagination, 48 per page):
This won't work without the DB column because we need SQL-level filtering for pagination.

**Recommendation:** Add the `nameSearch` column. It's a one-time migration + script, and it permanently fixes Czech search. The alternative (JS filtering) only works for autocomplete, not for the full results page.

---

## IMPLEMENTATION ORDER

1. **Schema + migration** (nameSearch column) — must come first
2. **Populate script** — one-time data fix
3. **API route fix** — immediately improves autocomplete
4. **products.ts fix** — improves full search page
5. **Feed import update** — ensures new products get nameSearch
6. **HeroSearch merge** — code cleanup, gains keyboard nav
7. **Search page metadata** — quick fix
8. **Scoring improvements** — better relevance

Steps 1-5 are the core fix. Steps 6-8 are polish.

---

## TESTING CHECKLIST

- [ ] Search "beh" (without diacritics) → finds "Bezecke boty" and related products
- [ ] Search "nike" → finds Nike products, Nike brand in results
- [ ] Search "mikina" → finds products with "Mikina" in name
- [ ] Search "trail" → finds products tagged "trail" or with "trail" in name
- [ ] Autocomplete dropdown shows products, brands, categories
- [ ] Keyboard navigation (ArrowUp/Down, Enter) works in autocomplete
- [ ] Recent searches show on focus when input is empty
- [ ] Query text is highlighted in results
- [ ] In-stock products rank higher than out-of-stock
- [ ] Homepage hero search works (after HeroSearch merge)
- [ ] Search results page shows correct metadata title with query
- [ ] No duplicate product count on search results page
- [ ] Pagination works correctly on search results page
- [ ] Feed import populates nameSearch for new products
- [ ] Build passes (`npm run build`)
- [ ] No TypeScript errors

---

## ESTIMATED EFFORT

- Schema + migration + populate script: 30 min
- API route rewrite: 30 min
- products.ts search fix: 15 min
- Feed import update: 15 min
- HeroSearch merge into SearchAutocomplete: 30 min
- Search page fixes (metadata, duplicate count): 10 min
- Scoring improvements: 15 min
- Testing: 20 min

**Total: ~2.5 hours**

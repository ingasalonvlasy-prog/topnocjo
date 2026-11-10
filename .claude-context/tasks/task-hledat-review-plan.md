# Plan: /hledat Page Review

## Current State

`src/app/(public)/hledat/page.tsx` — fully functional. Has:
- Search query from `?q=` param
- Filters (brand, size, price, inStock) via FilterBar
- Product grid (2/3/4 cols)
- Pagination
- Breadcrumbs
- Empty state
- SEO: robots noindex (correct for search)

## Issues to Fix

### 1. Sort dropdown missing
FilterBar renders but doesn't include sort. The page reads `sp.razeni` and passes `sort` to `getFilteredProducts`, but the sort UI depends on FilterBar implementation. This is tracked separately in the FilterBar sidebar plan (P4).

**No action needed here** — sort will come with FilterBar rewrite.

### 2. Dynamic metadata with query
`generateMetadata` doesn't use the actual query in title. Fix:

```typescript
export async function generateMetadata({ searchParams }: { searchParams: Promise<...> }): Promise<Metadata> {
  const sp = await searchParams;
  const query = (sp.q as string) || "";
  return {
    title: query ? `${query} — Hledání | Qsport.cz` : "Vyhledávání | Qsport.cz",
    description: query ? `Výsledky hledání pro „${query}" na Qsport.cz` : "Hledej sportovní vybavení na Qsport.cz",
    robots: { index: false },
  };
}
```

### 3. No SearchBar on results page
When user lands on /hledat, there's no visible search input to refine query (only in header). Consider adding SearchAutocomplete at top of results (after breadcrumbs, before heading). This ties to Task #15 (search autocomplete) — once SearchBar.tsx exists, add it here too.

**Add after Task #15 is implemented:**
```tsx
<div className="mb-6">
  <SearchAutocomplete placeholder="Upřesnit hledání..." />
</div>
```

## File Summary

| File | Action |
|------|--------|
| `src/app/(public)/hledat/page.tsx` | EDIT — fix generateMetadata to include query, add SearchBar after Task #15 |

**Low priority** — page works. Only metadata fix is needed now.

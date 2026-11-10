# Plan: /znacky + /znacky/[slug]

## 1. Brand List Page — `src/app/(public)/znacky/page.tsx` (CREATE)

Server component. Fetches all brands with active product count.

**Data query:**
```typescript
prisma.brand.findMany({
  where: { products: { some: { status: "ACTIVE" } } },
  select: { slug: true, name: true, logo: true, _count: { select: { products: { where: { status: "ACTIVE" } } } } },
  orderBy: { name: "asc" },
})
```

**Layout:**
- Breadcrumbs: Domů / Značky
- H1: "Značky" (text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em])
- Subtitle: "{count} značek" (text-[13px] text-muted)
- Grid: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4`
- Each brand card: `<Link href="/znacky/{slug}">` — white bg, border border-line, rounded-[var(--radius-card)], p-6, hover:border-navy hover:shadow-sm transition-all, text-center
  - Logo: `<Image>` if logo exists, else brand name initial in navy circle (w-[60px] h-[60px])
  - Brand name: text-[16px] font-bold text-navy
  - Product count: text-[13px] text-muted "{_count.products} produktů"

**SEO metadata:**
```typescript
export const metadata: Metadata = {
  title: "Značky | Qsport.cz",
  description: "Přehled všech sportovních značek na Qsport.cz",
};
```

## 2. Brand Detail Page — `src/app/(public)/znacky/[slug]/page.tsx` (CREATE)

Server component. Same pattern as `/kategorie/[slug]/page.tsx` — reuses `getFilteredProducts`, `FilterBar`, `ProductCard`, `Pagination`.

**Data:**
- Fetch brand by slug: `prisma.brand.findUnique({ where: { slug } })`
- notFound() if null
- `getFilteredProducts({ brandSlug: slug, sort, page, size, priceMin, priceMax, inStock })`
- `getFilterOptions()` — for sidebar/filter

**Layout:**
- Breadcrumbs: Domů / Značky / {brand.name}
- H1: brand.name (same heading style as category page)
- Subtitle: "{total} produktů"
- FilterBar (same as category page)
- Product grid: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4`
- Pagination

**Dynamic metadata:**
```typescript
export async function generateMetadata({ params }) {
  const brand = await prisma.brand.findUnique({ where: { slug } });
  return {
    title: `${brand.name} | Qsport.cz`,
    description: `Sportovní vybavení ${brand.name} na Qsport.cz`,
  };
}
```

## 3. Update Footer Links (OPTIONAL)

Footer already links to `/znacky` (line 51). No change needed.

## File Summary

| File | Action |
|------|--------|
| `src/app/(public)/znacky/page.tsx` | CREATE |
| `src/app/(public)/znacky/[slug]/page.tsx` | CREATE |

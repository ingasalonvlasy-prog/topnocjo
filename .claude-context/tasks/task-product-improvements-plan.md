# Plan: ProductCard & Product Detail Improvements

## Analysis: Current vs Mockup

### ProductCard — current state is close to mockup but missing:
1. **No second photo on hover** — mockup shows single photo, but modern e-shops swap to 2nd angle
2. **No size indicators** — no hint about available sizes
3. **No quick-add interaction** — card is just a link
4. **Hover effect** — currently only `hover:shadow`. Mockup cards appear clean with subtle lift

### Product Detail — current vs mockup differences:
1. **Metafield boxes missing** — mockup shows TLUMENI / DROP / POVRCH boxes below trust lines. Code has comment "only show when we have real metafield data" but no implementation
2. **bodyHtml rendering** — uses `prose prose-sm` (requires @tailwindcss/typography which may not be installed) + raw `dangerouslySetInnerHTML`. No sanitization, no custom styling
3. **Gallery not interactive** — thumbnails render but clicking doesn't change main image (server component, no state)
4. **Parametry tab** — only shows brand/type/sku. Very sparse — same data as the Popis tab footer

---

## Part A: ProductCard Improvements

### A1. Second photo on hover (EDIT ProductCard.tsx)

Add second image that appears on `group-hover`. Needs CSS transition.

```tsx
// After first Image, inside the aspect-[4/5] div:
{photos[1] && (
  <Image
    src={photos[1]}
    alt={product.name}
    fill
    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
    className="object-contain p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
    style={{ mixBlendMode: "multiply" }}
  />
)}
```

Both images stacked via `fill` (absolute). First image stays, second fades in on hover. No JS needed.

### A2. Available sizes hint (EDIT ProductCard.tsx)

Show available sizes below price as small text. Only when variant has `size` field.

```tsx
// After price div, inside the info section:
{availableSizes.length > 0 && (
  <div className="text-[11px] text-muted mt-1.5 truncate">
    {availableSizes.slice(0, 6).join(" · ")}{availableSizes.length > 6 ? " ..." : ""}
  </div>
)}
```

Where `availableSizes` is computed at top:
```tsx
const availableSizes = product.variants
  .filter(v => v.stock > 0 && v.size)
  .map(v => v.size!);
```

**Note:** ProductCard interface needs `size` and `title` in variants. Currently has `price`, `comparePrice`, `stock`. Need to add `size?: string | null; title: string`.

### A3. Quick-add button overlay (EDIT ProductCard.tsx)

On hover, show "Přidat do košíku" button at bottom of image area. Non-functional for now (košík is TASK-024).

```tsx
// Inside image div, after badges, after out-of-stock overlay:
{totalStock > 0 && (
  <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 z-10">
    <button
      className="w-full h-[40px] bg-navy text-white text-[11px] font-extrabold uppercase tracking-[0.08em] rounded-[var(--radius-pill)] hover:bg-navy/90 transition-colors"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      Přidat do košíku
    </button>
  </div>
)}
```

**Important:** `e.preventDefault()` + `e.stopPropagation()` prevents the parent `<Link>` from navigating.

### A4. Enhanced hover effect (EDIT ProductCard.tsx)

Current: `hover:shadow-[0_8px_24px_rgba(11,23,39,0.08)]`

Improve to add subtle lift:
```
hover:shadow-[0_8px_24px_rgba(11,23,39,0.08)] hover:-translate-y-1 transition-all duration-200
```

Already has `transition-all duration-200`, just add `hover:-translate-y-1`.

### A5. Variant interface update (EDIT ProductCard.tsx)

Update the `variants` type in `ProductCardProps`:
```typescript
variants: { price: number; comparePrice: number | null; stock: number; size?: string | null; title: string }[];
```

This is backwards compatible — `size` is optional.

---

## Part B: Product Detail Improvements

### B1. Interactive gallery (CREATE `src/components/ProductGallery.tsx`)

Extract gallery to client component for thumbnail click → main image swap.

```typescript
"use client";
interface ProductGalleryProps {
  photos: string[];
  productName: string;
  pastelBg: string;
  badges: React.ReactNode;
}
```

**State:** `activeIndex` (default 0). Click thumbnail → set activeIndex. Main image uses `photos[activeIndex]`.

**Transition:** Crossfade with `key={activeIndex}` or opacity toggle. Simple approach: just swap `src` — Image component handles loading.

**Thumbnail styling:** Active = `border-navy`, others = `border-line hover:border-muted`. Same as current but now clickable.

**Usage in page.tsx:** Replace the gallery div (lines 111-158) with:
```tsx
<ProductGallery
  photos={photos}
  productName={product.name}
  pastelBg={pastelBg}
  badges={<>{/* badge JSX */}</>}
/>
```

### B2. Metafield boxes (EDIT produkt/[slug]/page.tsx)

Mockup shows 3 boxes: TLUMENI, DROP, POVRCH — these are product-specific metafields. Since we don't have metafields in Prisma schema yet, parse from `tags` JSON or `bodyHtml`.

**Pragmatic approach:** Extract key specs from product description or bodyHtml using simple pattern matching. OR add a `specs` JSON field to Product model later.

**For now:** Show the boxes only if product has tags that match known spec keys. Since tags is JSON array of strings, we can't reliably extract structured data.

**Recommendation:** Skip metafield boxes for now. Add `specs` field to Product model when data import (TASK-021) happens — Shopify metafields can be mapped there. Add a comment placeholder in the code.

### B3. Better bodyHtml formatting (EDIT ProductTabs.tsx)

Current `prose prose-sm` class requires `@tailwindcss/typography`. Replace with custom inline styling that matches brand brief:

```tsx
<div
  className="text-[14px] leading-relaxed text-ink max-w-[700px]
    [&_h2]:text-[20px] [&_h2]:font-extrabold [&_h2]:text-navy [&_h2]:mt-8 [&_h2]:mb-3
    [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:text-navy [&_h3]:mt-6 [&_h3]:mb-2
    [&_p]:mb-4 [&_p]:text-ink
    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1
    [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1
    [&_li]:text-ink
    [&_a]:text-blue [&_a]:hover:underline
    [&_strong]:font-bold [&_strong]:text-navy
    [&_img]:rounded-[8px] [&_img]:my-4
    [&_table]:w-full [&_table]:text-[13px] [&_table]:border-collapse
    [&_th]:text-left [&_th]:font-bold [&_th]:text-navy [&_th]:py-2 [&_th]:border-b [&_th]:border-line
    [&_td]:py-2 [&_td]:border-b [&_td]:border-line"
  dangerouslySetInnerHTML={{ __html: bodyHtml }}
/>
```

Remove `prose prose-sm` classes entirely.

### B4. Richer Parametry tab (EDIT ProductTabs.tsx)

Currently only brand/type/sku. Add all available variant data as structured params.

Pass additional props to ProductTabs:
```typescript
// In page.tsx, add to ProductTabs props:
variants={product.variants}
tags={product.tags}
```

Update ProductTabs interface and Parametry tab:
```tsx
// Extract available sizes, colors, weight from variants
const sizes = [...new Set(variants.filter(v => v.size).map(v => v.size!))];
const colors = [...new Set(variants.filter(v => v.color).map(v => v.color!))];
const weight = variants[0]?.weight;

// Parse tags
const tagsList: string[] = JSON.parse(tags || "[]");
```

Parametry tab grid:
```
Značka          | {brand}
Typ             | {productType}
Velikosti       | 40, 41, 42, 42.5, 43, 44
Barvy           | Černá, Modrá
Hmotnost        | 280 g
SKU             | {sku}
Štítky          | tag1, tag2, tag3
```

Show rows only when data exists. Alternating row backgrounds (`even:bg-wash`) for readability.

### B5. Duplicate link in ProductTabs related (BUG FIX)

Line 104: `<Link>` wraps `<ProductCard>`, but ProductCard itself is a `<Link>`. Double nesting `<a>` inside `<a>` — invalid HTML.

**Fix:** Remove the outer `<Link>` wrapper:
```tsx
{relatedProducts.map((product) => (
  <ProductCard key={product.id} product={product} />
))}
```

ProductCard already links to `/produkt/{slug}`.

---

## File Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/ProductCard.tsx` | EDIT | Second photo hover, size hints, quick-add button, lift effect, variant interface |
| `src/components/ProductGallery.tsx` | CREATE | Interactive thumbnail gallery (client component) |
| `src/app/(public)/produkt/[slug]/page.tsx` | EDIT | Use ProductGallery, pass extra props to ProductTabs |
| `src/components/ProductTabs.tsx` | EDIT | Custom bodyHtml styling, richer Parametry tab, fix double link bug |

# P2: Kategorie grid asymetricky layout dle mockupu — Implementation Plan

**Task ID:** #5
**Status:** Ready for implementation
**File:** `src/app/(public)/page.tsx` (lines 177-223, category grid section)

---

## Problem

Current category grid uses generic `grid-cols-2 lg:grid-cols-3` with `row-span-2` on the first item. While structurally close, it doesn't precisely match the mockup layout.

## Mockup Layout (web-home.png)

The mockup shows a specific 3-column, 2-row asymmetric grid:

```
+------------------+----------+----------+
|                  |  Zima    | Obleceni |
|    Beh           |  (small) | (small)  |
|    (tall, 2rows) +----------+----------+
|                  |  Batohy  |  Bazar   |
|                  |  (small) | (small)  |
+------------------+----------+----------+
```

- **Beh**: tall tile, spans 2 rows, left column (~40% width)
- **Zima**: top-right row, ~30% width
- **Obleceni**: top-right, ~30% width  
- **Batohy**: bottom-right, ~30% width
- **Bazar**: bottom-right, ~30% width — has description text "Druha sance pro vybavu."

Each tile has:
- Category name (large heading, navy)
- "NAKUPOVAT >" link (small uppercase)
- Product photos or category icon on pastel background
- Rounded corners (10px)
- Category-specific pastel bg: Beh=mint, Zima=sky, Obleceni=peach, Batohy=lilac, Bazar=wash/white

## Current Code Analysis (lines 185-222)

```tsx
<div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
  {categories.slice(0, 5).map((cat, i) => {
    const isLarge = i === 0;
    return (
      <Link className={`${isLarge ? "row-span-2" : ""}`}>
        <div className={`${isLarge ? "aspect-square lg:aspect-auto lg:h-full min-h-[280px]" : "aspect-[4/3] min-h-[140px]"}`}>
```

**Issues:**
1. Uses dynamic category data (`categories.slice(0, 5)`) — depends on DB `position` order
2. Grid is `grid-cols-2 lg:grid-cols-3` which creates a 3-col layout but relies on row-span-2 to create asymmetry
3. Mobile: shows 2 columns — the tall "Beh" should still be prominent

## What Needs to Change

The current code actually handles the grid layout correctly with `row-span-2` on the first item. The main issues are:

### 1. Grid Template (minor fix)

Current: `grid-cols-2 lg:grid-cols-3`
This works but the proportions aren't ideal. The mockup shows the left column (Beh) being wider than the right columns.

**Fix:** Use explicit grid template columns:
```
lg:grid-cols-[1.2fr_1fr_1fr]
```

### 2. Tile Heights

Current: small tiles have `aspect-[4/3] min-h-[140px]`
Mockup: small tiles appear taller, roughly equal height to half the Beh tile.

**Fix:** Change small tile aspect to `aspect-[3/2]` or set explicit `min-h-[160px]`

### 3. Beh Tile Product Photos

Mockup shows actual product photos (shoes) inside the Beh tile. Current code shows category icon with `opacity-40`.

**Fix for now:** Keep category icons (no product-per-category data in DB). But increase icon size and reduce opacity for better visual impact.

### 4. Bazar Tile Description

Mockup shows "Druha sance pro vybavu." description text on the Bazar tile.

**Fix:** Add conditional description text for Bazar tile:
```tsx
{cat.slug === "bazar" && (
  <p className="text-[13px] text-navy/50 font-medium mt-1">
    Druha sance pro vybavu.
  </p>
)}
```

### 5. Category Order

The grid requires categories in this specific order: Beh, Zima, Obleceni, Batohy/Doplnky, Bazar.
Current code uses `categories.slice(0, 5)` which depends on DB `position` field.

**Fix:** Either:
a) Ensure DB categories have correct positions (1=Beh, 2=Zima, 3=Obleceni, 4=Doplnky, 5=Bazar)
b) Or hardcode the order in the component (more reliable):

```tsx
const categoryOrder = ["beh", "zima", "obleceni", "doplnky", "bazar"];
const orderedCategories = categoryOrder
  .map(slug => categories.find(c => c.slug === slug))
  .filter(Boolean);
```

### 6. Mobile Layout

Mockup mobile (web-mobil.png) doesn't show the category section in detail. On mobile:
- Stack to single column or 2-col
- Beh should still be prominent (full-width or larger)

Current `grid-cols-2` works for mobile. Add: first item spans full width on mobile.

```
grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]
```

With first item: `sm:col-span-2 lg:col-span-1 lg:row-span-2`

## Implementation — Exact Code Changes

### File: `src/app/(public)/page.tsx`

**Change 1 — Hardcoded category order (before the grid, ~line 185):**

Add before the grid div:
```tsx
const categoryOrder = ["beh", "zima", "obleceni", "doplnky", "bazar"];
const orderedCategories = categoryOrder
  .map(slug => categories.find(c => c.slug === slug))
  .filter((c): c is NonNullable<typeof c> => c != null);
```

**Change 2 — Grid template (line 185):**
```
OLD: <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
NEW: <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] gap-3 mt-6">
```

**Change 3 — Use orderedCategories instead of categories.slice:**
```
OLD: {categories.slice(0, 5).map((cat, i) => {
NEW: {orderedCategories.map((cat, i) => {
```

**Change 4 — First item mobile span:**
```
OLD: isLarge ? "row-span-2" : ""
NEW: isLarge ? "sm:col-span-2 lg:col-span-1 lg:row-span-2" : ""
```

**Change 5 — Small tile aspect ratio:**
```
OLD: "aspect-[4/3] min-h-[140px]"
NEW: "aspect-[3/2] min-h-[160px]"
```

**Change 6 — Bazar description (inside the tile content, after "Nakupovat" arrow):**
Add after the arrow div (around line 206):
```tsx
{cat.slug === "bazar" && (
  <p className="text-[13px] text-navy/50 font-medium mt-2 max-w-[140px]">
    Druha sance pro vybavu.
  </p>
)}
```

## Testing Checklist

- [ ] Grid shows 5 category tiles in correct order: Beh, Zima, Obleceni, Doplnky, Bazar
- [ ] Beh tile spans 2 rows on desktop (tall left column)
- [ ] Desktop: 3 columns with left column slightly wider
- [ ] Mobile: single column, Beh full-width and prominent
- [ ] Tablet (sm): 2 columns, Beh spans both columns
- [ ] Each tile has correct pastel background color
- [ ] Bazar tile shows "Druha sance pro vybavu." description
- [ ] All tiles link to correct category pages
- [ ] Icons render correctly
- [ ] Build passes

## Estimated Effort

~20 minutes

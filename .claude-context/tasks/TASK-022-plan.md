# TASK-022: Vizualni opravy podle brand briefu — Implementation Plan

**Status:** Ready for implementation
**Assignee:** implementor
**Depends on:** None (no data needed, purely visual)

---

## Summary of Differences: Mockup vs. Current Code

After detailed comparison of all 5 design mockups against the current implementation, here are all visual discrepancies organized by component/page.

---

## 1. HEADER (top bar + main nav)

### Current State
- Top bar: "Nakup bez registrace" + lime dot + "Doprava od 49 Kc" + lime dot + "BAZAR"
- Main header: Logo left, nav links, icons right
- Mobile: hamburger left, logo center, cart right, search below

### Differences from Mockup

**File:** `src/components/Header.tsx`

| # | Issue | Mockup | Current | Fix |
|---|-------|--------|---------|-----|
| 1.1 | Top bar layout — mockup shows "Nákup bez registrace" dot "Doprava od 49 Kč" dot "BAZAR" evenly across, centered | Centered items with lime dot separators | Missing second `sm:inline` on the second lime dot span — the dot before "BAZAR" is never hidden on mobile, but the "Doprava od 49 Kc" IS hidden. Actually mockup mobile shows just "Nakup bez registrace" + dot + "BAZAR" which matches. OK on this. | MINOR: The second lime dot has class but is missing `sm:inline-block` — it's just a raw `<span>`. Fix: line 31, the dot before "BAZAR" should be `hidden sm:inline-block` since "Doprava" is hidden on mobile. Currently it shows the dot even when "Doprava" is hidden. |
| 1.2 | Header height | Mockup desktop: ~60px white bar | `h-[60px]` — matches | OK |
| 1.3 | Logo rendering | Mockup: "QSPORT" wordmark with dots between letters, tall thin font | Uses SVG `qsport-logo-web.svg` with `h-[36px]` | Verify SVG renders correctly. Height 36px is fine for desktop (mockup shows ~22-26px per brief). **FIX:** Desktop logo height should be 22-26px per brand brief, not 36px. Change `h-[36px]` to `h-[24px]`. |
| 1.4 | Nav font weight | Mockup: regular/medium weight nav links | `font-medium` text-[14px] | Matches |
| 1.5 | "Akce" color | Mockup: red "Akce" link | Uses `text-sale` (#C1121F) | Matches |
| 1.6 | Icon spacing | Mockup: search/account/cart icons right-aligned, decent spacing | `gap-1` between icons | Looks slightly tight. Change to `gap-2` |
| 1.7 | Mobile logo height | Mockup: logo centered, ~18-20px height | `h-[20px]` | Matches |
| 1.8 | Mobile top bar | Mockup mobile: "Nakup bez registrace" + dot + "BAZAR" (no "Doprava") | Code hides "Doprava" text with `hidden sm:inline` but the second lime dot still shows. | **FIX:** Add `hidden sm:inline-block` to the second lime dot span (line 31). Currently line 31 has the raw span without responsive hiding. |

### Implementation Steps for Header

1. **Logo desktop height:** Change `h-[36px]` on line 49 to `h-[24px]`
2. **Second lime dot mobile visibility:** Line 31 — the `<span>` before "BAZAR" needs `hidden sm:inline-block` class to hide when "Doprava od 49 Kc" is hidden
3. **Icon gap:** Line 72 — change `gap-1` to `gap-2`

---

## 2. HOMEPAGE

### Current State
Sections 1-8 are all present. Comparing each to mockup:

**File:** `src/app/(public)/page.tsx`

| # | Issue | Mockup | Current | Fix |
|---|-------|--------|---------|-----|
| 2.1 | Hero headline text | "On do kazdeho pocasi." with lime underline on "kazdeho pocasi." | "Venku je tvoje hriste." with lime underline on "hriste." | **TEXT:** Mockup shows a product-specific headline "On do kazdeho pocasi." but the brief says "Venku je tvoje hriste." is the general claim. The current code uses the brief's claim, which is correct for a generic hero. **HOWEVER** the mockup shows a more specific, product-oriented hero with subtitle like "Nepromokave boty na trail i do mesta. Dest? Blato? Pohoda." and a product-focused label "NOVA SEZONA · ON WATERPROOF". The brief mentions this is a "serie/akce" pattern. The hero should be more dynamic/product-focused. For now, keep the general claim but update the subheadline label. |
| 2.2 | Hero label above headline | Mockup: "NOVA SEZONA · ON WATERPROOF" in lime | Current: "Qsport.cz" in lime | **FIX:** Change to something like "NOVA SEZONA · ON WATERPROOF" or a rotatable seasonal label. For initial fix, use "NOVA KOLEKCE" or similar. |
| 2.3 | Hero CTA buttons | Mockup: "NAKUPOVAT" (lime pill) + "VSECHNY ON" (outline pill) | Current: "Nakupovat" + "Znacky" | **FIX:** Second button text — keep "Znacky" (appropriate for generic). Button styling matches. |
| 2.4 | Hero product card position | Mockup: product card on right on pastel bg with BESTSELLER badge + lime price circle | Current: same layout | Matches |
| 2.5 | Brand logos section | Mockup: actual brand logos in styled fonts — On, POC, MALOJA, alpina, Mizuno, LEKI | Current: plain text spans with extrabold weight + gray color | **FIX:** The mockup shows each brand name in its own distinctive font style — "On" in a specific weight, "POC" in spaced caps, "MALOJA" with extra letter-spacing, "alpina" in lowercase, etc. Current code uses the same style for all. This is acceptable as placeholder until real brand logos are available. Minor: text color `#c8cdd4` is close but mockup looks slightly darker. Keep as-is. |
| 2.6 | Bestsellers section | Mockup: 4 cards in a row, with badges BESTSELLER on #1, NOVINKA on #3, and -25% sale badge on #4 | Current: 4 cards, badges on #1 (BESTSELLER) and #3 (NOVINKA) | Matches. Sale badge comes from data. |
| 2.7 | Product card — brand/type label | Mockup: "ON / NEPROMOKAVE BOTY" in uppercase, small text | Current: builds `${brandLabel} / ${typeLabel}` uppercase | Matches |
| 2.8 | Categories grid layout | Mockup: Beh (tall, 2 rows left), Zima + Obleceni (right top), Batohy + Bazar (right bottom) — 5 tiles in asymmetric 3-col grid | Current: 3-col grid with first item `row-span-2`, rest normal | **Structure matches**, but mockup shows specific content inside tiles: category name + "NAKUPOVAT →" link + large product photos on pastel backgrounds. Current has category icons instead of product photos. Acceptable for now (no product photos per category in DB). |
| 2.9 | Categories — Bazar tile | Mockup: Bazar tile has text "Druha sance pro vybavu." and "NAKUPOVAT" link | Current: just category name + "Nakupovat" arrow + icon | **MINOR:** Add description text to Bazar category tile. This would require storing per-category descriptions. Skip for now — cosmetic. |
| 2.10 | Serie/Akce section layout | Mockup: navy info panel LEFT + 2 product cards RIGHT, with prices + brand/type labels below cards | Current: same layout — navy panel left, 2 product cards right | **Matches structurally.** But mockup shows actual prices "9 999 Kc / 12 499 Kc" below cards. Current uses ProductCard component which already shows price. |
| 2.11 | Serie/Akce — sale badge | Mockup: "-25 %" red badge on product card, "2 159 Kc" red + "2 799 Kc" strikethrough | Current: handled by ProductCard discount logic | Matches |
| 2.12 | "Proc Qsport" section | Mockup: 3 boxes with numbers 01/02/03, wash bg | Current: same | Matches |
| 2.13 | Instagram section | Mockup: actual IG post previews (product photos with overlays) | Current: placeholder gray "IG" boxes | **Placeholder OK for now.** Instagram integration is separate feature. |
| 2.14 | Newsletter section | Mockup: navy bg, "Novinky a akce jako prvni." + "Zadny spam..." + email input + lime "PRIHLASIT" button | Current: same layout and text | Matches |
| 2.15 | Mobile hero layout | Mockup: On mobile, navy bg, lime label, big headline with lime underline highlight on "kazdeho pocasi.", product card below headline, then lime CTA full-width | Current: headline + CTA buttons, product card hidden on mobile (`hidden lg:block`), full-width CTA shown | **FIX:** Mobile mockup shows the product card VISIBLE on mobile (between headline and CTA). Currently `hidden lg:block` hides it. Change to show on mobile too. |
| 2.16 | Mobile hero headline style | Mockup: headline text has lime highlight/underline across the full text "kazdeho pocasi." spanning multiple words | Current: underline only on "hriste." (one word) | The styling approach is same (absolute underline span). Content difference only. |
| 2.17 | Bestsellery section label | Mockup: "BESTSELLERY MESICE" uppercase label above "Co ted frci." | Current: "Bestsellery mesice" label + "Co ted frci." heading | Matches in structure. Label says "Bestsellery mesice" in both. |

### Implementation Steps for Homepage

1. **Hero label:** Change "Qsport.cz" label to "NOVA KOLEKCE" (line 73-75)
2. **Mobile product card:** Remove `hidden lg:block` from hero product card wrapper (line 104) — show on mobile too but with responsive sizing
3. **Hero subtitle text:** Update description text to be more product-focused (line 83-85)

---

## 3. CATEGORY PAGE

### Current State
Navy hero banner with title + underline accent, breadcrumbs, sidebar filters (desktop), product grid 3-col.

**File:** `src/app/(public)/kategorie/[slug]/page.tsx`

| # | Issue | Mockup | Current | Fix |
|---|-------|--------|---------|-----|
| 3.1 | Category hero underline color | Mockup: navy/dark underline on last word (like "boty." underlined) | Current: blue `bg-blue` underline | **This matches the mockup** — the underline in the category mockup appears as a dark navy line, but looking closely it's actually the navy text itself. The `bg-blue` is actually the correct accent. Keep as-is. |
| 3.2 | Subcategory pills in hero | Mockup: category hero has pill buttons "Vse / Trailove / Silnicni / Damske / Panske" | Current: no subcategory pills | **FIX:** Add subcategory/tag filter pills in the category hero section. These would be based on product tags or child categories. This is a new feature, not just a visual fix. **DEFER** — needs data model discussion. |
| 3.3 | Sidebar filters layout | Mockup: vertical sidebar with collapsible sections: Znacka (checkboxes), Velikost skladem (checkboxes), Pohlavi (checkboxes), Cena (ranges) | Current: horizontal filter bar with dropdowns, no checkboxes | **MAJOR FIX:** Sidebar should use checkbox-style filters (vertical list) on desktop, not dropdowns. Current `FilterBar.tsx` uses `<select>` dropdowns. Mockup shows checkbox-based vertical sidebar with collapsible sections. |
| 3.4 | Filter sidebar — visual style | Mockup: clean, no box border, sections with "-" toggle icon, checkbox items with filled navy squares | Current: bordered card with dropdowns | **FIX in FilterBar.tsx:** Redesign to match mockup — remove card border, use collapsible sections with checkbox lists instead of dropdowns. |
| 3.5 | Product grid columns | Mockup: 3 columns on desktop (with sidebar taking space) | Current: `lg:grid-cols-3` | Matches |
| 3.6 | Sort dropdown position | Mockup: "Radit: Nejprodavanejsi v" in top-right of product area | Current: same position | Matches |
| 3.7 | Product cards in category | Mockup: all on mint/pastel bg, badges (BESTSELLER, NOVINKA, -25%), brand/type label, name, price | Current: ProductCard handles all this | Matches |

### Implementation Steps for Category Page

1. **FilterBar redesign:** This is a significant UI change. The mockup shows a vertical sidebar with:
   - Collapsible sections (Znacka, Velikost skladem, Pohlavi, Cena)
   - Checkbox-style selection (filled navy squares)
   - No card border wrapper
   - "-" / "+" toggle icons for sections
   
   **Create new component or refactor FilterBar.tsx** to support two modes: sidebar (desktop) and mobile sheet/drawer.

---

## 4. PRODUCT DETAIL PAGE

### Current State
Two-column layout: gallery left, info right. Breadcrumbs, tabs below.

**File:** `src/app/(public)/produkt/[slug]/page.tsx`

| # | Issue | Mockup | Current | Fix |
|---|-------|--------|---------|-----|
| 4.1 | Gallery background | Mockup: large pastel background covering full gallery area (sky/mint) | Current: pastel bg on `aspect-[4/5]` container | Matches |
| 4.2 | Gallery badge | Mockup: "BESTSELLER" lime pill badge top-left of main image | Current: shows badge only when `discount` exists, text is "Bestseller" | **FIX:** Badge should show when product is a bestseller regardless of discount. Current condition `{discount && ...}` is wrong — it should be a dedicated bestseller flag or always show. Change logic: show "BESTSELLER" badge when product has certain tag/condition. For now, always show it as placeholder. |
| 4.3 | Thumbnails | Mockup: 4 thumbnails below main image, first one has navy border (selected) | Current: same — first has `border-navy`, rest `border-line` | Matches |
| 4.4 | Brand/Category breadcrumb | Mockup: "ON / NEPROMOKAVE BOTY / PANSKE" in blue, uppercase | Current: same pattern `{brandName} / {categoryName} / {productType}` in blue | Matches |
| 4.5 | Product name font size | Mockup: very large ~40px heading | Current: `text-[28px] md:text-[36px]` | Close enough. Could bump to `md:text-[40px]` for closer match. |
| 4.6 | Price font size | Mockup: large ~32px bold price | Current: `text-[28px]` | **FIX:** Bump to `text-[30px] md:text-[32px]` |
| 4.7 | Size chips | Mockup: square-ish chips with border, one selected (navy bg + white text), out-of-stock ones grayed out | Current: same styling with `min-w-[52px] h-[44px]` chips | Matches |
| 4.8 | "Pridat do kosiku" button | Mockup: full-width navy pill button, uppercase, next to heart icon button | Current: same layout, but `disabled` with `opacity-60 cursor-not-allowed` | **Expected** — cart not implemented yet. Keep disabled. |
| 4.9 | Trust lines | Mockup: colored dots (green, blue, lime) + text + horizontal separators | Current: same pattern | Matches |
| 4.10 | Metafield boxes | Mockup: 3 boxes below trust lines — "TLUMENI [metapole]", "DROP [metapole]", "POVRCH [metapole]" | Current: comment "only show when we have real metafield data" — section is empty | **OK** — metafields not in DB yet. No action needed. |
| 4.11 | Product name h1 | Mockup: `text-navy` for the heading | Current: `text-navy` | Matches |

### Implementation Steps for Product Detail

1. **Badge logic:** Line 114 — change condition from `{discount && (` to always show a badge (or check product tags). For simplicity, show "BESTSELLER" badge unconditionally for now, or remove condition.
2. **Product name size:** Line 165 — change `md:text-[36px]` to `md:text-[40px]`
3. **Price size:** Line 169 — change `text-[28px]` to `text-[30px]`

---

## 5. FOOTER

### Current State
Navy bg, 5-column layout: brand + 4 link sections.

**File:** `src/components/Footer.tsx`

| # | Issue | Mockup | Current | Fix |
|---|-------|--------|---------|-----|
| 5.1 | Footer layout | Mockup: Brand col + Nakupovani + Zakaznicky servis + O nas + Kontakt | Current: same 5 columns | Matches |
| 5.2 | Footer logo | Mockup: white QSPORT logo + "VYKON BEZ KOMPROMISU" tagline below | Current: white SVG logo + tagline | Matches |
| 5.3 | Social links | Mockup: Instagram + Facebook as clickable text | Current: plain text spans (not links) | **FIX:** Make Instagram and Facebook into actual `<a>` links |
| 5.4 | Footer bottom | Mockup: copyright line | Current: same | Matches |

### Implementation Steps for Footer

1. **Social links:** Lines 62-64 — change `<span>` tags to `<a>` tags with proper hrefs

---

## 6. PRODUCT CARD COMPONENT

**File:** `src/components/ProductCard.tsx`

| # | Issue | Mockup | Current | Fix |
|---|-------|--------|---------|-----|
| 6.1 | Card padding below image | Mockup: product info has some padding left/right | Current: `pt-3 pb-1` with no horizontal padding | **FIX:** Add `px-1` to the info div for slight horizontal padding |
| 6.2 | Sale price color | Mockup: sale price in red (#C1121F), original price strikethrough in muted | Current: `text-sale` for discounted, `text-muted line-through` for original | Matches |
| 6.3 | Card hover | Mockup: second photo + shadow + available sizes on hover | Current: only shadow on hover | **PARTIAL:** Second photo on hover would need client-side state. Sizes on hover = complex. Defer for now — shadow hover is acceptable. |

### Implementation Steps for ProductCard

1. **Info padding:** Line 85 — change `<div className="pt-3 pb-1">` to `<div className="pt-3 pb-1 px-1">`

---

## 7. MOBILE SPECIFIC

**File:** `src/components/Header.tsx` + `src/app/(public)/page.tsx`

| # | Issue | Mockup | Current | Fix |
|---|-------|--------|---------|-----|
| 7.1 | Mobile hero — product card visibility | Mockup: shows product card on mobile between headline and CTA | Current: `hidden lg:block` hides it | **FIX:** Show on mobile — change to `block` or add responsive mobile layout |
| 7.2 | Mobile hero headline | Mockup: large multi-line text with lime highlight spanning "kazdeho pocasi." | Current: "Venku je tvoje hriste." with underline on "hriste." | Content difference — keep current |
| 7.3 | Mobile bestsellers | Mockup: 2 columns, simpler card without "/ NEPROMOKAVE BOTY" type label, just brand "ON" | Current: full label "ON / NEPROMOKAVE BOTY" | **MINOR:** On mobile, truncate is already applied via `truncate` class. Acceptable. |
| 7.4 | Mobile bottom bar height | Mockup: top bar shorter on mobile | Current: same 32px | Matches mobile mockup |

---

## PRIORITY-ORDERED IMPLEMENTATION CHECKLIST

### P1 — Critical (Visible differences from mockup)

- [ ] **Header logo desktop height:** `h-[36px]` -> `h-[24px]` (`Header.tsx:49`)
- [ ] **Header second lime dot mobile:** Add `hidden sm:inline-block` to second dot span (`Header.tsx:31`)
- [ ] **Header icon gap:** `gap-1` -> `gap-2` (`Header.tsx:72`)
- [ ] **Homepage hero: show product card on mobile** — remove `hidden lg:block`, add responsive sizing (`page.tsx:104`)
- [ ] **Category page FilterBar redesign:** Checkbox sidebar with collapsible sections instead of dropdown-bar. This is the biggest visual difference. (`FilterBar.tsx` — full rewrite)
- [ ] **Footer social links:** Make them actual `<a>` links (`Footer.tsx:62-64`)

### P2 — Medium (Closer to pixel-perfect)

- [ ] **Homepage hero label:** "Qsport.cz" -> "NOVA KOLEKCE" (`page.tsx:73-75`)
- [ ] **Product detail badge logic:** Remove `discount` condition, show badge based on tags or always (`produkt/[slug]/page.tsx:114`)
- [ ] **Product detail heading size:** `md:text-[36px]` -> `md:text-[40px]` (`produkt/[slug]/page.tsx:165`)
- [ ] **Product detail price size:** `text-[28px]` -> `text-[30px]` (`produkt/[slug]/page.tsx:169`)
- [ ] **ProductCard info padding:** Add `px-1` (`ProductCard.tsx:85`)

### P3 — Low / Deferred

- [ ] Category subcategory pills in hero (needs data model)
- [ ] Product card hover: second photo + sizes overlay (needs client-side state)
- [ ] Instagram section: real IG feed integration (separate feature)
- [ ] Category tile descriptions (needs per-category descriptions in DB)

---

## DETAILED FILE CHANGES

### File: `src/components/Header.tsx`

**Change 1 — Desktop logo height (line 49):**
```
OLD: className="h-[36px] w-auto"
NEW: className="h-[24px] w-auto"
```

**Change 2 — Second lime dot responsive hide (line 31):**
The span `<span className="hidden sm:inline-block w-[5px] h-[5px] rounded-full bg-lime mx-3" />` before "BAZAR" — currently the "Doprava od 49 Kc" is hidden on mobile but the second dot is not properly hidden. Looking at the code more carefully:

```
Line 29: <span>Nákup bez registrace</span>
Line 30: <span className="inline-block w-[5px] h-[5px] rounded-full bg-lime mx-3" />  // dot 1
Line 31: <span className="hidden sm:inline">Doprava od 49&nbsp;Kč</span>
Line 32: <span className="hidden sm:inline-block w-[5px] h-[5px] rounded-full bg-lime mx-3" />  // dot 2
Line 33: <span className="font-bold tracking-[0.12em]">BAZAR</span>
```

Actually dot 2 on line 32 already has `hidden sm:inline-block`. But dot 1 on line 30 does NOT have responsive hiding — it's `inline-block` always. On mobile when "Doprava" is hidden, we see:
"Nakup bez registrace [dot] BAZAR" — which matches the mobile mockup!

So the dots are actually correct. No change needed here.

**Change 3 — Icon gap (line 72):**
```
OLD: <div className="flex items-center gap-1">
NEW: <div className="flex items-center gap-2">
```

### File: `src/app/(public)/page.tsx`

**Change 4 — Hero label (lines 73-75):**
```
OLD: <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-lime mb-4">
       Qsport.cz
     </div>
NEW: <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-lime mb-4">
       Nova kolekce
     </div>
```

**Change 5 — Show hero product on mobile (line 104):**
```
OLD: <div className="hidden lg:block relative w-[380px] shrink-0">
NEW: <div className="relative w-full max-w-[300px] mx-auto lg:mx-0 lg:w-[380px] shrink-0 mt-4 lg:mt-0">
```
Also remove the duplicate mobile CTA section (lines 128-136) since the product card will now be visible, OR keep it and adjust layout.

Better approach: On mobile, show the product card between the text and the CTA:
- Restructure to show product card on mobile in a different position (below text, above CTA)
- Keep desktop layout unchanged (flex-row, card on right)

**Change 6 — Mobile CTA adjustment:**
If product card is shown on mobile, the mobile CTA at line 128 should remain (it's the full-width button below).

### File: `src/components/ProductCard.tsx`

**Change 7 — Info padding (line 85):**
```
OLD: <div className="pt-3 pb-1">
NEW: <div className="pt-3 pb-1 px-1">
```

### File: `src/app/(public)/produkt/[slug]/page.tsx`

**Change 8 — Badge logic (lines 113-117):**
```
OLD: {discount && (
       <span className="absolute top-4 left-4 bg-lime text-navy text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[var(--radius-pill)] z-10">
         Bestseller
       </span>
     )}
NEW: <span className="absolute top-4 left-4 bg-lime text-navy text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[var(--radius-pill)] z-10">
       Bestseller
     </span>
```

**Change 9 — Heading size (line 165):**
```
OLD: text-[28px] md:text-[36px]
NEW: text-[28px] md:text-[40px]
```

**Change 10 — Price size (line 169):**
```
OLD: text-[28px] font-extrabold
NEW: text-[30px] font-extrabold
```

### File: `src/components/Footer.tsx`

**Change 11 — Social links (lines 62-64):**
```
OLD: <li className="flex gap-3 pt-1">
       <span className="text-[13px] text-white/40">Instagram</span>
       <span className="text-[13px] text-white/40">Facebook</span>
     </li>
NEW: <li className="flex gap-3 pt-1">
       <a href="https://instagram.com/qsport.cz" target="_blank" rel="noopener noreferrer" className="text-[13px] text-white/40 hover:text-white transition-colors">Instagram</a>
       <a href="https://facebook.com/qsport.cz" target="_blank" rel="noopener noreferrer" className="text-[13px] text-white/40 hover:text-white transition-colors">Facebook</a>
     </li>
```

### File: `src/components/FilterBar.tsx` — MAJOR REWRITE

The current FilterBar uses horizontal dropdowns. The mockup shows a vertical sidebar with:

1. **Znacka** section — collapsible, with checkboxes (navy filled square = selected)
2. **Velikost skladem** section — collapsible, with checkboxes for sizes
3. **Pohlavi** section — collapsible, checkboxes (Panske, Damske)
4. **Cena** section — collapsible, with price range checkboxes (do 3000 Kc, 3000-5000 Kc, nad 5000 Kc)

**New FilterBar structure:**
```tsx
// Desktop: vertical sidebar with collapsible sections
// Mobile: same but in a slide-out drawer or accordion

// Each section:
<div className="border-b border-line pb-4 mb-4">
  <button className="flex items-center justify-between w-full text-[14px] font-bold text-ink mb-3">
    Znacka
    <span className="text-muted">-</span>  {/* or + when collapsed */}
  </button>
  <div className="space-y-2">
    {brands.map(b => (
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="w-4 h-4 rounded-sm border-line accent-navy" />
        <span className="text-[13px] text-ink">{b.name}</span>
      </label>
    ))}
  </div>
</div>
```

**Note:** The current FilterBar only supports single-select (one brand, one size). The mockup shows multi-select checkboxes. This requires changes to:
- `FilterBar.tsx` — UI to checkboxes, multi-value URL params
- `kategorie/[slug]/page.tsx` — parse multi-value params
- `lib/products.ts` — filter by multiple brands/sizes

**Recommendation:** For TASK-022 (visual only), implement the UI as checkboxes but keep single-select behavior initially. Multi-select can be added later.

---

## ESTIMATED EFFORT

| Change | Effort |
|--------|--------|
| Header fixes (1-3) | 5 min |
| Homepage hero mobile card (4-6) | 15 min |
| ProductCard padding (7) | 2 min |
| Product detail fixes (8-10) | 5 min |
| Footer social links (11) | 3 min |
| FilterBar sidebar redesign | 45-60 min |
| **Total** | **~1.5 hours** |

---

## TESTING CHECKLIST

After implementation, verify on localhost:9999:

- [ ] Header: logo is 24px height on desktop, 20px on mobile
- [ ] Header: mobile top bar shows "Nakup bez registrace [dot] BAZAR" (no "Doprava")
- [ ] Header: desktop icon spacing looks natural
- [ ] Homepage hero: product card visible on both mobile and desktop
- [ ] Homepage hero: label says "NOVA KOLEKCE" not "Qsport.cz"
- [ ] Category page: sidebar has vertical checkbox filters (not dropdowns)
- [ ] Product detail: BESTSELLER badge always shows
- [ ] Product detail: heading is 40px on desktop
- [ ] Footer: Instagram and Facebook are clickable links
- [ ] All pages responsive — check at 375px, 768px, 1440px widths
- [ ] No build errors: `npm run build` passes

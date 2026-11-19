# QA Report — Task #10 (Task #7 značky + Task #8 quick fixes)
**Datum:** 2026-11-18  
**Kontrolor:** kontrolor agent  
**Podrobný report:** viz `task-007-008-qa.md`

---

## Build

**PASS** — `npm run build`

```
✓ Compiled successfully in 735ms
✓ TypeScript — no errors (1.060s)
✓ Generating static pages (26/26) in 84ms
```

---

## Task #7 — Stránka značky `/znacky/[slug]/page.tsx`

| Bod | Stav |
|-----|------|
| `getFilterOptions(undefined, { brandSlug: slug })` — filtruje varianty/značky per brand | PASS |
| SortDropdown importován a použit | PASS |
| MobileFilterDrawer se `showSizeFilter` (skrývá mixed sizes) | PASS |
| Navy hero s breadcrumbs, h1, počtem produktů | PASS |
| `async generateMetadata` s openGraph | PASS |
| Počet produktů — `result.total`, není duplicitní výpočet | PASS |

---

## Task #8 — Quick fixes

| Soubor | Bod | Stav |
|--------|-----|------|
| Footer.tsx | Muži/Ženy/Děti → `/kategorie/*` (desktop + mobile) | PASS |
| Footer.tsx | `/kontakt` v sekci Zákaznický servis | PASS |
| Footer.tsx | `/cookies` v sekci O nás | PASS |
| Footer.tsx | `{new Date().getFullYear()}` dynamický rok | PASS |
| registrace/page.tsx | GDPR checkbox `required` + server-side validace | PASS |
| blog/[slug]/page.tsx | `sanitizeHtml(post.content)` před `dangerouslySetInnerHTML` | PASS |
| ProductTabs.tsx | `sanitizeHtml(bodyHtml)` na všech místech s HTML obsahem | PASS |
| sanitize.ts | `isomorphic-dompurify` wrapper — funguje SSR i CSR | PASS |
| hledat/page.tsx | async metadata (`Promise<Metadata>`), count bez duplicity | PASS |
| page.tsx | Seed-based shuffle (`daySeed`) řeší hydration mismatch | PASS |
| page.tsx | POC sekce — nový `pocProducts` query s `brand.slug = "poc"` | PASS |

---

## Minor notes (neblokující)

1. **Seed hash** (`page.tsx:168`) — `charCodeAt(0)` používá jen 1. znak ID. Většina cuid začíná na `c` → variabilita shufflu je omezená. Vizuální issue pouze.

2. **`categoryCounts`** (`page.tsx:61–86`) — `groupBy` query se počítá do `catCountMap` ale mapa se v JSX nepoužívá. Zbytečný DB query.

---

## Závěr

**APPROVED** — Task #7 i Task #8 správně implementovány. Build prochází bez chyb. Žádné regrese.

# Plán: TASK-038 — Hero → Search-first homepage

**Priorita:** 1 (uživatel to chce místo současného hero)
**Soubory k úpravě:**
- `src/app/(public)/page.tsx` (400 řádků) — homepage, hero sekce (řádky 70-144)
- `src/components/SearchAutocomplete.tsx` (430 řádků) — existující search, rozšířit pro hero

**Referenční soubory (READ ONLY):**
- `src/app/api/search/route.ts` (66 řádků) — search API
- `src/components/Header.tsx` — kde se SearchAutocomplete aktuálně používá
- `.claude-context/tasks/qsport-brand-brief.md` — brand konvence

---

## Motivace

Aktuální hero sekce (řádky 70-144 v page.tsx) zobrazuje:
- Navy pozadí s textem "On do každého počasí."
- Featured produkt (bestsellers[0]) na pastel bg s BESTSELLER badge a lime cenovkou
- Dva CTA tlačítka: "Nakupovat" + "Všechny On"

**Problém:** Hero závisí na fotce prvního bestselleru — pokud nemá fotky, vypadá prázdně. Navíc uživatel chce search-first přístup (jako Amazon/Google) místo klasického hero banneru.

---

## Cílový stav

Navy hero sekce s:
1. **Nadpis** — "Najdi svůj sport." (nebo podobný)
2. **Velký search input** — uprostřed, výrazný, s autocomplete
3. **Trending chipsy** pod searchem — "On boty", "POC helmy", "Maloja bundy", "Běžecké boty", "Zimní bundy", "Bazar"
4. **Volitelně:** počet produktů nebo krátký subheading

---

## Implementační kroky

### Krok 1: Nový hero v page.tsx (řádky 70-144)

Nahradit celou hero sekci (IIFE s `bestsellers[0]`) za search-first layout:

**Smazat:** Řádky 70-144 (celá hero IIFE + section)
**Nahradit za:**

```tsx
{/* 1. Hero — search-first */}
<section className="bg-navy text-white">
  <div className="max-w-[var(--container)] mx-auto px-6 py-14 lg:py-20 flex flex-col items-center text-center">
    {/* Subheading */}
    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-lime mb-4">
      {brands.length} značek · {categories.length} kategorií
    </div>

    {/* Main heading */}
    <h1 className="text-[36px] lg:text-[52px] font-extrabold leading-[1.05] tracking-[-0.04em] mb-8">
      Najdi svůj{" "}
      <span className="relative inline-block">
        sport.
        <span className="absolute bottom-[2px] left-0 w-full h-[5px] bg-lime rounded-full" />
      </span>
    </h1>

    {/* Search bar — hero variant */}
    <div className="w-full max-w-[600px] mb-6">
      <SearchHero />
    </div>

    {/* Trending chips */}
    <div className="flex flex-wrap justify-center gap-2">
      {[
        { label: "On boty", href: "/znacky/on" },
        { label: "POC helmy", href: "/znacky/poc" },
        { label: "Maloja bundy", href: "/znacky/maloja" },
        { label: "Běžecké boty", href: "/kategorie/beh" },
        { label: "Zimní vybavení", href: "/kategorie/zima" },
        { label: "Bazar", href: "/kategorie/bazar" },
      ].map((chip) => (
        <Link
          key={chip.href}
          href={chip.href}
          className="inline-flex items-center h-[32px] px-4 bg-white/10 text-white/80 text-[12px] font-bold rounded-full hover:bg-white/20 transition-colors"
        >
          {chip.label}
        </Link>
      ))}
    </div>
  </div>
</section>
```

**Poznámky k implementaci:**
- `brands.length` a `categories.length` jsou již dostupné z Promise.all query (řádek 42-66)
- `SearchHero` je nová varianta SearchAutocomplete (viz Krok 2)
- Trending chipsy jsou hardcoded — odpovídají hlavním značkám a kategoriím e-shopu
- Lime podtržení na "sport." konzistentní se stávajícím brand stylem

### Krok 2: SearchHero komponenta

Dvě možnosti:

**Varianta A (doporučená): Rozšířit SearchAutocomplete o `variant` prop**

**Soubor:** `src/components/SearchAutocomplete.tsx`

Přidat prop `variant?: "default" | "hero"`:

```tsx
export function SearchAutocomplete({
  placeholder = "Hledat produkty...",
  variant = "default",
}: {
  placeholder?: string;
  variant?: "default" | "hero";
}) {
```

Input styling podmínit variantou:

```tsx
// Řádek ~202 — input className:
className={
  variant === "hero"
    ? "w-full py-4 pl-12 pr-4 text-[16px] font-medium border-0 rounded-[var(--radius-pill)] bg-white text-ink shadow-lg focus:shadow-xl outline-none transition-all"
    : "w-full py-2.5 pl-10 pr-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-wash focus:bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all"
}
```

Lupa ikona — větší pro hero:

```tsx
// Řádek ~205 — svg:
<svg
  className={`absolute left-${variant === "hero" ? "4" : "3"} top-1/2 -translate-y-1/2 text-muted`}
  width={variant === "hero" ? 22 : 18}
  height={variant === "hero" ? 22 : 18}
  ...
/>
```

Dropdown positioning — hero varianta potřebuje větší z-index a může být širší:

```tsx
// Dropdown container (řádek ~226):
className={`absolute top-full left-0 right-0 mt-${variant === "hero" ? "2" : "1"} bg-white border border-line rounded-[var(--radius-card)] shadow-lg z-[60] overflow-hidden max-h-[420px] overflow-y-auto ${variant === "hero" ? "text-ink" : ""}`}
```

**V page.tsx použít:**

```tsx
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
...
<div className="w-full max-w-[600px] mb-6">
  <SearchAutocomplete
    variant="hero"
    placeholder="Hledej značku, produkt nebo kategorii..."
  />
</div>
```

**Varianta B: Separátní SearchHero wrapper**

Vytvořit thin wrapper, který importuje SearchAutocomplete s hero stylem. Zbytečné pokud stačí prop.

**Doporučení:** Varianta A — jeden props na existující komponentě.

---

### Krok 3: Autofocus na hero search (volitelné)

V SearchAutocomplete přidat `autoFocus` prop:

```tsx
export function SearchAutocomplete({
  placeholder = "Hledat produkty...",
  variant = "default",
  autoFocus = false,
}: {
  placeholder?: string;
  variant?: "default" | "hero";
  autoFocus?: boolean;
}) {
```

Na input přidat:
```tsx
autoFocus={autoFocus}
```

V page.tsx hero:
```tsx
<SearchAutocomplete variant="hero" placeholder="..." autoFocus />
```

**Pozn.:** autoFocus na mobilu může být otravný (otevře klávesnici). Zvážit `autoFocus` jen na desktop: implementovat přes `useEffect` + `matchMedia("(min-width: 1024px)")`.

---

### Krok 4: Trending/popular suggestions v dropdownu

Aktuálně `popularSuggestions` v SearchAutocomplete (řádek 63) obsahuje:
```tsx
const popularSuggestions = [
  { label: "Běžecké boty", href: "/kategorie/bezecke-boty" },
  { label: "Kopačky", href: "/kategorie/kopacky" },
  { label: "Oblečení", href: "/kategorie/obleceni" },
  { label: "Doplňky", href: "/kategorie/doplnky" },
];
```

Rozšířit o značky (zobrazují se když je query prázdný a uživatel klikne na input):

```tsx
const popularSuggestions = [
  { label: "On boty", href: "/znacky/on" },
  { label: "POC helmy", href: "/znacky/poc" },
  { label: "Maloja", href: "/znacky/maloja" },
  { label: "Běžecké boty", href: "/kategorie/beh" },
  { label: "Zimní vybavení", href: "/kategorie/zima" },
  { label: "Oblečení", href: "/kategorie/obleceni" },
];
```

---

### Krok 5: Cleanup — odstranit nepoužívaný hero kód

Po nahrazení hero sekce:

1. **Smazat** `categoryPastels` record (řádky 11-22) — POZOR: stále se používá v sekci 4 (kategorie grid, řádek 219). **NESMAZAT.**
2. **Smazat** import `formatPrice` pouze pokud se nepoužívá jinde na stránce — POZOR: nepoužívá se po smazání hero. Ale `getMinPrice` se taky nepoužívá. **SMAZAT oba importy** pokud hero je jediné místo.

Ověřit: `formatPrice` se používá v hero cenovce (řádek 136). Po smazání hero se nepoužívá na homepage.
`getMinPrice` se používá jen v hero (řádek 75). Po smazání hero se nepoužívá.

**Smazat z importů (řádek 5):**
```diff
- import { formatPrice, getMinPrice } from "@/lib/products";
+ import { formatPrice } from "@/lib/products";
```

Hmm, ale `formatPrice` se nepoužívá nikde jinde. Takže:
```diff
- import { formatPrice, getMinPrice } from "@/lib/products";
```

**ALE POZOR:** ProductCard interně formátuje ceny, takže stránka je nepotřebuje.

**Ověřit:** Prohledat zbytek page.tsx po `formatPrice` a `getMinPrice`:
- `formatPrice` — pouze v hero (řádek 136)
- `getMinPrice` — pouze v hero (řádek 75)

**Smazat import řádek 5:**
```diff
- import { formatPrice, getMinPrice } from "@/lib/products";
```

3. **Smazat** `categoryIcons` record (řádky 24-35) — používá se v sekci 4 (řádek 220). **NESMAZAT.**

4. Hero IIFE `bestsellers[0]` data — `bestsellers` query (řádky 55-64) se stále používá v sekci 3 (Bestsellery, řádek 192). **NESMAZAT query**, ale hero už nepotřebuje `bestsellers[0]`.

---

## Shrnutí změn

### Soubor: `src/app/(public)/page.tsx`

| Řádky | Akce | Detail |
|-------|------|--------|
| 5 | SMAZAT | `formatPrice, getMinPrice` import (nepoužívá se) |
| 70-144 | NAHRADIT | Hero IIFE → search-first layout (~30 řádků) |
| — | PŘIDAT | `import { SearchAutocomplete }` na začátek |

**Čistý efekt:** −75 řádků hero, +30 řádků search hero, −1 import řádek = **~45 řádků méně**

### Soubor: `src/components/SearchAutocomplete.tsx`

| Řádky | Akce | Detail |
|-------|------|--------|
| 63-68 | UPRAVIT | Rozšířit popularSuggestions o značky |
| 70 | UPRAVIT | Přidat `variant` + `autoFocus` props |
| ~202 | UPRAVIT | Input className podmíněný variantou |
| ~205-216 | UPRAVIT | Lupa SVG velikost podmíněná |

**Čistý efekt:** ~15 řádků nových/změněných

### Celkem: ~45 řádků změn ve 2 souborech

---

## Vizuální popis výsledku

```
┌─────────────────────────────────────────────────┐
│                  bg-navy                        │
│                                                 │
│      6 značek · 6 kategorií                     │  (lime, 11px uppercase)
│                                                 │
│         Najdi svůj sport.                       │  (52px white extrabold, lime underline)
│                                                 │
│   ┌─────────────────────────────────────┐       │
│   │ 🔍 Hledej značku, produkt nebo...  │       │  (white pill, 16px, shadow)
│   └─────────────────────────────────────┘       │
│                                                 │
│   [On boty] [POC helmy] [Maloja bundy]          │  (white/10 pills)
│   [Běžecké boty] [Zimní vybavení] [Bazar]       │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Závislosti
- `SearchAutocomplete` musí být client component ("use client") — na server component homepage se importuje jako client boundary, to je OK
- Search API `/api/search` zůstává beze změn
- Header search zůstává beze změn (používá `variant="default"` / bez prop)

---

## Rizika
- **autoFocus na mobilu** — může otevřít klávesnici automaticky, což je UX problém. Řešení: podmínit na `lg:` breakpoint přes useEffect
- **Dropdown pozice na hero** — dropdown padá pod hero do bílé sekce. Z-index 60 by měl stačit, ale ověřit vizuálně
- **SEO H1** — "Najdi svůj sport." je méně SEO-optimální než popis produktů. Ale homepage H1 nemusí být keyword-stuffed, hlavní SEO je na kategoriích

---

## Co se NEMĚNÍ:
- Search API (`/api/search/route.ts`)
- Header search (desktop toggle + mobile always-visible)
- Sekce 2-8 na homepage (značky, bestsellery, kategorie, série, proč, blog, IG, newsletter)
- SearchAutocomplete dropdown chování, recent searches, keyboard navigation

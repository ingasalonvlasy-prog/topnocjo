# QA Report — Task #1: Kategorie stránka — AboutYou logika filtrů a navigace

**Datum:** 2026-11-18  
**Kontrolor:** kontrolor agent

---

## 1. Build test

**VÝSLEDEK: PASS**

```
✓ Compiled successfully in 1183ms
✓ Running TypeScript — no errors
✓ Generating static pages (26/26)
```

Žádné TypeScript chyby, žádné build errory.

---

## 2. Reverzní kontrola — bod po bodu

### a) TypeScript bez chyb
PASS — build dokončen bez TS chyb.

---

### b) Na parent kategorii (Ženy) — NESMÍ být filtr velikostí

**Logika v `page.tsx`:**
```ts
const isParent = category.children.length > 0;
// ...
showSizeFilter={!isParent}
```

Pokud `category.children.length > 0` → `isParent = true` → `showSizeFilter = false`.

**HorizontalFilters (desktop):**
```ts
const showSize = showSizeFilter && sizeType !== "mixed" && sizeType !== null && sizes.length > 0;
// když showSizeFilter = false → showSize = false → size chip se nevykreslí
```

**MobileFilterDrawer → FilterBar:**
```ts
{showSizeFilter && sizes.length > 0 && (
  <Section title="Velikost skladem">
```
Totéž — `showSizeFilter = false` → sekce se nevykreslí.

**PASS** — parent kategorie (Ženy, Muži, Děti) nemají filtr velikostí.

---

### c) Na leaf kategorii (Dámské bundy) — velikosti SE zobrazí

Leaf kategorie nemá `children` → `isParent = false` → `showSizeFilter = true`.

`HorizontalFilters` vykreslí size chip pokud: `showSizeFilter=true && sizeType !== "mixed" && sizeType !== null && sizes.length > 0`.

`FilterBar` vykreslí velikosti pokud: `showSizeFilter=true && sizes.length > 0`.

**PASS** — leaf kategorie zobrazí filtr velikostí za podmínky, že produkty mají platné velikosti.

---

### d) Sidebar ukazuje kategorii strom, ne filtry

`CategorySidebar.tsx` renderuje pouze `<nav>` s `<Link>` položkami (parent + children). Žádné filtry, žádný FilterBar. Je vykreslen v `<aside className="hidden lg:block">`.

Sidebar je podmíněný: zobrazí se pouze pokud `childCats.length > 0` (tj. kategorie má podkategorie).

**PASS** — sidebar je čistá navigace po kategoriovém stromě.

---

### e) HorizontalFilters — jen jeden popover najednou

`HorizontalFilters` používá `useState<PopoverKey>(null)` kde `PopoverKey = "price" | "size" | "brand" | null`.

```ts
function togglePopover(key: PopoverKey) {
  setOpenPopover((prev) => (prev === key ? null : key));
}
```

Každý chip volá `togglePopover(key)` — toggle nastaví právě jeden klíč (nebo null). Pouze jeden popover může být open v daný moment.

Klik mimo kontejner (`mousedown` listener na `document`) zavře aktuální popover.

**PASS** — jen jeden popover najednou, správně implementováno.

---

### f) URL params beze změn

Používané parametry v `updateParams`:
- `znacka` — značka (string)
- `velikost` — velikost (string)
- `cena_od` / `cena_do` — cenové rozmezí (number jako string)
- `skladem` — "1" / smazat
- `strana` — stránkování (mazáno při každé změně filtru)

V `page.tsx` (server component) se čtou:
```ts
const brandSlug = (sp.znacka as string) || undefined;
const size = (sp.velikost as string) || undefined;
const priceMin = sp.cena_od ? Number(sp.cena_od) : undefined;
const priceMax = sp.cena_do ? Number(sp.cena_do) : undefined;
const inStock = sp.skladem === "1";
```

Parametry odpovídají zadání. Žádný nový parametr nebyl přidán.

**PASS** — URL params beze změn.

---

### g) Ostatní stránky (hledat, akce, znacky) beze změn

Změněné soubory dle zadání:
- `src/lib/filter-options.ts`
- `src/components/CategorySidebar.tsx` (nový)
- `src/components/HorizontalFilters.tsx` (nový)
- `src/app/(public)/kategorie/[slug]/page.tsx`
- `src/components/FilterBar.tsx` — přidán `showSizeFilter` prop s defaultem `true`
- `src/components/MobileFilterDrawer.tsx` — přidán `showSizeFilter` prop s defaultem `true`

`FilterBar` a `MobileFilterDrawer` mají `showSizeFilter = true` jako default — existující callsites (hledat, akce) které tento prop nepředávají budou fungovat beze změny (velikosti se zobrazí pokud jsou dostupné).

Ověřeno: build projde pro všechny stránky včetně `/hledat`, `/akce`, `/znacky/[slug]`.

**PASS** — ostatní stránky beze změn, zpětná kompatibilita zachována.

---

## 3. Simplify kontrola

**filter-options.ts:**
- `classifySizeType()` je čistá, bez duplikace s `isValidSize()`. Drobnost: logika `num >= 16 && num <= 52` je duplikována v obou funkcích — mohla by být extrahována, ale jde o 2 místa, akceptovatelné.
- `getFilterOptions()` korektně vrací `sizeType` v return objektu.

**CategorySidebar.tsx:**
- Čistý, minimalistický — pouze navigace, žádný state, žádná zbytečná logika. PASS.

**HorizontalFilters.tsx:**
- Duplicitní `priceRanges` konstanta existuje i v `FilterBar.tsx`. Mohla by být sdílena z jednoho místa (např. `lib/filter-options.ts`), ale jde o jednoduchou statickou konstantu. Minor, neblokující.

**page.tsx:**
- `isParent` je vypočten dvakrát (řádky 63 a 132). Druhý výpočet je uvnitř IIFE v JSX — zbytečná duplikace. Minor, nefunkční bug.
- `categoryIds` pro `getFilteredProducts` a `getFilterOptions` jsou počítány zvlášť (řádky 65-66 vs 81-82) se stejnou logikou. Drobná duplikace — mohlo by být `const categoryIds = isParent ? [...] : category.id` použito v obou voláních.

---

## 4. Nalezené issues

### MINOR — Duplicitní `isParent` v page.tsx

**Soubor:** `src/app/(public)/kategorie/[slug]/page.tsx`, řádky 63 a 132

```ts
// Řádek 63:
const isParent = category.children.length > 0;

// Řádek 132 (uvnitř IIFE v JSX):
const isParent = category.children.length > 0;
```

Druhá deklarace stíní první (block scope uvnitř IIFE). Funkčně správné, ale matoucí. Doporučení: smazat druhý `const isParent` a použít proměnnou z outer scope.

**Dopad:** Nulový — chování je identické. Čistě kosmetický problém.

### MINOR — Duplicitní `priceRanges` konstanta

Totožná konstanta existuje v `HorizontalFilters.tsx:7` i `FilterBar.tsx:13`. Pokud se změní cenové rozsahy, musí se změnit na dvou místech.

**Dopad:** Nulový v současnosti. Risk při budoucí úpravě.

---

## Celkový verdikt

| Oblast | Stav |
|--------|------|
| Build | PASS |
| TypeScript | PASS |
| Parent kategorie — bez filtru velikostí | PASS |
| Leaf kategorie — filtr velikostí zobrazen | PASS |
| Sidebar = kategorový strom, ne filtry | PASS |
| HorizontalFilters — 1 popover najednou | PASS |
| URL params beze změn | PASS |
| Ostatní stránky beze změn | PASS |
| Simplify | PASS (2 minor notes) |

**Task #1 je APPROVED.** Implementace je správná, build prochází, všechny požadavky splněny. Nalezeny 2 kosmetické issues (duplicitní `isParent`, duplicitní `priceRanges`) — neblokující.

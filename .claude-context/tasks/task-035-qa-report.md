# QA Report — Task #38: Redesign produktové karty
**Datum:** 2026-11-12  
**Kontrolor:** kontrolor agent  
**Verdict: PASS**

---

## Kontrolní body

### 1. `npm run build`

**PASS** — 0 chyb. Build proběhl úspěšně, `/produkt/[slug]` kompiluje.

Pozn.: V předchozím QA (Task #37) build selhal kvůli chybějící `category` prop v `ProductTabsProps`. Implementátor opravil — nyní PASS.

### 2. Feature Highlights strip — `produkt/[slug]/page.tsx`

**PASS** — sekce na řádku 231-285:

- Dynamicky sestavovaný `highlights[]` array
- **Značka** — vždy přítomna (`product.brand.name`)
- **Typ** — pouze pokud `product.productType` existuje ✓
- **Velikosti** — pouze pokud `hlSizes.length > 1`, zobrazuje rozsah `${first} – ${last}` ✓
- **Hmotnost** — pouze pokud `product.variants[0]?.weight` existuje ✓
- **Dostupnost** — vždy přítomna ✓
- Každý box má ikonu (SVG), label, value ✓

**Adaptivní grid** (graceful degradation):
```tsx
grid-cols-2
md:grid-cols-4  // highlights.length >= 4
md:grid-cols-3  // highlights.length === 3
md:grid-cols-2  // highlights.length < 3
```
✓ — grid se přizpůsobuje počtu boxů.

### 3. `ProductTabs.tsx` — `category` prop

**PASS:**
- `ProductTabsProps` interface obsahuje `category: string | null` (řádek 16) ✓
- Destrukturování funkce obsahuje `category` (řádek 66) ✓
- V Parametry tabu — `Obecné` skupina: `category ? [{ label: "Kategorie", value: category }] : []` ✓

### 4. Popis tab — detekce délky

**PASS:**
```ts
const isShortDescription = bodyHtml != null && bodyHtml.length < 300 && !bodyHtml.includes("<h");
```
- Krátký popis (< 300 znaků, žádný `<h` tag) → `<ShortDescriptionCard>` s ikonou a card stylem ✓
- Dlouhý popis → HTML render s plným typografickým stylováním ✓
- Žádný popis (`!hasDescription`) → fallback "Podrobný popis připravujeme." ✓
- Pouze `description` (bez `bodyHtml`) → `<ShortDescriptionCard bodyHtml={<p>${description}</p>}` ✓

### 5. Stará `dl/dd` sekce pod popisem — SMAZÁNA

**PASS** — `grep "<dl|<dd|<dt" src/app/(public)/produkt/` → 0 výskytů ✓

### 6. Parametry tab — `ParameterGroup` komponenta

**PASS:**
- Komponenta `ParameterGroup` v `ProductTabs.tsx:19-45`
- `if (params.length === 0) return null` — skupiny bez dat se nezobrazují ✓
- **3 skupiny:**

| Skupina | Podmínka zobrazení | Data |
|---------|-------------------|------|
| Obecné | vždy (má alespoň Značku) | Značka, Typ?, Kategorie? |
| Velikosti & varianty | `sizes.length > 0 \|\| colors.length > 0 \|\| weight` | Velikosti, Barvy, Hmotnost |
| Identifikace | `sku \|\| tagsList.length > 0` | SKU, Štítky |

✓

### 7. Skupiny bez dat — nezobrazují se

**PASS:**
- `ParameterGroup` → `if (params.length === 0) return null` (řádek 24) ✓
- Podmíněné renderování skupin Velikosti a Identifikace ✓

### 8. Graceful degradation — adaptivní grid

**PASS** — viz bod 2. Grid reaguje na `highlights.length`:
- `>= 4` → `md:grid-cols-4`
- `=== 3` → `md:grid-cols-3`
- `< 3` → `md:grid-cols-2`

---

## Souhrn

| Kontrolní bod | Stav |
|---------------|------|
| npm run build | PASS |
| Feature Highlights strip (5 typů boxů) | PASS |
| ProductTabs.tsx — category prop v interface | PASS |
| Popis tab: krátký → card, dlouhý → HTML, žádný → fallback | PASS |
| Stará dl/dd sekce smazána | PASS |
| ParameterGroup komponenta | PASS |
| 3 skupiny parametrů | PASS |
| Skupiny bez dat se nezobrazují | PASS |
| Adaptivní grid highlights | PASS |

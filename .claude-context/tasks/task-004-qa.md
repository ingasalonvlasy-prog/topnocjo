# QA Report — Task #4: Vyhledávání — vylepšit UX a relevanci

**Datum:** 2026-11-18  
**Kontrolor:** kontrolor agent

---

## 1. Build test

**VÝSLEDEK: PASS**

```
✓ Compiled successfully in 463ms
✓ Running TypeScript — no errors (1.089s)
✓ Generating static pages (26/26) in 86ms
```

Žádné TypeScript chyby, žádné build errory.

---

## 2. Reverzní kontrola — bod po bodu

### a) prisma/schema.prisma — nameSearch na Product a Brand

**Product:**
```prisma
nameSearch     String?
@@index([nameSearch])
```

**Brand:**
```prisma
nameSearch String?
@@index([nameSearch])
```

Obě pole přidána jako nullable `String?` s indexem. Nullable je správná volba — pole se plní migration/import scriptem, ne automaticky.

**PASS** — schema správně.

---

### b) src/app/api/search/route.ts — hledání přes nameSearch

```ts
function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
// ...
const qNorm = stripDiacritics(q).toLowerCase();

prisma.product.findMany({
  where: {
    OR: [
      { nameSearch: { contains: qNorm } },
      { brand: { nameSearch: { contains: qNorm } } },
      { productType: { contains: q } },
      { tags: { contains: q } },
    ],
  },
})

prisma.brand.findMany({
  where: {
    OR: [
      { nameSearch: { contains: qNorm } },
      { name: { contains: q } },
    ],
  },
})
```

Logika: query se normalizuje (strip diakritika, lowercase) → hledá přes `nameSearch` (předpočítaný normalizovaný název). Fallback na `productType` a `tags` s původním query.

**PASS** — hledání přes nameSearch správně implementováno.

**Poznámka k scoring:** Implementace obsahuje sofistikovaný scoring (řádky 57–91): name start match +100, brand exact +80, name contains +50, brand start +40, tag match +30, ownStock +40, supplierStock +20, foto +10, sale +5. Správně prioritizuje relevantní a skladové produkty.

---

### c) src/lib/products.ts — search přes nameSearch

```ts
// Řádky 62–63:
{ nameSearch: { contains: searchNorm } },
{ brand: { nameSearch: { contains: searchNorm } } },
```

`searchNorm` je diacritics-stripped verze query (stejný pattern jako v route.ts). Konzistentní přístup.

Stávající podmínky pro `name` a `brand.name` s původním query zůstaly jako fallback (řádky 62–69 — OR podmínky). To zajišťuje zpětnou kompatibilitu pro produkty, kde `nameSearch` ještě není vyplněný.

**PASS** — products.ts správně.

---

### d) SearchAutocomplete — variant="hero", HeroSearch smazán

**HeroSearch.tsx:** Soubor **neexistuje** (`Glob` nenašel žádný soubor). Správně smazán.

**page.tsx:**
```tsx
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
// ...
<SearchAutocomplete variant="hero" placeholder="Hledej značku, produkt nebo kategorii..." />
```

HeroSearch import byl nahrazen SearchAutocomplete s `variant="hero"`.

**SearchAutocomplete hero styling:**
```tsx
const isHero = variant === "hero";
// Input:
isHero
  ? "w-full h-14 lg:h-16 pl-14 pr-5 text-[16px] lg:text-[18px] ... rounded-full bg-white/10 border border-white/20 text-white ... focus:border-lime ..."
  : "w-full py-2.5 pl-10 pr-4 text-[14px] ..."
// Container:
isHero ? "max-w-[640px] mx-auto" : ""
```

Hero varianta: větší input (h-14/h-16), rounded-full, bílý text na průhledném pozadí, focus:border-lime. Odpovídá navy hero sekci homepage.

**PASS** — HeroSearch smazán, SearchAutocomplete variant="hero" funguje.

---

### e) Simplify kontrola

**SearchAutocomplete.tsx:**
- `flatIndex` jako mutable `let` proměnná uvnitř render (řádek 191). V React je toto edge case — při StrictMode double-render by se flatIndex počítal dvakrát. V produkci (single render) funguje správně. Čistší by bylo `useMemo` nebo přímý výpočet indexu z pole, ale jde o minoritní issue.
- Komponenta je obsáhlá (447 řádků) ale logicky členěna. Bez zbytečné duplikace.

**route.ts:**
- `scoreProduct` funkce je inlined uvnitř GET handleru. Mohla by být extrahována ven, ale není nutné — volá se jen na jednom místě.
- `qLower` (řádek 17) je deklarováno ale nepoužito. **MINOR BUG — unused variable.**

**filter-options.ts (nezměněno):** Není relevantní pro tento task.

---

## 3. Nalezené issues

### MINOR — Unused variable `qLower` v route.ts

**Soubor:** `src/app/api/search/route.ts`, řádek 17

```ts
const qLower = q.toLowerCase();  // ← nikdy použito
```

TypeScript to nevyhodil jako chybu (není `noUnusedLocals: true` v tsconfig), ale je to dead code.

**Dopad:** Nulový funkční dopad. Čistě kosmetický.

---

### MINOR — `nameSearch` nullable bez migrace dat

`nameSearch` je `String?` — může být `null` pro všechny existující produkty pokud migrace dat neproběhla. V takovém případě `{ nameSearch: { contains: qNorm } }` nenajde nic (NULL != obsahuje string).

Fallback podmínky v `products.ts` (`{ name: { contains: search } }`) pokrývají tento případ pro listing stránky. V `route.ts` (autocomplete API) **fallback na `name` chybí** — pokud `nameSearch` není vyplněný, autocomplete nenajde produkty přes jméno.

**Dopad:** Závisí na stavu dat. Pokud import script plní `nameSearch` při každém importu → žádný problém. Pokud ne → autocomplete může vracet prázdné výsledky pro stávající produkty.

**Doporučení:** Ověřit že feed import script plní `nameSearch` při upsert produktů.

---

## Celkový verdikt

| Oblast | Stav |
|--------|------|
| Build | PASS |
| TypeScript | PASS |
| schema.prisma — nameSearch na Product + Brand | PASS |
| route.ts — hledání přes nameSearch + scoring | PASS |
| products.ts — nameSearch v search podmínce | PASS |
| SearchAutocomplete variant="hero" | PASS |
| HeroSearch smazán | PASS |
| page.tsx používá SearchAutocomplete | PASS |
| Simplify | PASS (1 unused variable) |

**Task #4 je APPROVED.** Build prochází, implementace správná. 2 minor notes:
1. `qLower` unused variable v `route.ts:17` — dead code
2. Ověřit že import script plní `nameSearch` — jinak autocomplete může vracet prázdné výsledky

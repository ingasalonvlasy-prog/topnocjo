# QA Report — Task #3: Produkty bez fotek

**Datum:** 2026-11-18  
**Kontrolor:** kontrolor agent

---

## 1. Build test

**VÝSLEDEK: PASS**

```
✓ Compiled successfully in 665ms
✓ Running TypeScript — no errors
✓ Generating static pages (26/26)
```

Žádné TypeScript chyby, žádné build errory.

---

## 2. Kontrola filtru photos — správnost

### products.ts — `getFilteredProducts`

```ts
photos: { not: "[]" },
```

**Prisma schema:** `photos String @default("[]")`

Field `photos` je `String` — Prisma filter `{ not: "[]" }` vyloučí produkty kde `photos == "[]"` (prázdné JSON pole). Produkty s fotkami mají v poli neprázdné JSON pole (Shopify CDN URL), takže filtr je **správný**.

**Problém:** Filtr nevyloučí `null` ani prázdný string `""`. Pokud by nějaký produkt měl `photos = ""` nebo `photos = null`, prošel by filtrem ale bez fotek. 

Avšak schema má `@default("[]")` bez `?` — pole je NOT NULL, default `"[]"`. Takže `null` a `""` jsou krajní případy bez reálného výskytu při normálním importuní. **Nízké riziko, nynější stav je akceptovatelný.**

### page.tsx — `newest` query

```ts
photos: { contains: "shopify" },
```

Tato podmínka hledá jakýkoli string obsahující "shopify" — odpovídá Shopify CDN URL formátu (`cdn.shopify.com`). Produkty ze Shopify feedu mají URL ve formátu obsahujícím "shopify". **Správné.**

**ZÁVĚR:** Filtr správně odfiltruje produkty bez fotek. Produkty s 9173 Shopify CDN fotkami projdou oběma podmínkami.

---

## 3. Kontrola randomizace bestsellů

```ts
const shuffled = [...bestsellers].sort(() => Math.random() - 0.5);
const sorted = shuffled.sort((a, b) => {
  const aOwn = a.variants.some(v => v.ownStock > 0) ? 1 : 0;
  const bOwn = b.variants.some(v => v.ownStock > 0) ? 1 : 0;
  return bOwn - aOwn;
});
const seen = new Set<string>();
const picks = sorted.filter((p) => {
  if (seen.has(p.brand.slug)) return false;
  seen.add(p.brand.slug);
  return true;
}).slice(0, 4);
```

**Logika:**
1. Shuffle náhodně (60 produktů)
2. Přesortovat — vlastní sklad nahoru (ownStock > 0 = priorita)
3. Filtrovat 1 produkt na značku → max 4

**Problém — MINOR:** `sort((a, b) => bOwn - aOwn)` po shufflu je korektní (stable sort v JS). Ale `Math.random() - 0.5` je slabý shuffler (není uniformně náhodný). V praxi pro 60 produktů je variabilita dostatečná.

**Problém — LOGICKÝ:** Pokud jsou dostupné jen 1-3 různé značky z 60 produktů, `picks.length < 4` a doplňuje se z libovolných produktů (řádky 154-158). To je správně ošetřeno.

**ZÁVĚR: Logika je funkční.** Randomizace zajistí různé produkty při každém načtení. Prioritizace ownStock je správná (prodej z vlastního skladu = výhodnější).

---

## 4. Simplify kontrola

- `getFilteredProducts`: Filtr `photos: { not: "[]" }` je na správném místě v `where` bloku. Žádná zbytečná složitost.
- `page.tsx` bestseller blok: IIFE `{(() => {...})()}` je mírně složitý, ale funkční. Extrakce do helper funkce by zlepšila čitelnost, ale není nutná.
- Duplikace podmínky `photos: { contains: "shopify" }` ve dvou query (newest + bestsellers) — mohla by být extrahovaná do konstanty, ale jde o 2 místa, akceptovatelné.

---

## Celkový verdikt

| Oblast | Stav |
|--------|------|
| Build | PASS |
| Foto filtr products.ts | PASS |
| Foto filtr page.tsx | PASS |
| Randomizace bestsellů | PASS |
| Simplify | PASS (minor notes) |

**Task #3 je APPROVED. Implementace je správná a bezpečná.**

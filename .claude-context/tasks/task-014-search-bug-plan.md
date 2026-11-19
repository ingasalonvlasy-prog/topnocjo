# TASK #14: BUG-1 — Vyhledavani "beh" nenajde "Bezecke boty"

**Status:** Plan ready for implementation
**Priorita:** KRITICKA

---

## ROOT CAUSE

### Problem: `nameSearch` sloupec je NULL u vsech importovanych produktu a znacek

**Shopify import skript** (`scripts/import-shopify.ts:355-385`) NEVYPLNUJE `nameSearch`:
```ts
// Upsert product — chybi nameSearch!
create: {
  name: sp.title,
  slug,
  description,
  // ... nameSearch CHYBI
}
```

**Populate skript** (`scripts/populate-search-fields.ts`) existuje, ale **nebyl nikdy spusten** na produkci.

### Jak search funguje

**Dva search endpointy:**

1. **API autocomplete** (`src/app/api/search/route.ts:18-54`) — pouziva:
   ```ts
   OR: [
     { nameSearch: { contains: qNorm } },   // ← NULL, nikdy nematchne
     { name: { contains: q } },              // ← matchne jen presny text vcetne diakritiky
     { brand: { nameSearch: { contains: qNorm } } },  // ← NULL
     { brand: { name: { contains: q } } },
     { productType: { contains: q } },
     { tags: { contains: q } },
   ]
   ```

2. **Search results page** (`src/lib/products.ts:59-67`) — pouziva:
   ```ts
   OR: [
     { nameSearch: { contains: searchNorm } },  // ← NULL
     { brand: { nameSearch: { contains: searchNorm } } },  // ← NULL
     { productType: { contains: search } },
     { tags: { contains: search } },
   ]
   ```

### Proc "beh" nic nenajde:
- `nameSearch` je NULL → `{ nameSearch: { contains: "beh" } }` = **nikdy nematchne**
- `{ name: { contains: "beh" } }` — SQLite `LIKE '%beh%'` na "Běžecké boty" = **nematchne** (ruzny text — "beh" != "Běž")
- `{ name: { contains: "běh" } }` — SQLite `LIKE '%běh%'` na "Běžecké" — **nematchne** (mala "b" vs velke "B", a "ěž" vs "ěže")

Jediny zpusob jak diacritics-free search muze fungovat je pres `nameSearch` sloupec.

### Proc "bezecke" najde 48 vysledku:
- `{ name: { contains: "bezecke" } }` — SQLite `LIKE '%bezecke%'` — nematchne "Běžecké"
- Ale `{ tags: { contains: "bezecke" } }` MUZE matchnout pokud tagy obsahuji "bezecke"
- Nebo `{ productType: { contains: "bezecke" } }` matchne

### SQLite collation poznamka:
SQLite `LIKE` je case-insensitive POUZE pro ASCII znaky (A-Z). Pro Unicode znaky (ě, ž, č...) je case-SENSITIVE. To znamena ze ani `{ name: { contains: "Běh" } }` by nematchlo "běh" spolehlive.

---

## FIX PLAN

### Krok 1: Spustit populate skript na produkci (OKAMZITE — 5 min)

Skript `scripts/populate-search-fields.ts` uz existuje a je spravny. Staci ho spustit:

```bash
DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npx tsx scripts/populate-search-fields.ts
```

Tento skript:
- Projde vsechny produkty a nastavi `nameSearch = stripDiacritics(name).toLowerCase()`
- Projde vsechny znacky a nastavi `nameSearch = stripDiacritics(name).toLowerCase()`
- Priklad: "Běžecké boty Mizuno Wave" → "bezecke boty mizuno wave"

**Po spusteni:** "beh" matchne `nameSearch LIKE '%beh%'` na "bezecke boty mizuno wave" ✓

**Effort:** 0 min kodu, 5 min beh skriptu (~15k produktu × 1 update)

### Krok 2: Opravit Shopify import skript (prevence)

**Soubor:** `scripts/import-shopify.ts`

Pridat `nameSearch` do upsert:

```ts
// V importProduct(), radky 358 a 372:
update: {
  name: sp.title,
  nameSearch: sp.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
  // ...
},
create: {
  name: sp.title,
  nameSearch: sp.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
  // ...
}
```

Take pridat `nameSearch` do `getOrCreateBrand()`:
```ts
// V getOrCreateBrand(), brand upsert:
create: {
  name: vendor,
  nameSearch: vendor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
  slug,
},
update: {
  nameSearch: vendor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
}
```

**Effort:** 5 min

### Krok 3: Pridat `name` fallback do search results page (belt & suspenders)

**Soubor:** `src/lib/products.ts:59-67`

Aktualni search logika na results page NEMA fallback na `name`:
```ts
// BEFORE:
where.OR = [
  { nameSearch: { contains: searchNorm } },
  { brand: { nameSearch: { contains: searchNorm } } },
  { productType: { contains: search } },
  { tags: { contains: search } },
];

// AFTER:
where.OR = [
  { nameSearch: { contains: searchNorm } },
  { name: { contains: search } },
  { brand: { nameSearch: { contains: searchNorm } } },
  { brand: { name: { contains: search } } },
  { productType: { contains: search } },
  { tags: { contains: search } },
];
```

API autocomplete (`route.ts`) uz toto MA (radky 24, 26). Results page ne.

**Effort:** 2 min

### Krok 4: (OPTIONAL) Pridat category slug matching do search results

Aktualne: hledani "beh" najde kategorii "Běh" (slug "beh") v API autocomplete, ale results page nehledá v kategoriich. Uzivatel co hleda "beh" by mel videt produkty z kategorie "beh".

**Soubor:** `src/lib/products.ts:59-67`

Pridat:
```ts
// Po existujicich OR podminkach, pridat:
{ categories: { some: { category: { slug: { contains: searchNorm } } } } },
```

Toto by zajistilo ze "beh" najde vsechny produkty v kategorii s slugem "beh".

**Effort:** 5 min
**Riziko:** Muze vratit prilis hodne vysledku. Lze omezit jen na presne shody slugu.

---

## SOUBORY K IMPLEMENTACI

| Soubor | Akce | Krok | Popis |
|--------|------|------|-------|
| (spustit skript) | RUN | 1 | `npx tsx scripts/populate-search-fields.ts` na produkci |
| `scripts/import-shopify.ts` | EDIT | 2 | Pridat nameSearch do upsert (product + brand) |
| `src/lib/products.ts` | EDIT | 3 | Pridat `name` a `brand.name` fallback do search OR |
| `src/lib/products.ts` | EDIT | 4 | (optional) Pridat category slug matching |

---

## TESTING CHECKLIST

Po spusteni populate skriptu + oprav:
- [ ] `/hledat?q=beh` → najde bezecke produkty
- [ ] `/hledat?q=běh` → najde bezecke produkty
- [ ] `/hledat?q=bezecke` → najde bezecke boty (48+ vysledku)
- [ ] `/hledat?q=mizuno` → najde Mizuno produkty
- [ ] `/hledat?q=bunda` → najde bundy
- [ ] API autocomplete: "beh" → vraci produkty + kategorii "Běh"
- [ ] API autocomplete: "miz" → vraci Mizuno znacku + produkty

---

## PRIORITA IMPLEMENTACE

1. **Krok 1** (spustit populate) — OKAMZITY EFEKT, nulovy development
2. **Krok 3** (pridat name fallback) — 2 min fix, belt & suspenders
3. **Krok 2** (fix import skript) — prevence, aby se to neopakovalo
4. **Krok 4** (category slug match) — nice to have

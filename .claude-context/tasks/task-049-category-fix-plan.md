# TASK-049: Fix 78.8% produktu bez kategorie — smart collections mapping

## Problem

Import (TASK-046) stahl 15,142 produktu a 66 kategorii, ale vytvoril jen **3,881 product-category mappings** (25.7%). To znamena **~11,261 produktu (74.3%) nema zadnou kategorii**.

### Pricina

Import pouziva `GET /collects.json` pro mapovani produktu na kolekce. **Collects API pokryva POUZE custom collections.** Smart collections pouzivaji dynamicka pravidla (tag, vendor, product_type, title) — Shopify je nevystavuje pres collects endpoint.

### Aktualni data v DB

- **productType** — ulozeny z Shopify `product_type` pole (napr. "Beh", "Cyklistika", "Outdoor")
- **tags** — ulozeny jako JSON array z Shopify comma-separated tags
- **sourceId** — Shopify product ID pro zpetne dotazovani API

---

## Reseni: Strategie A — Products-per-Collection API (DOPORUCENE)

### Princip

Shopify REST API podporuje filtr `GET /admin/api/2024-01/products.json?collection_id={id}` ktery vraci produkty patrici do JAKEKOLI kolekce — vcetne smart collections. Shopify sam evaluuje pravidla a vraci finalni seznam.

### Postup

1. **Nacist vsechny smart collection IDs** z DB (kategorie importovane ze smart collections)
   - Alternativne: re-fetch z `GET /smart_collections.json` a matchnout pres slug na DB categories

2. **Pro kazdou smart collection**: `GET /products.json?collection_id={id}&fields=id&limit=250` s cursor pagination
   - Shopify vraci jen produkty co splnuji rules
   - Pouzit `fields=id` pro minimalni payload

3. **Matchnout Shopify product ID → DB product** pres `sourceId` pole

4. **Upsert ProductCategory** zaznamy

### Odhad API callu

- 66 kategorii, z toho ~40 smart collections (odhad)
- Prumerne ~300 produktu/smart collection → ~2 stranky/kolekce
- **~80-120 API callu** celkem (pri 250/page)
- Pri 2 req/sec → **~60-90 sekund**

### Vyhody

- Shopify sam evaluuje pravidla — 100% presnost
- Jednoducha implementace, zadne parsovani rules
- Pokryje i slozite rules (contains, starts_with, greater_than na cene, atd.)

### Nevyhody

- Vyzaduje API pristup (token musi byt stale platny)
- Trochu vice API callu nez offline parsovani

---

## Alternativa B: Offline rules matching (FALLBACK)

### Princip

Fetch smart collection rules z `GET /smart_collections.json` a vyhodnotit je lokalne proti dat v DB.

### Smart collection rule format

```json
{
  "rules": [
    {"column": "tag", "relation": "equals", "condition": "beh"},
    {"column": "type", "relation": "equals", "condition": "Beh"},
    {"column": "vendor", "relation": "equals", "condition": "Nike"}
  ],
  "disjunctive": false  // false = AND, true = OR
}
```

### Mapovani columns na DB pole

| Shopify column | DB pole | Poznamka |
|---|---|---|
| `tag` | `tags` (JSON array) | parse + contains check |
| `type` | `productType` | direct match |
| `vendor` | `brand.name` (pres JOIN) | need brand lookup |
| `title` | `name` | string match |
| `variant_price` | `variants.price` | numeric, pozor halere vs CZK |

### Relations (operatory)

| Relation | SQL ekvivalent |
|---|---|
| `equals` | `= condition` |
| `not_equals` | `!= condition` |
| `starts_with` | `LIKE 'condition%'` |
| `ends_with` | `LIKE '%condition'` |
| `contains` | `LIKE '%condition%'` |
| `not_contains` | `NOT LIKE '%condition%'` |
| `greater_than` | `> condition` (numeric) |
| `less_than` | `< condition` (numeric) |

### Nevyhody

- Slozitejsi implementace (kazdy column+relation combo)
- Muzou byt edge cases co Shopify resi jinak (case sensitivity, unicode normalizace)
- `variant_price` rule pouziva CZK (napr. "1000.00") ale v DB mame halere — nutna konverze

---

## Alternativa C: product_type → category mapping (DOPLNKOVE)

### Princip

Mnoge smart collections pouzivaji pravidlo `type equals X`. Pokud `product_type` mapuje 1:1 na kategorie, staci jednoduchy lookup.

### Postup

1. `SELECT DISTINCT productType FROM products WHERE productType IS NOT NULL`
2. Pro kazdy unikatni product_type najdi/vytvor odpovidajici kategorii
3. Bulk insert ProductCategory

### Omezeni

- Pokryje jen kolekce zalozene na `type` pravidle
- Nepokryje tag-based, vendor-based, title-based smart collections
- Nemapuje na existujici kategorie pokud se nazvy lisi

---

## DOPORUCENY IMPLEMENTATION PLAN

### Strategie: A (Products-per-Collection) jako primarni

### Novy skript: `scripts/fix-category-mapping.ts`

```
Phase 1: Identifikace smart collections
  - Fetch GET /smart_collections.json?limit=250 → list vsech smart collection IDs + handles
  - Pro kazdy handle najdi odpovidajici Category v DB pres slug match
  - Loguj: ktere smart collections maji Category match, ktere ne

Phase 2: Fetch products per smart collection
  - Pro kazdou smart collection s DB category:
    - GET /products.json?collection_id={shopify_id}&fields=id&limit=250
    - Cursor pagination az do konce
    - Rate limiting: 520ms between requests

Phase 3: Create mappings
  - Pro kazdy product ID z response:
    - Najdi Product v DB pres sourceId = String(shopify_product_id)
    - Upsert ProductCategory(productId, categoryId)
  - Skip pokud mapping uz existuje

Phase 4: Summary
  - Loguj: kolik novych mappings vytvoreno
  - Loguj: kolik produktu stale nema kategorii
  - Loguj: celkove pokryti pred vs po
```

### Technicky detail

```typescript
// Pseudocode struktury
async function main() {
  // 1. Fetch smart collections from Shopify
  const smartCollections = await fetchAllSmartCollections();
  
  // 2. Match to DB categories via slug
  for (const sc of smartCollections) {
    const slug = slugify(sc.handle);
    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) { log(`No DB category for ${sc.handle}`); continue; }
    
    // 3. Fetch products in this smart collection
    let url = `${BASE_URL}/products.json?collection_id=${sc.id}&fields=id&limit=250`;
    while (url) {
      const { data, nextLink } = await shopifyFetch(url);
      
      for (const product of data.products) {
        const dbProduct = await prisma.product.findFirst({
          where: { sourceId: String(product.id) },
          select: { id: true },
        });
        if (!dbProduct) continue;
        
        // 4. Upsert mapping
        await prisma.productCategory.upsert({
          where: { productId_categoryId: { productId: dbProduct.id, categoryId: category.id } },
          update: {},
          create: { productId: dbProduct.id, categoryId: category.id },
        });
      }
      url = nextLink;
    }
  }
}
```

### Sdileny kod s import-shopify.ts

Muze pouzit stejne utility:
- `shopifyFetch<T>()` — rate-limited fetch s Link header parsing
- `slugify()` — handle → slug konverze
- Prisma client setup (PrismaLibSql adapter)

Doporucuji NEREFAKTOROVAT — duplikovat utility do noveho skriptu (je to jednoucelovy fix skript).

### Runtime odhad

- ~40 smart collections × ~2 API callu = ~80 callu
- Pri 520ms rate limit → ~42 sekund na API
- DB upserts jsou rychle (SQLite, batched)
- **Celkem: ~60-90 sekund**

### Ocekavany vysledek

| Metrika | Pred | Po (odhad) |
|---|---|---|
| Produkty s kategorii | 3,881 (25.7%) | ~12,000-14,000 (80-92%) |
| ProductCategory zaznamy | 3,881 | ~15,000-20,000 |
| Produkty BEZ kategorie | ~11,261 | ~1,000-3,000 |

Pozn: Nektery produkt muze byt ve vice smart collections → vice kategorii na produkt. Nektery produkt nemusi byt v zadne kolekci (Shopify to dovoluje).

### Co NEDELA

- Nevytvari nove kategorie — pouziva existujici z importu
- Nemeni product data — jen pridava ProductCategory mappings
- Nemaze existujici mappings z custom collections

### Fallback pokud API token expiroval

Pokud Shopify token uz nefunguje, pouzit **Alternativu C** (product_type mapping) jako degraded fallback. To pokryje cca 50-70% smart collections (ty zalozene na type pravidle).

---

## Poradi implementace

1. **Spustit skript** `scripts/fix-category-mapping.ts`
2. **Verifikovat**: `SELECT COUNT(*) FROM product_categories` — melo by byt 15,000+
3. **Verifikovat**: `SELECT COUNT(*) FROM products WHERE id NOT IN (SELECT productId FROM product_categories)` — melo by byt pod 3,000
4. **Test**: Otevrit e-shop → `/kategorie/{slug}` → produkty se zobrazuji

## Rizika

- **Shopify token expirace** — token `EXPIRED...` muze byt casove omezeny. Otestovat pred implementaci.
- **Duplicitni mappings** — Upsert to resi, ale logovat pocet skipnutych
- **Velke smart collections** — Nektera kolekce muze mit tisice produktu → vice stran → vice API callu. Neni problem, jen trvaji dele.

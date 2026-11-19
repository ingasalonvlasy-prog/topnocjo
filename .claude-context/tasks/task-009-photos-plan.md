# TASK #9: Chybejici fotky — 915 produktu, plan doplneni

**Status:** Plan ready for implementation
**Priorita:** URGENTNI

---

## VYSLEDKY VYSETROVANI

### DB schema — photos column
**Soubor:** `prisma/schema.prisma:54`
```prisma
photos  String  @default("[]")
```
JSON array jako string. Produkty s fotkami maji format:
```json
["https://cdn.shopify.com/s/files/1/1089/7070/5235/files/xxx.jpg","https://cdn.shopify.com/..."]
```
Produkty bez fotek maji: `"[]"`

### Statistiky z DB
| Metrika | Hodnota |
|---------|---------|
| Aktivni produkty celkem | 10 138 |
| S fotkami (Shopify CDN) | 9 173 (90.5%) |
| Placeholder (placehold.co) | 50 (0.5%) |
| **Bez fotek** | **915 (9.0%)** |
| Z toho `level-` prefix (dodavatelske) | 911 |

### Top znacky bez fotek
| Znacka | Pocet |
|--------|-------|
| Mizuno | 615 |
| Leki | 136 |
| POC | 106 |
| Stance | 16 |
| Sporten | 13 |
| SWANS | 12 |
| Maloja | 12 |
| Ostatni (3) | 5 |

### Existujici import skripty
1. **`scripts/import-shopify.ts`** — Shopify REST API → Prisma. Importuje fotky z `sp.images[]` (radky 322-325). Funguje SPRAVNE — tech 915 produktu melo v Shopify prazdne `images: []`.

2. **`src/lib/feed/importer.ts`** — Feed importer. Aktualizuje POUZE `supplierStock`, `price`, `comparePrice`. **NEPODPORUJE fotky.**

3. **`src/lib/feed/types.ts`** — `FeedItem` interface NEMA pole pro fotky.

### Shopify API stav
- Store: `zt2xr1-ry.myshopify.com`
- Token: `(expired-removed)`
- **STATUS: EXPIRED/REVOKED** — API vraci `{"errors":"[API] Invalid API key or access token"}`

### Feed system stav
- Tabulka `suppliers`: **0 radku** — nikdy nakonfigurovano
- Tabulka `feed_import_logs`: **0 radku**
- Admin `/admin/dodavatele`: **neexistuje**

---

## PRICINA PROBLEMU

Techto 915 produktu bylo importovano ze Shopify BEZ obrazku — Shopify store je nemel. Import script fungoval korektne. Feed system existuje v kodu ale:
- Nebyl nikdy nakonfigurovan (0 dodavatelu)
- Nepodporuje fotky (FeedItem nema imageUrl)
- Importer neaktualizuje photos

---

## IMPLEMENTACNI PLAN

### Krok 1: OKAMZITE — Skryt produkty bez fotek

Deaktivovat 915 produktu aby se nezobrazovaly na webu (zakaznik nikdy nekoupi bez fotky).

**Skript:** `scripts/hide-no-photo-products.ts`
```ts
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  // Count before
  const before = await db.execute(
    "SELECT COUNT(*) as cnt FROM products WHERE status = 'ACTIVE' AND photos = '[]'"
  );
  console.log(`Products without photos (ACTIVE): ${before.rows[0].cnt}`);

  // Set to DRAFT
  const result = await db.execute(
    "UPDATE products SET status = 'DRAFT', updatedAt = datetime('now') WHERE status = 'ACTIVE' AND photos = '[]'"
  );
  console.log(`Updated to DRAFT: ${result.rowsAffected} products`);

  // Also fix 50 placeholder products
  const placeholders = await db.execute(
    "UPDATE products SET photos = '[]', status = 'DRAFT', updatedAt = datetime('now') WHERE status = 'ACTIVE' AND photos LIKE '%placehold.co%'"
  );
  console.log(`Placeholder products set to DRAFT: ${placeholders.rowsAffected}`);
}

main().catch(console.error);
```

**Effort:** 5 min

### Krok 2: Shopify re-pull (pokud novy token)

Pokud uzivatel poskytne novy Shopify API token, skript ktery pro 915 produktu stahne aktualni fotky.

**Skript:** `scripts/shopify-fetch-photos.ts`
```ts
import { createClient } from "@libsql/client";

const SHOPIFY_STORE = "zt2xr1-ry.myshopify.com";
const SHOPIFY_TOKEN = "NEW_TOKEN_HERE"; // uzivatel musi poskytnout
const API_VERSION = "2024-01";
const BASE = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}`;

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  // Get products without photos that have Shopify sourceId
  const products = await db.execute(
    "SELECT id, sourceId, name FROM products WHERE photos = '[]' AND sourceId IS NOT NULL AND sourceId != ''"
  );

  console.log(`Found ${products.rows.length} products without photos`);
  let updated = 0;
  let noImages = 0;

  for (const row of products.rows) {
    const sourceId = String(row.sourceId);
    // sourceId format: "shopify-{numeric_id}" or just numeric
    const shopifyId = sourceId.replace("shopify-", "").replace(/\D/g, "");
    if (!shopifyId) continue;

    // Rate limit: 2 req/sec
    await new Promise(r => setTimeout(r, 520));

    try {
      const res = await fetch(`${BASE}/products/${shopifyId}.json?fields=id,images`, {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_TOKEN,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 404) {
        console.log(`  [404] Product ${shopifyId} not found in Shopify`);
        continue;
      }
      if (!res.ok) {
        console.log(`  [${res.status}] Error for ${shopifyId}: ${await res.text()}`);
        continue;
      }

      const data = await res.json();
      const images = data.product?.images || [];

      if (images.length === 0) {
        noImages++;
        continue;
      }

      const photos = JSON.stringify(
        images
          .sort((a: any, b: any) => a.position - b.position)
          .map((img: any) => img.src)
      );

      await db.execute({
        sql: "UPDATE products SET photos = ?, status = 'ACTIVE', updatedAt = datetime('now') WHERE id = ?",
        args: [photos, String(row.id)],
      });

      updated++;
      console.log(`  [OK] ${row.name}: ${images.length} photos`);
    } catch (e) {
      console.error(`  [ERR] ${shopifyId}: ${e}`);
    }
  }

  console.log(`\nDone: ${updated} updated, ${noImages} still no images`);
}

main().catch(console.error);
```

**Effort:** 15 min + novy token
**Odhad behu:** ~8 min (915 produktu * 520ms rate limit)

### Krok 3: Rozsirit feed system o fotky (systemove reseni)

Pridat podporu fotek do feed importeru aby budouci feed importy automaticky doplnovaly fotky.

**Zmeny:**

#### 3a. `src/lib/feed/types.ts`
```ts
// Pridat do FeedFieldMapping:
imageUrl?: string;        // mapping pro URL fotky ve feedu
imageUrlSeparator?: string; // pokud feed ma vice URL v jednom poli (default ",")

// Pridat do FeedItem:
imageUrl?: string;  // URL hlavni fotky
imageUrls?: string[]; // pole vsech fotek
```

#### 3b. `src/lib/feed/parsers/xml.ts`, `csv.ts`, `json.ts`
Pridat parsovani `imageUrl` pole z feedu podle mappingu.

#### 3c. `src/lib/feed/importer.ts`
Pridat logiku: pokud produkt ma `photos = '[]'` a feed item ma `imageUrl`, aktualizovat photos:
```ts
// V importFeedItem():
if (item.imageUrl && existingProduct.photos === '[]') {
  const urls = item.imageUrls || [item.imageUrl];
  await prisma.product.update({
    where: { id: existingProduct.id },
    data: { photos: JSON.stringify(urls) },
  });
}
```

**Effort:** ~2 hodiny

---

## SOUBORY K IMPLEMENTACI

| Soubor | Akce | Krok | Popis |
|--------|------|------|-------|
| `scripts/hide-no-photo-products.ts` | NEW | 1 | Deaktivovat 915+50 produktu bez fotek |
| `scripts/shopify-fetch-photos.ts` | NEW | 2 | Re-pull fotek ze Shopify (vyzaduje novy token) |
| `src/lib/feed/types.ts` | EDIT | 3 | Pridat imageUrl do FeedItem + FeedFieldMapping |
| `src/lib/feed/parsers/xml.ts` | EDIT | 3 | Parsovat imageUrl |
| `src/lib/feed/parsers/csv.ts` | EDIT | 3 | Parsovat imageUrl |
| `src/lib/feed/parsers/json.ts` | EDIT | 3 | Parsovat imageUrl |
| `src/lib/feed/importer.ts` | EDIT | 3 | Aktualizovat photos pri importu |

---

## KLICOVE OTAZKY PRO UZIVATELE

1. **Ma pristup ke Shopify adminu?** Muze vygenerovat novy API token? (Krok 2)
2. **Kdo je dodavatel `level-` produktu?** Je to Levelek? Ma feed s URL fotek? (Krok 3)
3. **Ma se rovnou spustit Krok 1** (skryt produkty bez fotek)? Nebo pockat na fotky?

---

## POZNAMKA

Podrobnejsi vysetrovani vcetne DB queries a vsech technickych detailu je v `task-photos-investigation.md`.

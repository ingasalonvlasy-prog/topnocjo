# TASK-046: Shopify → Qsport Import Script — Detailní plán

## Přehled

Import kompletních dat ze Shopify store `zt2xr1-ry.myshopify.com` do naší Prisma/SQLite databáze.

| Entity | Shopify count | Naše tabulka | Poznámka |
|--------|--------------|--------------|----------|
| Products | 15 092 | `products` + `variants` | Vč. fotek, variant, HTML popisu |
| Custom Collections | 59 | `categories` | Shopify collections → naše kategorie |
| Customers | 15 651 | `users` | Email, adresa, telefon |
| Orders | 89 | `orders` + `order_items` | Vč. line items, adresy, status |
| Vendors | ~100-300 (odhad) | `brands` | Extrahováno z product.vendor |
| Collects | ~15 000 (odhad) | `product_categories` | Product↔Collection vazby |

---

## Architektura scriptu

### Soubor: `scripts/shopify-import.ts`

Spouštění: `npx tsx scripts/shopify-import.ts`

```
┌─────────────────────────────────────────┐
│           shopify-import.ts             │
│                                         │
│  1. Konfigurace + API client            │
│  2. FÁZE 1: Collections → Categories    │
│  3. FÁZE 2: Vendors → Brands            │  
│  4. FÁZE 3: Products + Variants         │
│  5. FÁZE 4: Collects → ProductCategory  │
│  6. FÁZE 5: Customers → Users           │
│  7. FÁZE 6: Orders → Orders+OrderItems  │
│  8. FÁZE 7: Ověření + statistiky        │
└─────────────────────────────────────────┘
```

### Klíčové principy

1. **Idempotentní** — lze spustit opakovaně, upsert místo insert
2. **Resumable** — ukládá progress do `scripts/.shopify-import-progress.json`
3. **sourceId tracking** — `Product.sourceId` = `"shopify-{shopify_id}"`, `Product.sourceHandle` = Shopify handle
4. **Transakční** — každý produkt v jedné Prisma transakci
5. **Rate-limited** — max 2 req/sec (Shopify limit), s exponential backoff

---

## API Konfigurace

```ts
const SHOPIFY_CONFIG = {
  store: "zt2xr1-ry.myshopify.com",
  token: "(expired-removed)",
  apiVersion: "2024-01",
  maxPerPage: 250,
  rateLimitMs: 520, // ~2 req/sec with safety margin
};

const BASE_URL = `https://${SHOPIFY_CONFIG.store}/admin/api/${SHOPIFY_CONFIG.apiVersion}`;

const headers = {
  "X-Shopify-Access-Token": SHOPIFY_CONFIG.token,
  "Content-Type": "application/json",
};
```

---

## Pagination strategie

Shopify REST API 2024-01 používá **cursor-based pagination** přes `Link` header.

```ts
async function* fetchAllPages<T>(endpoint: string, key: string): AsyncGenerator<T[]> {
  let url = `${BASE_URL}/${endpoint}?limit=250`;
  
  while (url) {
    await rateLimitDelay();
    const response = await fetch(url, { headers });
    
    if (response.status === 429) {
      // Rate limited — wait and retry
      const retryAfter = parseFloat(response.headers.get("Retry-After") || "2");
      console.log(`Rate limited, waiting ${retryAfter}s...`);
      await sleep(retryAfter * 1000);
      continue;
    }
    
    if (!response.ok) {
      throw new Error(`Shopify API error ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    yield data[key] as T[];
    
    // Parse Link header for next page
    const linkHeader = response.headers.get("Link") || "";
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : "";
  }
}
```

### Rate limiting

```ts
let lastRequestTime = 0;

async function rateLimitDelay() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < SHOPIFY_CONFIG.rateLimitMs) {
    await sleep(SHOPIFY_CONFIG.rateLimitMs - elapsed);
  }
  lastRequestTime = Date.now();
}
```

### Počet API volání (odhad)

| Endpoint | Items | Pages (250/page) | Requests |
|----------|-------|-------------------|----------|
| custom_collections | 59 | 1 | 1 |
| products | 15 092 | 61 | 61 |
| collects | ~15 000 | 60 | 60 |
| customers | 15 651 | 63 | 63 |
| orders | 89 | 1 | 1 |
| **Celkem** | | | **~186** |

Při 2 req/sec → **~93 sekund** čistý API čas. S DB operacemi celkový čas **~5-10 minut**.

---

## FÁZE 1: Collections → Categories

### Shopify Custom Collection → naše Category

| Shopify field | Naše field | Transformace |
|---------------|------------|-------------|
| `id` | — | Uložit do mapy `collectionIdToCategoryId` |
| `title` | `name` | Přímo |
| `handle` | `slug` | Přímo (Shopify handle = slug) |
| `body_html` | `seoDesc` | Strip HTML tags, truncate na 160 znaků |
| `image.src` | `image` | URL jako string |
| `sort_order` | `position` | Pořadí podle `published_at` nebo abecedně |
| `published_at` | — | Skip pokud null (unpublished) |

```ts
interface ShopifyCollection {
  id: number;
  title: string;
  handle: string;
  body_html: string | null;
  image: { src: string } | null;
  sort_order: string;
  published_at: string | null;
}

async function importCollections(): Promise<Map<number, string>> {
  const collectionMap = new Map<number, string>(); // shopifyId → categoryId
  
  for await (const collections of fetchAllPages<ShopifyCollection>("custom_collections.json", "custom_collections")) {
    for (const c of collections) {
      const category = await prisma.category.upsert({
        where: { slug: c.handle },
        create: {
          name: c.title,
          slug: c.handle,
          seoTitle: c.title,
          seoDesc: stripHtml(c.body_html || "").slice(0, 160) || null,
          image: c.image?.src || null,
          position: 0,
        },
        update: {
          name: c.title,
          seoDesc: stripHtml(c.body_html || "").slice(0, 160) || null,
          image: c.image?.src || null,
        },
      });
      collectionMap.set(c.id, category.id);
    }
  }
  
  // Přiřadit pozice abecedně
  const allCats = await prisma.category.findMany({ orderBy: { name: "asc" } });
  for (let i = 0; i < allCats.length; i++) {
    await prisma.category.update({ where: { id: allCats[i].id }, data: { position: i } });
  }
  
  return collectionMap;
}
```

### Hierarchie kategorií

Shopify custom collections NEMAJÍ parent/child hierarchii. Všechny budou importovány jako top-level kategorie (`parentId: null`). Případnou hierarchii lze nastavit ručně v adminu po importu.

**POZNÁMKA:** Pokud `handle` kolize s existující kategorií (z feedů), kategorie se UPDATE (ne duplikuje).

---

## FÁZE 2: Vendors → Brands

Shopify nemá samostatný model pro vendory — `vendor` je jen string field na produktu. Musíme je extrahovat z produktů.

```ts
async function importBrands(products: ShopifyProduct[]): Promise<Map<string, string>> {
  const brandMap = new Map<string, string>(); // vendorName → brandId
  const uniqueVendors = [...new Set(products.map(p => p.vendor).filter(Boolean))];
  
  for (const vendor of uniqueVendors) {
    const slug = slugify(vendor);
    if (!slug) continue;
    
    const brand = await prisma.brand.upsert({
      where: { slug },
      create: { name: vendor, slug },
      update: { name: vendor },
    });
    brandMap.set(vendor, brand.id);
  }
  
  return brandMap;
}
```

**DŮLEŽITÉ:** 
- Pokud `vendor` je prázdný string → použít fallback brand "Ostatní" / "other"
- Slugify musí být identická funkce jako v adminu (NFD normalizace, remove diacritics)

---

## FÁZE 3: Products + Variants

### Shopify Product → naše Product + Variant

| Shopify field | Naše field | Transformace |
|---------------|------------|-------------|
| `id` | `sourceId` | `"shopify-{id}"` |
| `handle` | `sourceHandle` | Přímo |
| `handle` | `slug` | Přímo (ověřit unikátnost) |
| `title` | `name` | Přímo |
| `body_html` | `bodyHtml` | Přímo (raw HTML) |
| `body_html` | `description` | Strip HTML → plain text, truncate 300 chars |
| `vendor` | `brandId` | Lookup v brandMap |
| `product_type` | `productType` | Přímo |
| `tags` | `tags` | Comma-separated → JSON array `'["tag1","tag2"]'` |
| `status` | `status` | `active→ACTIVE`, `draft→DRAFT`, `archived→ARCHIVED` |
| `images[].src` | `photos` | JSON array URL stringů `'["url1","url2"]'` |
| `created_at` | `createdAt` | ISO parse |
| now | `importedAt` | `new Date()` |

### Shopify Variant → naše Variant

| Shopify field | Naše field | Transformace |
|---------------|------------|-------------|
| `id` | — | Jen pro tracking |
| `sku` | `sku` | Přímo (pokud non-empty, jinak `null`) |
| `title` | `title` | Přímo |
| `option1` | `size` nebo `color` | Závisí na option name (viz níže) |
| `option2` | `size` nebo `color` | Závisí na option name |
| `price` | `price` | `Math.round(parseFloat(price) * 100)` → haléře! |
| `compare_at_price` | `comparePrice` | `Math.round(parseFloat(cap) * 100)` nebo null |
| `inventory_quantity` | `supplierStock` | `Math.max(0, quantity)` |
| `weight` | `weight` | `Math.round(weight * 1000)` pokud kg→g |
| `barcode` | `barcode` | Přímo |
| `position` | `position` | Přímo |
| — | `ownStock` | `0` (všechno jde do supplierStock) |
| — | `active` | `true` |

### Mapování option1/option2 → size/color

Shopify varianty mají `option1`, `option2`, `option3` bez pevného významu. Název opce je v `product.options`:

```ts
function mapVariantOptions(
  product: ShopifyProduct,
  variant: ShopifyVariant
): { size: string | null; color: string | null } {
  let size: string | null = null;
  let color: string | null = null;
  
  for (const option of product.options) {
    const value = variant[`option${option.position}` as keyof ShopifyVariant] as string | null;
    if (!value || value === "Default Title") continue;
    
    const nameLower = option.name.toLowerCase();
    if (nameLower.includes("size") || nameLower.includes("velik") || nameLower.includes("rozm")) {
      size = value;
    } else if (nameLower.includes("color") || nameLower.includes("barv") || nameLower.includes("colour")) {
      color = value;
    } else if (!size) {
      // Fallback: first unknown option → size
      size = value;
    } else if (!color) {
      // Second unknown option → color
      color = value;
    }
  }
  
  return { size, color };
}
```

### Import logika (jeden produkt)

```ts
async function importProduct(
  p: ShopifyProduct,
  brandMap: Map<string, string>,
  fallbackBrandId: string,
): Promise<void> {
  const brandId = brandMap.get(p.vendor) || fallbackBrandId;
  const sourceId = `shopify-${p.id}`;
  
  // Slug unikátnost
  let slug = p.handle;
  const existingBySlug = await prisma.product.findUnique({ where: { slug } });
  if (existingBySlug && existingBySlug.sourceId !== sourceId) {
    slug = `${slug}-shopify`;
  }
  
  // Tags: "tag1, tag2, tag3" → '["tag1","tag2","tag3"]'
  const tags = p.tags
    ? JSON.stringify(p.tags.split(",").map(t => t.trim()).filter(Boolean))
    : "[]";
  
  // Photos: images array → JSON array of src URLs
  const photos = JSON.stringify(
    (p.images || [])
      .sort((a, b) => a.position - b.position)
      .map(img => img.src)
  );
  
  // Status mapping
  const statusMap: Record<string, string> = {
    active: "ACTIVE",
    draft: "DRAFT",
    archived: "ARCHIVED",
  };
  
  // Upsert product
  const product = await prisma.product.upsert({
    where: { sourceId },
    create: {
      name: p.title,
      slug,
      description: stripHtml(p.body_html || "").slice(0, 300) || null,
      bodyHtml: p.body_html || null,
      brandId,
      productType: p.product_type || null,
      tags,
      photos,
      status: statusMap[p.status] || "DRAFT",
      sourceId,
      sourceHandle: p.handle,
      importedAt: new Date(),
    },
    update: {
      name: p.title,
      description: stripHtml(p.body_html || "").slice(0, 300) || null,
      bodyHtml: p.body_html || null,
      brandId,
      productType: p.product_type || null,
      tags,
      photos,
      status: statusMap[p.status] || "DRAFT",
      sourceHandle: p.handle,
      importedAt: new Date(),
    },
  });
  
  // Delete existing variants for this product (fresh import)
  await prisma.variant.deleteMany({ where: { productId: product.id } });
  
  // Import variants
  for (const v of p.variants) {
    const { size, color } = mapVariantOptions(p, v);
    const sku = v.sku?.trim() || null;
    
    await prisma.variant.create({
      data: {
        productId: product.id,
        sku,
        title: v.title === "Default Title" ? p.title : v.title,
        size,
        color,
        price: Math.round(parseFloat(v.price) * 100),
        comparePrice: v.compare_at_price
          ? Math.round(parseFloat(v.compare_at_price) * 100)
          : null,
        supplierStock: Math.max(0, v.inventory_quantity || 0),
        ownStock: 0,
        weight: v.weight ? Math.round(v.weight * 1000) : null, // kg → g
        barcode: v.barcode || null,
        position: v.position,
        active: true,
      },
    });
  }
}
```

### Upsert klíč: `sourceId` (unikátní)

**PROBLÉM:** Prisma schema nemá `@unique` na `sourceId`. Musíme přidat:

```prisma
// V schema.prisma — Product model:
sourceId    String?   @unique
```

→ Přidat migraci: `npx prisma migrate dev --name add-sourceId-unique`

**Alternativa bez migrace:** Použít `findFirst({ where: { sourceId } })` + create/update.

### SKU duplicity

Shopify může mít SKU duplicity (stejné SKU na různých produktech). Naše schema má `sku @unique` na Variant. Řešení:

```ts
// Pokud SKU existuje u jiného produktu, přidat suffix
if (sku) {
  const existingSku = await prisma.variant.findUnique({ where: { sku } });
  if (existingSku && existingSku.productId !== product.id) {
    sku = `${sku}-${p.id}`;
  }
}
```

### Batch processing

15 092 produktů = 61 stránek po 250. Pro každou stránku:

```ts
async function importAllProducts(brandMap: Map<string, string>, fallbackBrandId: string) {
  let count = 0;
  
  for await (const products of fetchAllPages<ShopifyProduct>("products.json", "products")) {
    for (const product of products) {
      try {
        await importProduct(product, brandMap, fallbackBrandId);
        count++;
        if (count % 100 === 0) {
          console.log(`Imported ${count} products...`);
          saveProgress({ products: count });
        }
      } catch (e) {
        console.error(`Failed to import product ${product.id} (${product.title}): ${e}`);
        logError("product", product.id, (e as Error).message);
      }
    }
  }
  
  console.log(`Total products imported: ${count}`);
}
```

---

## FÁZE 4: Collects → ProductCategory

Shopify `Collect` propojuje product s collection. Jeden produkt může být ve více kolekcích.

```ts
async function importCollects(collectionMap: Map<number, string>) {
  // Nejdřív načíst mapu shopifyProductId → internalProductId
  const productMap = new Map<string, string>(); // "shopify-{id}" → productId
  const allProducts = await prisma.product.findMany({
    where: { sourceId: { startsWith: "shopify-" } },
    select: { id: true, sourceId: true },
  });
  for (const p of allProducts) {
    if (p.sourceId) productMap.set(p.sourceId, p.id);
  }
  
  // Smazat existující product_categories pro importované produkty
  // (aby nedošlo k duplicitám při opakovaném importu)
  await prisma.productCategory.deleteMany({
    where: {
      product: { sourceId: { startsWith: "shopify-" } },
    },
  });
  
  let count = 0;
  for await (const collects of fetchAllPages<ShopifyCollect>("collects.json", "collects")) {
    for (const collect of collects) {
      const categoryId = collectionMap.get(collect.collection_id);
      const productId = productMap.get(`shopify-${collect.product_id}`);
      
      if (!categoryId || !productId) continue;
      
      try {
        await prisma.productCategory.upsert({
          where: { productId_categoryId: { productId, categoryId } },
          create: { productId, categoryId },
          update: {},
        });
        count++;
      } catch (e) {
        // Ignorovat duplicity
      }
    }
  }
  
  console.log(`Imported ${count} product-category links`);
}
```

---

## FÁZE 5: Customers → Users

### Shopify Customer → naše User

| Shopify field | Naše field | Transformace |
|---------------|------------|-------------|
| `id` | — | Pro tracking (ne uloženo) |
| `email` | `email` | Lowercase, trim |
| `first_name` | `firstName` | Přímo |
| `last_name` | `lastName` | Přímo |
| `phone` | `phone` | Přímo |
| `addresses[0].address1` | `street` | Default adresa |
| `addresses[0].city` | `city` | Default adresa |
| `addresses[0].zip` | `zip` | Default adresa |
| `created_at` | `createdAt` | ISO parse |
| — | `passwordHash` | Random bcrypt hash (zákazník si musí resetovat) |
| — | `role` | `"customer"` |

```ts
async function importCustomers() {
  let count = 0;
  
  // Generovat jednu hash pro všechny — zákazník si resetne heslo
  const placeholderHash = await bcrypt.hash(crypto.randomUUID(), 10);
  
  for await (const customers of fetchAllPages<ShopifyCustomer>("customers.json", "customers")) {
    for (const c of customers) {
      if (!c.email) continue; // Skip zákazníky bez emailu
      
      const email = c.email.toLowerCase().trim();
      const defaultAddr = c.addresses?.find(a => a.default) || c.addresses?.[0];
      
      try {
        await prisma.user.upsert({
          where: { email },
          create: {
            email,
            passwordHash: placeholderHash,
            firstName: c.first_name || null,
            lastName: c.last_name || null,
            phone: c.phone || null,
            street: defaultAddr?.address1 || null,
            city: defaultAddr?.city || null,
            zip: defaultAddr?.zip || null,
            role: "customer",
            createdAt: new Date(c.created_at),
          },
          update: {
            firstName: c.first_name || undefined,
            lastName: c.last_name || undefined,
            phone: c.phone || undefined,
            street: defaultAddr?.address1 || undefined,
            city: defaultAddr?.city || undefined,
            zip: defaultAddr?.zip || undefined,
          },
        });
        count++;
      } catch (e) {
        console.error(`Failed to import customer ${c.email}: ${e}`);
      }
    }
  }
  
  console.log(`Imported ${count} customers`);
}
```

**BEZPEČNOST:**
- Hesla se NEIMPORTUJÍ (Shopify je nesdílí)
- Zákazníci dostanou placeholder hash → musí použít "Zapomenuté heslo"
- Existující uživatelé (matching email) se UPDATE, heslo se NEPŘEPÍŠE

---

## FÁZE 6: Orders → Orders + OrderItems

### Shopify Order → naše Order

| Shopify field | Naše field | Transformace |
|---------------|------------|-------------|
| `name` (#1001) | `orderNumber` | `"SH-{name}"` prefix (odlišení od Qsport objednávek) |
| `financial_status` | `paymentStatus` | `paid→PAID`, `pending→PENDING`, `refunded→REFUNDED` |
| `fulfillment_status` | `status` | `fulfilled→SHIPPED`, `partial→PROCESSING`, `null→NEW` |
| `email` | `email` | Přímo |
| `phone` | `phone` | Přímo |
| `billing_address.*` | `firstName,lastName,street,city,zip` | Billing adresa |
| `shipping_address.*` | `shippingName,shippingStreet,shippingCity,shippingZip` | Shipping adresa |
| `subtotal_price` | `subtotal` | `Math.round(parseFloat * 100)` |
| `total_price` | `total` | `Math.round(parseFloat * 100)` |
| `created_at` | `createdAt` | ISO parse |
| `note` | `note` | Přímo |
| `line_items[]` | `OrderItem[]` | Viz níže |

### Shopify Line Item → naše OrderItem

| Shopify field | Naše field | Transformace |
|---------------|------------|-------------|
| `title` | `productName` | Přímo |
| `variant_title` | `variantTitle` | Přímo nebo "Default" |
| `sku` | `sku` | Přímo |
| `quantity` | `quantity` | Přímo |
| `price` | `unitPrice` | `Math.round(parseFloat * 100)` |
| `price * quantity` | `totalPrice` | Výpočet |
| `product_id` | `productId` | Lookup v productMap (nullable) |
| `variant_id` | `variantId` | Lookup v variantMap (nullable) |

```ts
async function importOrders() {
  // Potřebujeme default shipping method
  let defaultShipping = await prisma.shippingMethod.findFirst({ where: { active: true } });
  if (!defaultShipping) {
    defaultShipping = await prisma.shippingMethod.create({
      data: {
        name: "Shopify Import",
        code: "shopify-import",
        description: "Importováno ze Shopify",
        price: 0,
        active: false, // Neaktivní pro nové objednávky
      },
    });
  }
  
  const paymentStatusMap: Record<string, string> = {
    paid: "PAID",
    partially_paid: "PAID",
    pending: "PENDING",
    authorized: "PENDING",
    refunded: "REFUNDED",
    voided: "CANCELLED",
  };
  
  const orderStatusMap = (financial: string, fulfillment: string | null): string => {
    if (financial === "refunded" || financial === "voided") return "CANCELLED";
    if (fulfillment === "fulfilled") return "DELIVERED";
    if (fulfillment === "partial") return "SHIPPED";
    if (financial === "paid") return "PROCESSING";
    return "NEW";
  };
  
  let count = 0;
  for await (const orders of fetchAllPages<ShopifyOrder>("orders.json?status=any", "orders")) {
    for (const o of orders) {
      const orderNumber = `SH-${o.name.replace("#", "")}`;
      const billing = o.billing_address || o.shipping_address || {};
      const shipping = o.shipping_address || {};
      
      // Najít userId pokud existuje
      let userId: string | null = null;
      if (o.email) {
        const user = await prisma.user.findUnique({ where: { email: o.email.toLowerCase().trim() } });
        userId = user?.id || null;
      }
      
      try {
        const existingOrder = await prisma.order.findUnique({ where: { orderNumber } });
        if (existingOrder) {
          console.log(`Order ${orderNumber} already exists, skipping`);
          continue;
        }
        
        await prisma.order.create({
          data: {
            orderNumber,
            status: orderStatusMap(o.financial_status, o.fulfillment_status),
            email: o.email || "unknown@import.shopify",
            phone: o.phone || billing.phone || null,
            firstName: billing.first_name || "Shopify",
            lastName: billing.last_name || "Import",
            street: billing.address1 || "",
            city: billing.city || "",
            zip: billing.zip || "",
            shippingName: shipping.first_name && shipping.last_name
              ? `${shipping.first_name} ${shipping.last_name}` : null,
            shippingStreet: shipping.address1 || null,
            shippingCity: shipping.city || null,
            shippingZip: shipping.zip || null,
            shippingId: defaultShipping.id,
            paymentMethod: "shopify-import",
            paymentStatus: paymentStatusMap[o.financial_status] || "PENDING",
            subtotal: Math.round(parseFloat(o.subtotal_price || "0") * 100),
            total: Math.round(parseFloat(o.total_price || "0") * 100),
            note: o.note || null,
            adminNote: `Importováno ze Shopify (${o.name})`,
            userId,
            createdAt: new Date(o.created_at),
            paidAt: o.financial_status === "paid" ? new Date(o.created_at) : null,
            items: {
              create: (o.line_items || []).map(li => ({
                productName: li.title,
                variantTitle: li.variant_title || "Default",
                sku: li.sku || null,
                quantity: li.quantity,
                unitPrice: Math.round(parseFloat(li.price) * 100),
                totalPrice: Math.round(parseFloat(li.price) * 100) * li.quantity,
              })),
            },
          },
        });
        count++;
      } catch (e) {
        console.error(`Failed to import order ${o.name}: ${e}`);
      }
    }
  }
  
  console.log(`Imported ${count} orders`);
}
```

**POZNÁMKY K OBJEDNÁVKÁM:**
- `status=any` v URL → stáhne i archivované objednávky
- OrderItem `productId` a `variantId` jsou nullable — nemusíme propojovat (produkt mohl být smazán)
- `shippingId` je povinný → vytvoříme dummy shipping method "Shopify Import" (neaktivní)
- Prefix `SH-` u orderNumber zabrání kolizi s budoucími Qsport objednávkami

---

## FÁZE 7: Ověření + statistiky

```ts
async function verify() {
  const products = await prisma.product.count({ where: { sourceId: { startsWith: "shopify-" } } });
  const variants = await prisma.variant.count({ where: { product: { sourceId: { startsWith: "shopify-" } } } });
  const categories = await prisma.category.count();
  const brands = await prisma.brand.count();
  const productCategories = await prisma.productCategory.count();
  const users = await prisma.user.count();
  const orders = await prisma.order.count({ where: { orderNumber: { startsWith: "SH-" } } });
  
  console.log("\n=== IMPORT SUMMARY ===");
  console.log(`Products:  ${products} (expected ~15092)`);
  console.log(`Variants:  ${variants}`);
  console.log(`Categories: ${categories} (expected 59+)`);
  console.log(`Brands:    ${brands}`);
  console.log(`Product↔Category: ${productCategories}`);
  console.log(`Users:     ${users} (expected ~15651)`);
  console.log(`Orders:    ${orders} (expected 89)`);
  
  // Check for products without photos
  const noPhotos = await prisma.product.count({
    where: { sourceId: { startsWith: "shopify-" }, photos: "[]" },
  });
  console.log(`\nProducts without photos: ${noPhotos}`);
  
  // Check for products without categories
  const noCats = await prisma.product.count({
    where: {
      sourceId: { startsWith: "shopify-" },
      categories: { none: {} },
    },
  });
  console.log(`Products without categories: ${noCats}`);
  
  // Check for products without variants
  const noVariants = await prisma.product.count({
    where: {
      sourceId: { startsWith: "shopify-" },
      variants: { none: {} },
    },
  });
  console.log(`Products without variants: ${noVariants} (should be 0!)`);
}
```

---

## Progress tracking + Resume

```ts
const PROGRESS_FILE = "scripts/.shopify-import-progress.json";

interface ImportProgress {
  phase: string;
  products: number;
  customers: number;
  orders: number;
  startedAt: string;
  lastProductPage?: string; // cursor URL for resume
}

function saveProgress(partial: Partial<ImportProgress>) {
  const existing = loadProgress();
  const updated = { ...existing, ...partial };
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(updated, null, 2));
}

function loadProgress(): ImportProgress {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
  } catch {
    return { phase: "init", products: 0, customers: 0, orders: 0, startedAt: new Date().toISOString() };
  }
}
```

---

## Error handling

```ts
const ERROR_LOG_FILE = "scripts/.shopify-import-errors.json";

interface ImportError {
  phase: string;
  entityType: string;
  entityId: number | string;
  message: string;
  timestamp: string;
}

function logError(entityType: string, entityId: number | string, message: string) {
  const errors: ImportError[] = JSON.parse(
    fs.readFileSync(ERROR_LOG_FILE, "utf-8").catch(() => "[]")
  );
  errors.push({
    phase: currentPhase,
    entityType,
    entityId,
    message,
    timestamp: new Date().toISOString(),
  });
  fs.writeFileSync(ERROR_LOG_FILE, JSON.stringify(errors, null, 2));
}
```

---

## Pomocné funkce

```ts
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## Hlavní orchestrace

```ts
async function main() {
  console.log("=== SHOPIFY → QSPORT IMPORT ===\n");
  
  const progress = loadProgress();
  
  // FÁZE 1: Collections → Categories
  console.log("FÁZE 1: Importing collections → categories...");
  const collectionMap = await importCollections();
  console.log(`  ✓ ${collectionMap.size} categories\n`);
  
  // FÁZE 2+3: Products (includes brand extraction)
  // Fetch ALL products first (need vendors for brands)
  console.log("FÁZE 2-3: Fetching all products + importing brands + products...");
  const allProducts: ShopifyProduct[] = [];
  for await (const page of fetchAllPages<ShopifyProduct>("products.json", "products")) {
    allProducts.push(...page);
  }
  console.log(`  Fetched ${allProducts.length} products from Shopify`);
  
  // Extract and import brands
  const brandMap = await importBrands(allProducts);
  const fallbackBrand = await prisma.brand.upsert({
    where: { slug: "ostatni" },
    create: { name: "Ostatní", slug: "ostatni" },
    update: {},
  });
  console.log(`  ✓ ${brandMap.size} brands\n`);
  
  // Import products + variants
  let productCount = 0;
  for (const product of allProducts) {
    try {
      await importProduct(product, brandMap, fallbackBrand.id);
      productCount++;
      if (productCount % 500 === 0) {
        console.log(`  Progress: ${productCount}/${allProducts.length} products`);
        saveProgress({ phase: "products", products: productCount });
      }
    } catch (e) {
      console.error(`  ✗ Product ${product.id}: ${(e as Error).message}`);
      logError("product", product.id, (e as Error).message);
    }
  }
  console.log(`  ✓ ${productCount} products imported\n`);
  
  // FÁZE 4: Collects → ProductCategory
  console.log("FÁZE 4: Importing product-collection links...");
  await importCollects(collectionMap);
  
  // FÁZE 5: Customers → Users
  console.log("\nFÁZE 5: Importing customers...");
  await importCustomers();
  
  // FÁZE 6: Orders
  console.log("\nFÁZE 6: Importing orders...");
  await importOrders();
  
  // FÁZE 7: Verify
  console.log("");
  await verify();
  
  console.log("\n=== IMPORT DOKONČEN ===");
}

main().catch(console.error);
```

---

## Migrace (před spuštěním scriptu)

### Nutná změna v schema.prisma

```prisma
model Product {
  ...
  sourceId    String?   @unique    // ← PŘIDAT @unique
  ...
}
```

Spustit: `npx prisma migrate dev --name add-sourceId-unique`

---

## Potenciální problémy a řešení

### 1. Duplicitní SKU
- Shopify umožňuje duplicitní SKU, naše schema ne
- **Řešení:** Přidat suffix `-{shopify_product_id}` při kolizi

### 2. Slug kolize
- Shopify handle může kolidovat s existujícími slugy z feedů
- **Řešení:** Pokud slug existuje a nemá stejný sourceId, přidat suffix `-shopify`

### 3. Variant unique constraint `[productId, size, color]`
- Pokud produkt má dvě varianty se stejnou kombinací size+color
- **Řešení:** Přidat variant position do size/color jako fallback: `size = "{size} #{position}"`

### 4. Velké body_html
- Některé produkty mohou mít obrovské HTML popisy
- **Řešení:** SQLite nemá limit na TEXT, ale truncate description (plain text) na 300 znaků

### 5. Shopify CDN fotky
- Photos zůstanou jako Shopify CDN URLs (https://cdn.shopify.com/...)
- **Funguje** dokud Shopify store existuje
- **Budoucí TODO:** Download a hostovat vlastní (mimo scope tohoto importu)

### 6. API token expiry
- Pokud import trvá hodiny a token expiruje
- **Řešení:** Token by měl být permanent (Custom App), ale přidat retry logiku

### 7. Customers bez emailu
- Shopify umožňuje zákazníky bez emailu
- **Řešení:** Skip — naše schema vyžaduje email

### 8. Pricing: CZK vs jiná měna
- Shopify ceny jsou v defaultní měně store
- **Předpoklad:** Store je v CZK → `price * 100` = haléře
- **Ověřit:** Zkontrolovat jednu objednávku ručně po importu

---

## Souhrn souborů

| Soubor | Akce |
|--------|------|
| `scripts/shopify-import.ts` | **NOVÝ** — hlavní import script |
| `prisma/schema.prisma` | **EDIT** — přidat `@unique` na `sourceId` |
| `scripts/.shopify-import-progress.json` | Auto-generated, .gitignore |
| `scripts/.shopify-import-errors.json` | Auto-generated, .gitignore |

## Příkazy ke spuštění

```bash
# 1. Migrace
npx prisma migrate dev --name add-sourceId-unique

# 2. Import (dry-run: ověřit počet stránek)
npx tsx scripts/shopify-import.ts --dry-run

# 3. Plný import
npx tsx scripts/shopify-import.ts

# 4. Ověření
npx tsx scripts/shopify-import.ts --verify-only
```

## Časový odhad

- API fetch: ~2 min (186 requests × 0.5s)
- DB operace (15k products): ~5-8 min
- DB operace (15k customers): ~3-5 min
- **Celkem: ~10-15 minut**

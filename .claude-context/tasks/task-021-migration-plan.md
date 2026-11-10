# TASK-021: Shopify → SQLite data migration — Implementation Plan

**Task ID:** #2
**Status:** Ready for implementation
**Store:** zt2xr1-ry.myshopify.com
**Target:** prisma/dev.db (SQLite via Prisma + libsql)
**Scale:** ~14,728 products, 59 collections

---

## Problem

Need to migrate all product data from Shopify store to local SQLite DB. The old API token (shpat_a9d54...c22) was revoked, so we need either:
1. A new API token (requires Shopify admin access)
2. Alternative export method (CSV from Shopify admin)

## Data Export Strategy — Two Options

### Option A: Shopify Admin CSV Export (NO API TOKEN NEEDED)

**Pros:** No token needed, just admin panel access
**Cons:** Missing some fields (no product ID, no collection mappings, no metafields in basic export)

**Steps:**
1. Go to Shopify admin > Products > Export
2. Select "All products" + "Plain CSV file"
3. Download CSV (may be emailed for large stores >14k products)
4. Parse CSV into our Prisma schema

**Shopify CSV columns include:**
- Handle (= our slug)
- Title (= our name)
- Body (HTML) (= our bodyHtml)
- Vendor (= brand name)
- Product Category / Type (= productType)
- Tags (= tags JSON)
- Published
- Option1 Name/Value, Option2, Option3 (variants)
- Variant SKU, Variant Price, Variant Compare At Price
- Variant Inventory Qty, Variant Weight
- Variant Barcode
- Image Src, Image Position, Image Alt Text
- SEO Title, SEO Description

**Missing from CSV:**
- Shopify numeric product ID (sourceId)
- Collection assignments (need separate export)
- Variant cost price (not in standard CSV)

**For collections:** Export separately via Products > Collections > each one, or use a Shopify app.

### Option B: New API Token via Custom App (NEEDS ADMIN ACCESS)

**Pros:** Full data access, programmatic, includes IDs and collections
**Cons:** Requires creating new custom app in Shopify admin

**Steps to get new token:**
1. Shopify admin > Settings > Apps and sales channels > Develop apps
2. Create new custom app "Qsport Migration"
3. Configure Admin API scopes: `read_products`, `read_inventory`, `read_product_listings`
4. Install app > Copy Admin API access token
5. Store token in .env.local as `SHOPIFY_ACCESS_TOKEN`
6. Use REST API or GraphQL bulk operations to fetch all data

**GraphQL bulk export query for all products + variants:**
```graphql
{
  products {
    edges {
      node {
        id
        handle
        title
        descriptionHtml
        vendor
        productType
        tags
        status
        seoTitle: seo { title }
        seoDescription: seo { description }
        images(first: 10) { edges { node { src altText } } }
        variants(first: 100) {
          edges {
            node {
              id
              sku
              title
              selectedOptions { name value }
              price
              compareAtPrice
              inventoryQuantity
              weight
              barcode
              position
            }
          }
        }
        collections(first: 10) {
          edges {
            node {
              id
              handle
              title
            }
          }
        }
      }
    }
  }
}
```

### Recommendation

**Use Option A (CSV) as primary, Option B as enhancement if token is available.**

Reason: The user may not have immediate Shopify admin access to create a new app token, but CSV export is straightforward. We can always re-import with richer data later via API.

---

## Implementation Plan

### Phase 1: Migration Script Setup

**Create file:** `scripts/shopify-import.ts`

```typescript
// Usage:
// Option A (CSV): npx tsx scripts/shopify-import.ts --csv path/to/products.csv
// Option B (API): npx tsx scripts/shopify-import.ts --api
// Both: npx tsx scripts/shopify-import.ts --csv products.csv --collections collections.csv
```

**Dependencies needed:**
- `csv-parse` — for parsing Shopify CSV (add to devDependencies)
- Prisma client (already available)

```bash
npm install -D csv-parse
```

### Phase 2: CSV Parser — Products

**Shopify CSV structure for products with variants:**
```
Handle,Title,Body (HTML),Vendor,Product Category,Type,Tags,Published,...
my-product,My Product,<p>Description</p>,BrandName,,Running Shoes,"tag1,tag2",true,...
my-product,,,,,,,,... (variant row 2)
my-product,,,,,,,,... (variant row 3)
next-product,Next Product,...
```

Key rule: When Handle repeats on multiple rows, subsequent rows are additional variants of the same product. Only the first row has the product-level fields (Title, Body, Vendor, etc.).

**Parsing logic:**
```typescript
import { parse } from "csv-parse/sync";
import fs from "fs";

interface ShopifyRow {
  Handle: string;
  Title: string;
  "Body (HTML)": string;
  Vendor: string;
  "Product Category": string;
  Type: string;
  Tags: string;
  Published: string;
  "Option1 Name": string;
  "Option1 Value": string;
  "Option2 Name": string;
  "Option2 Value": string;
  "Option3 Name": string;
  "Option3 Value": string;
  "Variant SKU": string;
  "Variant Grams": string;
  "Variant Inventory Qty": string;
  "Variant Price": string;
  "Variant Compare At Price": string;
  "Variant Barcode": string;
  "Image Src": string;
  "Image Position": string;
  "Image Alt Text": string;
  "SEO Title": string;
  "SEO Description": string;
  "Variant Weight Unit": string;
  Status: string;
}

function parseCSV(filePath: string): ShopifyRow[] {
  const content = fs.readFileSync(filePath, "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
}
```

### Phase 3: Data Transformation — Products to Prisma Models

**Group CSV rows by Handle:**
```typescript
interface ProductGroup {
  handle: string;
  title: string;
  bodyHtml: string;
  vendor: string;        // -> Brand
  productType: string;
  tags: string[];
  status: string;
  seoTitle: string;
  seoDescription: string;
  photos: string[];      // collected from Image Src across all rows
  variants: VariantData[];
}

interface VariantData {
  sku: string | null;
  title: string;         // e.g. "42 / Black" built from option values
  size: string | null;   // from Option1 Value (if Option1 Name == "Size"/"Velikost")
  color: string | null;  // from Option2 Value (if Option2 Name == "Color"/"Barva")
  price: number;         // in CZK, integer (Shopify uses decimal string)
  comparePrice: number | null;
  stock: number;
  weight: number | null; // grams
  barcode: string | null;
  position: number;
}

function groupByProduct(rows: ShopifyRow[]): ProductGroup[] {
  const groups: Map<string, { rows: ShopifyRow[] }> = new Map();
  
  for (const row of rows) {
    const handle = row.Handle;
    if (!groups.has(handle)) {
      groups.set(handle, { rows: [] });
    }
    groups.get(handle)!.rows.push(row);
  }

  return Array.from(groups.entries()).map(([handle, { rows }]) => {
    const first = rows[0]; // product-level data from first row
    
    // Collect ALL photos from all rows
    const photos: string[] = [];
    for (const row of rows) {
      if (row["Image Src"]) {
        photos.push(row["Image Src"]);
      }
    }
    // Deduplicate and sort by Image Position
    const uniquePhotos = [...new Set(photos)];

    // Build variants (one per row, skipping image-only rows)
    const variants: VariantData[] = [];
    let position = 0;
    for (const row of rows) {
      if (row["Variant Price"] || row["Option1 Value"]) {
        // Determine size/color from option names
        let size: string | null = null;
        let color: string | null = null;
        const optionParts: string[] = [];

        if (row["Option1 Value"] && row["Option1 Value"] !== "Default Title") {
          const name1 = row["Option1 Name"]?.toLowerCase() || "";
          if (name1.includes("size") || name1.includes("velik")) {
            size = row["Option1 Value"];
          } else if (name1.includes("color") || name1.includes("barv")) {
            color = row["Option1 Value"];
          }
          optionParts.push(row["Option1 Value"]);
        }
        if (row["Option2 Value"]) {
          const name2 = row["Option2 Name"]?.toLowerCase() || "";
          if (name2.includes("size") || name2.includes("velik")) {
            size = row["Option2 Value"];
          } else if (name2.includes("color") || name2.includes("barv")) {
            color = row["Option2 Value"];
          }
          optionParts.push(row["Option2 Value"]);
        }
        if (row["Option3 Value"]) {
          optionParts.push(row["Option3 Value"]);
        }

        const variantTitle = optionParts.length > 0
          ? optionParts.join(" / ")
          : "Default";

        // Price: Shopify uses "3969.00" string, we store as integer CZK
        const priceStr = row["Variant Price"] || "0";
        const price = Math.round(parseFloat(priceStr));
        
        const comparePriceStr = row["Variant Compare At Price"] || "";
        const comparePrice = comparePriceStr 
          ? Math.round(parseFloat(comparePriceStr)) 
          : null;

        const stock = parseInt(row["Variant Inventory Qty"] || "0", 10);
        const weight = row["Variant Grams"] ? parseInt(row["Variant Grams"], 10) : null;

        variants.push({
          sku: row["Variant SKU"] || null,
          title: variantTitle,
          size,
          color,
          price,
          comparePrice: comparePrice && comparePrice > 0 ? comparePrice : null,
          stock: isNaN(stock) ? 0 : stock,
          weight,
          barcode: row["Variant Barcode"] || null,
          position: position++,
        });
      }
    }

    return {
      handle,
      title: first.Title,
      bodyHtml: first["Body (HTML)"] || "",
      vendor: first.Vendor || "Unknown",
      productType: first.Type || "",
      tags: first.Tags ? first.Tags.split(",").map(t => t.trim()) : [],
      status: first.Status?.toUpperCase() === "ACTIVE" ? "ACTIVE" : "DRAFT",
      seoTitle: first["SEO Title"] || "",
      seoDescription: first["SEO Description"] || "",
      photos: uniquePhotos,
      variants,
    };
  });
}
```

### Phase 4: Import into Prisma/SQLite

```typescript
import { PrismaClient } from "@prisma/client";

async function importProducts(products: ProductGroup[]) {
  const prisma = new PrismaClient();
  
  // 1. Create/update Brands
  const brandMap = new Map<string, string>(); // vendor name -> brand ID
  const uniqueVendors = [...new Set(products.map(p => p.vendor))];
  
  console.log(`Creating ${uniqueVendors.length} brands...`);
  for (const vendor of uniqueVendors) {
    const slug = slugify(vendor);
    const brand = await prisma.brand.upsert({
      where: { slug },
      create: { name: vendor, slug },
      update: { name: vendor },
    });
    brandMap.set(vendor, brand.id);
  }

  // 2. Create Categories from productTypes
  const categoryMap = new Map<string, string>(); // type name -> category ID
  const uniqueTypes = [...new Set(products.map(p => p.productType).filter(Boolean))];
  
  console.log(`Creating ${uniqueTypes.length} categories from product types...`);
  let catPosition = 0;
  for (const typeName of uniqueTypes) {
    const slug = slugify(typeName);
    const category = await prisma.category.upsert({
      where: { slug },
      create: { name: typeName, slug, position: catPosition++ },
      update: { name: typeName },
    });
    categoryMap.set(typeName, category.id);
  }

  // 3. Import Products + Variants in batches
  console.log(`Importing ${products.length} products...`);
  let imported = 0;
  let skipped = 0;
  
  for (const product of products) {
    try {
      const brandId = brandMap.get(product.vendor);
      if (!brandId) {
        console.warn(`No brand for vendor "${product.vendor}", skipping ${product.handle}`);
        skipped++;
        continue;
      }

      // Upsert product
      const dbProduct = await prisma.product.upsert({
        where: { slug: product.handle },
        create: {
          name: product.title,
          slug: product.handle,
          description: stripHtml(product.bodyHtml).slice(0, 500) || null,
          bodyHtml: product.bodyHtml || null,
          brandId,
          productType: product.productType || null,
          tags: JSON.stringify(product.tags),
          seoTitle: product.seoTitle || null,
          seoDescription: product.seoDescription || null,
          photos: JSON.stringify(product.photos),
          status: product.status,
          sourceHandle: product.handle,
          importedAt: new Date(),
        },
        update: {
          name: product.title,
          bodyHtml: product.bodyHtml || null,
          photos: JSON.stringify(product.photos),
          status: product.status,
          importedAt: new Date(),
        },
      });

      // Create/update variants
      // Delete existing variants first (clean re-import)
      await prisma.variant.deleteMany({ where: { productId: dbProduct.id } });
      
      for (const variant of product.variants) {
        await prisma.variant.create({
          data: {
            productId: dbProduct.id,
            sku: variant.sku,
            title: variant.title,
            size: variant.size,
            color: variant.color,
            price: variant.price,
            comparePrice: variant.comparePrice,
            stock: variant.stock,
            weight: variant.weight,
            barcode: variant.barcode,
            position: variant.position,
            active: true,
          },
        });
      }

      // Link to category (by productType)
      if (product.productType) {
        const categoryId = categoryMap.get(product.productType);
        if (categoryId) {
          await prisma.productCategory.upsert({
            where: {
              productId_categoryId: {
                productId: dbProduct.id,
                categoryId,
              },
            },
            create: {
              productId: dbProduct.id,
              categoryId,
            },
            update: {},
          });
        }
      }

      imported++;
      if (imported % 500 === 0) {
        console.log(`  ${imported}/${products.length} imported...`);
      }
    } catch (err) {
      console.error(`Error importing ${product.handle}:`, err);
      skipped++;
    }
  }

  console.log(`Done! Imported: ${imported}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}
```

### Phase 5: Collections (Categories) Import

Shopify collections map to our Categories. Two approaches:

**A) From CSV:** Export each collection separately, or use a Shopify app that exports collections with their product handles.

**B) From tags:** Many Shopify stores use tags to organize products. We can auto-create categories from common tags.

**C) Manual mapping:** Define top-level categories (Beh, Hory a outdoor, Zima, Obleceni, Doplnky, Bazar) and map Shopify product types/tags to them.

**Recommended: Option C — Manual category mapping**

Since the brand brief defines 6 main categories + subcategories, create a mapping config:

```typescript
const CATEGORY_MAPPING: Record<string, string[]> = {
  "beh": [
    "bezecke-boty", "bezecke-obleceni", "running", "trail",
    "kopacky", "silnicni-boty",
  ],
  "hory-a-outdoor": [
    "outdoor", "hiking", "trekking", "turistika",
    "lezeni", "camping",
  ],
  "zima": [
    "lyze", "snowboard", "bezky", "zimni-boty",
    "zimni-obleceni", "helmy",
  ],
  "obleceni": [
    "tricka", "bundy", "kalhoty", "sukne",
    "funktionskleidung", "vesty",
  ],
  "doplnky": [
    "batohy", "bryle", "rukavice", "cepice",
    "ponozky", "lahve", "hole",
  ],
};

// Match by Shopify productType or tags
function getCategorySlug(productType: string, tags: string[]): string | null {
  const searchTerms = [
    productType.toLowerCase(),
    ...tags.map(t => t.toLowerCase()),
  ];

  for (const [catSlug, keywords] of Object.entries(CATEGORY_MAPPING)) {
    for (const keyword of keywords) {
      if (searchTerms.some(term => term.includes(keyword))) {
        return catSlug;
      }
    }
  }
  return null;
}
```

### Phase 6: Helper Functions

```typescript
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
```

### Phase 7: API-based Import (if token available)

If a new API token is obtained, add API-based import as alternative path:

```typescript
const SHOPIFY_STORE = "zt2xr1-ry.myshopify.com";
const SHOPIFY_API_VERSION = "2024-01";

async function fetchShopifyProducts(token: string): Promise<any[]> {
  const allProducts: any[] = [];
  let url = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250&status=active`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    allProducts.push(...data.products);
    console.log(`Fetched ${allProducts.length} products so far...`);

    // Pagination via Link header
    const linkHeader = res.headers.get("link");
    const nextMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : "";

    // Rate limiting: 2 requests per second for REST API
    await new Promise(r => setTimeout(r, 500));
  }

  return allProducts;
}

async function fetchShopifyCollections(token: string): Promise<any[]> {
  const collections: any[] = [];
  
  // Smart collections
  let url = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/smart_collections.json?limit=250`;
  while (url) {
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": token },
    });
    const data = await res.json();
    collections.push(...data.smart_collections);
    const linkHeader = res.headers.get("link");
    const nextMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : "";
    await new Promise(r => setTimeout(r, 500));
  }

  // Custom collections
  url = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/custom_collections.json?limit=250`;
  while (url) {
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": token },
    });
    const data = await res.json();
    collections.push(...data.custom_collections);
    const linkHeader = res.headers.get("link");
    const nextMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : "";
    await new Promise(r => setTimeout(r, 500));
  }

  return collections;
}

// Fetch products per collection (for category mapping)
async function fetchCollectionProducts(token: string, collectionId: string): Promise<string[]> {
  const url = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/collections/${collectionId}/products.json?limit=250&fields=handle`;
  const res = await fetch(url, {
    headers: { "X-Shopify-Access-Token": token },
  });
  const data = await res.json();
  return data.products.map((p: any) => p.handle);
}
```

---

## Script Entry Point

```typescript
// scripts/shopify-import.ts
import { PrismaClient } from "@prisma/client";

async function main() {
  const args = process.argv.slice(2);
  const csvIndex = args.indexOf("--csv");
  const apiIndex = args.indexOf("--api");
  const collectionsIndex = args.indexOf("--collections");

  if (csvIndex >= 0 && args[csvIndex + 1]) {
    console.log("=== Shopify CSV Import ===");
    const csvPath = args[csvIndex + 1];
    const rows = parseCSV(csvPath);
    console.log(`Parsed ${rows.length} CSV rows`);
    
    const products = groupByProduct(rows);
    console.log(`Grouped into ${products.length} products`);
    
    await importProducts(products);
    
    // Optional: import collections CSV
    if (collectionsIndex >= 0 && args[collectionsIndex + 1]) {
      // TODO: parse collections CSV
    }
  } else if (apiIndex >= 0) {
    console.log("=== Shopify API Import ===");
    const token = process.env.SHOPIFY_ACCESS_TOKEN;
    if (!token) {
      console.error("Missing SHOPIFY_ACCESS_TOKEN in environment");
      process.exit(1);
    }
    
    const products = await fetchShopifyProducts(token);
    // Transform API response to our format and import
    // ...
  } else {
    console.log("Usage:");
    console.log("  npx tsx scripts/shopify-import.ts --csv products.csv");
    console.log("  npx tsx scripts/shopify-import.ts --api");
    console.log("");
    console.log("Environment:");
    console.log("  SHOPIFY_ACCESS_TOKEN  — required for --api mode");
  }
}

main().catch(console.error);
```

---

## package.json Script

Add to scripts:
```json
"import:shopify": "npx tsx scripts/shopify-import.ts"
```

---

## Pre-requisites Before Running

1. **Prisma DB must be initialized:**
   ```bash
   npx prisma db push    # creates SQLite tables from schema
   ```

2. **CSV file must be obtained from Shopify admin:**
   - Ask user to export from: Shopify Admin > Products > Export > All products > Plain CSV
   - Save as `data/shopify-products.csv`

3. **Or API token must be available:**
   - Add to `.env.local`: `SHOPIFY_ACCESS_TOKEN=shpat_xxxxx`

---

## Recommended Main Categories to Create

Before import, seed the 6 main categories (matching the brand brief):

```typescript
const MAIN_CATEGORIES = [
  { name: "Běh", slug: "beh", position: 1 },
  { name: "Hory a outdoor", slug: "hory-a-outdoor", position: 2 },
  { name: "Zima", slug: "zima", position: 3 },
  { name: "Oblečení", slug: "obleceni", position: 4 },
  { name: "Doplňky", slug: "doplnky", position: 5 },
  { name: "Bazar", slug: "bazar", position: 6 },
];
```

These should be created as part of the import script's initialization.

---

## Blockers for User

**USER ACTION REQUIRED:** Choose one of:

1. **Export CSV from Shopify admin** — go to Products > Export > All products > Plain CSV, email file
2. **Create new API token** — go to Settings > Apps > Develop apps > Create app "Qsport Migration" with `read_products` scope, install, copy token

Without one of these, we cannot proceed with the import.

---

## File Structure

```
scripts/
  shopify-import.ts    — main import script
data/
  shopify-products.csv — (user provides) Shopify CSV export
  .gitignore           — ignore CSV files
```

## Testing Checklist

- [ ] `npx prisma db push` creates all tables
- [ ] CSV parsing handles multi-variant products correctly
- [ ] Brands are created/deduplicated from Vendor field
- [ ] Categories mapped from productType or manual mapping
- [ ] Products imported with photos, SEO data, description
- [ ] Variants have correct price (integer CZK), size, color, stock
- [ ] Duplicate handles handled gracefully (upsert)
- [ ] Progress logging: shows count every 500 products
- [ ] Error handling: logs but doesn't stop on single product failure
- [ ] Final count matches: ~14,728 products imported
- [ ] Homepage loads with real product data
- [ ] Category pages show correct products
- [ ] Product detail pages show variants, photos, prices

## Estimated Effort

- Script development: ~60-90 minutes
- Testing + debugging: ~30 minutes
- **BLOCKED on:** user providing CSV export or new API token

/**
 * Shopify → Qsport.cz product import script
 *
 * Imports ALL products from Shopify Admin REST API into the local DB.
 * - Cursor-based pagination (250 products/page)
 * - Rate limiting: max 2 requests/sec
 * - Resume capability via state file
 * - Maps Shopify collections → categories
 * - Maps vendor → brand
 * - Maps variants with price/stock/sku
 *
 * Usage: npx tsx scripts/import-shopify.ts
 *        npx tsx scripts/import-shopify.ts --reset   (start fresh, ignore resume state)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";

// ── Config ──────────────────────────────────────────────────────────────────

const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN ?? "";
const SHOPIFY_STORE = "zt2xr1-ry.myshopify.com";
const API_VERSION = "2024-01";
const BASE_URL = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}`;
const PAGE_SIZE = 250;
const RATE_LIMIT_MS = 520; // ~2 req/sec with margin

const STATE_FILE = join(__dirname, ".shopify-import-state.json");

// ── Prisma ──────────────────────────────────────────────────────────────────

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

// ── Types ───────────────────────────────────────────────────────────────────

interface ShopifyImage {
  id: number;
  src: string;
  position: number;
}

interface ShopifyVariant {
  id: number;
  title: string;
  sku: string | null;
  price: string;
  compare_at_price: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  inventory_quantity: number;
  position: number;
  barcode: string | null;
  weight: number;
  weight_unit: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  tags: string;
  status: string;
  images: ShopifyImage[];
  variants: ShopifyVariant[];
  created_at: string;
  updated_at: string;
}

interface ShopifyCollect {
  id: number;
  collection_id: number;
  product_id: number;
}

interface ShopifyCollection {
  id: number;
  title: string;
  handle: string;
  body_html: string | null;
  sort_order: string;
  published_at: string | null;
}

interface ImportState {
  phase: "collections" | "products" | "collects" | "done";
  lastProductPageUrl: string | null;
  productsImported: number;
  collectionsImported: string[];
  collectsImported: boolean;
}

// ── Utilities ───────────────────────────────────────────────────────────────

function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastRequestTime = 0;

async function shopifyFetch<T>(url: string): Promise<{ data: T; nextLink: string | null }> {
  // Rate limiting
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await sleep(RATE_LIMIT_MS - elapsed);
  }
  lastRequestTime = Date.now();

  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_TOKEN,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 429) {
    const retryAfter = parseFloat(res.headers.get("Retry-After") || "2") * 1000;
    console.log(`  Rate limited, waiting ${retryAfter}ms...`);
    await sleep(retryAfter);
    return shopifyFetch(url);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify API error ${res.status}: ${body}`);
  }

  // Parse Link header for pagination
  let nextLink: string | null = null;
  const linkHeader = res.headers.get("link");
  if (linkHeader) {
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (nextMatch) {
      nextLink = nextMatch[1];
    }
  }

  const data = (await res.json()) as T;
  return { data, nextLink };
}

function saveState(state: ImportState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadState(): ImportState | null {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function clearState(): void {
  if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
}

function convertWeight(weight: number, unit: string): number {
  // Convert to grams
  switch (unit) {
    case "kg":
      return Math.round(weight * 1000);
    case "lb":
      return Math.round(weight * 453.592);
    case "oz":
      return Math.round(weight * 28.3495);
    default:
      return Math.round(weight);
  }
}

// ── Step 1: Import Collections → Categories ─────────────────────────────────

async function importCollections(state: ImportState): Promise<Map<number, string>> {
  console.log("\n═══ PHASE 1: Importing Collections → Categories ═══\n");

  const collectionMap = new Map<number, string>(); // shopifyCollectionId → categoryId

  // Fetch custom collections
  let url: string | null = `${BASE_URL}/custom_collections.json?limit=${PAGE_SIZE}`;
  let page = 0;

  while (url) {
    page++;
    console.log(`  Fetching custom collections page ${page}...`);
    const { data, nextLink } = await shopifyFetch<{ custom_collections: ShopifyCollection[] }>(url);

    for (const col of data.custom_collections) {
      const category = await upsertCategory(col);
      collectionMap.set(col.id, category.id);
    }

    url = nextLink;
  }

  // Fetch smart collections
  url = `${BASE_URL}/smart_collections.json?limit=${PAGE_SIZE}`;
  page = 0;

  while (url) {
    page++;
    console.log(`  Fetching smart collections page ${page}...`);
    const { data, nextLink } = await shopifyFetch<{ smart_collections: ShopifyCollection[] }>(url);

    for (const col of data.smart_collections) {
      const category = await upsertCategory(col);
      collectionMap.set(col.id, category.id);
    }

    url = nextLink;
  }

  console.log(`  ✓ ${collectionMap.size} collections imported as categories`);
  state.phase = "products";
  state.collectionsImported = Array.from(collectionMap.keys()).map(String);
  saveState(state);

  return collectionMap;
}

async function upsertCategory(col: ShopifyCollection) {
  const slug = slugify(col.handle);
  return prisma.category.upsert({
    where: { slug },
    update: {
      name: col.title,
      seoTitle: `${col.title} | Qsport.cz`,
    },
    create: {
      name: col.title,
      slug,
      seoTitle: `${col.title} | Qsport.cz`,
      seoDesc: col.body_html
        ? col.body_html.replace(/<[^>]*>/g, "").slice(0, 160)
        : null,
    },
  });
}

// ── Step 2: Import Products ─────────────────────────────────────────────────

async function importProducts(state: ImportState): Promise<void> {
  console.log("\n═══ PHASE 2: Importing Products ═══\n");

  const brandCache = new Map<string, string>(); // vendorName → brandId

  // Pre-load all existing SKUs into memory for fast dedup
  const existingSkus = new Set<string>();
  const allVariants = await prisma.variant.findMany({ select: { sku: true }, where: { sku: { not: null } } });
  for (const v of allVariants) {
    if (v.sku) existingSkus.add(v.sku);
  }
  console.log(`  Pre-loaded ${existingSkus.size} existing SKUs for dedup`);

  let url: string | null =
    state.lastProductPageUrl ||
    `${BASE_URL}/products.json?limit=${PAGE_SIZE}`;

  let page = Math.floor(state.productsImported / PAGE_SIZE);
  let totalImported = state.productsImported;
  let errors = 0;

  while (url) {
    page++;
    console.log(`  Page ${page} (${totalImported} products so far)...`);

    const { data, nextLink } = await shopifyFetch<{ products: ShopifyProduct[] }>(url);

    for (const sp of data.products) {
      try {
        await importProduct(sp, brandCache, existingSkus);
        totalImported++;
      } catch (err) {
        errors++;
        console.error(`    ERROR importing "${sp.title}" (${sp.id}):`, (err as Error).message);
      }
    }

    // Save progress after each page
    state.productsImported = totalImported;
    state.lastProductPageUrl = nextLink;
    saveState(state);

    if (totalImported % 1000 === 0) {
      console.log(`  ... ${totalImported} products processed`);
    }

    url = nextLink;
  }

  console.log(`  ✓ Products done: ${totalImported} total, ${errors} errors`);
  state.phase = "collects";
  saveState(state);
}

async function importProduct(
  sp: ShopifyProduct,
  brandCache: Map<string, string>,
  skuSet: Set<string>
): Promise<void> {
  // 1. Ensure brand exists
  const brandId = await getOrCreateBrand(sp.vendor, brandCache);

  // 2. Prepare photos array from Shopify images
  const photos = sp.images
    .sort((a, b) => a.position - b.position)
    .map((img) => img.src);

  // 3. Parse tags
  const tags = sp.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // 4. Map Shopify status
  const statusMap: Record<string, string> = {
    active: "ACTIVE",
    draft: "DRAFT",
    archived: "ARCHIVED",
  };
  const status = statusMap[sp.status] || "DRAFT";

  // 5. Generate unique slug
  let slug = slugify(sp.handle);
  const existingSlug = await prisma.product.findFirst({
    where: { slug, sourceId: { not: String(sp.id) } },
    select: { id: true },
  });
  if (existingSlug) {
    slug = `${slug}-${sp.id}`;
  }

  // 6. Strip HTML for description
  const description = sp.body_html
    ? sp.body_html.replace(/<[^>]*>/g, "").trim()
    : null;

  // 7. Build nameSearch (name + productType + vendor)
  const searchParts = [sp.title];
  if (sp.product_type) searchParts.push(sp.product_type);
  searchParts.push(sp.vendor);
  const nameSearch = stripDiacritics(searchParts.join(" ")).toLowerCase();

  // 8. Upsert product
  const product = await prisma.product.upsert({
    where: { slug },
    update: {
      name: sp.title,
      nameSearch,
      description,
      bodyHtml: sp.body_html,
      brandId,
      productType: sp.product_type || null,
      tags: JSON.stringify(tags),
      photos: JSON.stringify(photos),
      status,
      sourceId: String(sp.id),
      sourceHandle: sp.handle,
      importedAt: new Date(),
    },
    create: {
      name: sp.title,
      nameSearch,
      slug,
      description,
      bodyHtml: sp.body_html,
      brandId,
      productType: sp.product_type || null,
      tags: JSON.stringify(tags),
      photos: JSON.stringify(photos),
      status,
      sourceId: String(sp.id),
      sourceHandle: sp.handle,
      importedAt: new Date(),
    },
  });

  // 9. Import variants
  await importVariants(product.id, sp.variants, sp, skuSet);
}

async function getOrCreateBrand(
  vendor: string,
  cache: Map<string, string>
): Promise<string> {
  const normalizedVendor = vendor.trim() || "Bez značky";

  if (cache.has(normalizedVendor)) {
    return cache.get(normalizedVendor)!;
  }

  const slug = slugify(normalizedVendor);
  const nameSearch = stripDiacritics(normalizedVendor).toLowerCase();
  const brand = await prisma.brand.upsert({
    where: { slug },
    update: { nameSearch },
    create: {
      name: normalizedVendor,
      nameSearch,
      slug: slug || `brand-${Date.now()}`,
    },
  });

  cache.set(normalizedVendor, brand.id);
  return brand.id;
}

async function importVariants(
  productId: string,
  shopifyVariants: ShopifyVariant[],
  sp: ShopifyProduct,
  skuSet: Set<string>
): Promise<void> {
  // Delete existing variants for this product and recreate
  await prisma.variant.deleteMany({ where: { productId } });

  for (const sv of shopifyVariants) {
    // Price in Shopify is string like "1299.00", we store as integer (hellers/cents)
    const price = Math.round(parseFloat(sv.price) * 100);
    const comparePrice = sv.compare_at_price
      ? Math.round(parseFloat(sv.compare_at_price) * 100)
      : null;

    // Parse size/color from options
    const size = sv.option1 !== "Default Title" ? sv.option1 : null;
    const color = sv.option2 !== "Default Title" ? sv.option2 : null;

    // Deduplicate SKU using in-memory set (fast, no DB query)
    let sku = sv.sku?.trim() || null;
    if (sku) {
      if (skuSet.has(sku)) {
        sku = `${sku}-${sp.id}`;
      }
      skuSet.add(sku);
    }

    const weight = sv.weight ? convertWeight(sv.weight, sv.weight_unit) : null;

    try {
      await prisma.variant.create({
        data: {
          productId,
          title: sv.title === "Default Title" ? "Výchozí" : sv.title,
          sku,
          price,
          comparePrice: comparePrice && comparePrice > price ? comparePrice : null,
          supplierStock: Math.max(0, sv.inventory_quantity),
          ownStock: 0,
          weight,
          barcode: sv.barcode || null,
          position: sv.position,
          active: true,
          size,
          color,
        },
      });
    } catch (err) {
      // If unique constraint fails (productId+size+color), try without size/color
      await prisma.variant.create({
        data: {
          productId,
          title: sv.title === "Default Title" ? "Výchozí" : sv.title,
          sku,
          price,
          comparePrice: comparePrice && comparePrice > price ? comparePrice : null,
          supplierStock: Math.max(0, sv.inventory_quantity),
          ownStock: 0,
          weight,
          barcode: sv.barcode || null,
          position: sv.position,
          active: true,
          size: size ? `${size}-${sv.id}` : null,
          color: color ? `${color}-${sv.id}` : null,
        },
      });
    }
  }
}

// ── Step 3: Import Collects (product ↔ collection mapping) ──────────────────

async function importCollects(
  state: ImportState,
  collectionMap: Map<number, string>
): Promise<void> {
  console.log("\n═══ PHASE 3: Mapping Products → Categories (Collects) ═══\n");

  let url: string | null = `${BASE_URL}/collects.json?limit=${PAGE_SIZE}`;
  let page = 0;
  let mapped = 0;
  let skipped = 0;

  while (url) {
    page++;
    console.log(`  Fetching collects page ${page}...`);

    const { data, nextLink } = await shopifyFetch<{ collects: ShopifyCollect[] }>(url);

    for (const collect of data.collects) {
      const categoryId = collectionMap.get(collect.collection_id);
      if (!categoryId) {
        skipped++;
        continue;
      }

      // Find our product by sourceId
      const product = await prisma.product.findFirst({
        where: { sourceId: String(collect.product_id) },
        select: { id: true },
      });

      if (!product) {
        skipped++;
        continue;
      }

      // Upsert product-category relation
      try {
        await prisma.productCategory.upsert({
          where: {
            productId_categoryId: {
              productId: product.id,
              categoryId,
            },
          },
          update: {},
          create: {
            productId: product.id,
            categoryId,
          },
        });
        mapped++;
      } catch {
        // Ignore duplicate mapping errors
        skipped++;
      }
    }

    url = nextLink;
  }

  console.log(`  ✓ ${mapped} product-category mappings created (${skipped} skipped)`);
  state.phase = "done";
  state.collectsImported = true;
  saveState(state);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");

  if (reset) {
    clearState();
    console.log("State cleared, starting fresh import.");
  }

  let state = loadState();
  const isResume = state !== null;

  if (!state) {
    state = {
      phase: "collections",
      lastProductPageUrl: null,
      productsImported: 0,
      collectionsImported: [],
      collectsImported: false,
    };
  }

  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║  Shopify → Qsport.cz Product Import          ║");
  console.log("╚═══════════════════════════════════════════════╝");
  console.log(`  Store: ${SHOPIFY_STORE}`);
  console.log(`  API: ${API_VERSION}`);
  console.log(`  Resume: ${isResume ? `YES (phase: ${state.phase}, ${state.productsImported} products done)` : "NO (fresh start)"}`);
  console.log("");

  const startTime = Date.now();

  // Phase 1: Collections
  let collectionMap = new Map<number, string>();

  if (state.phase === "collections") {
    collectionMap = await importCollections(state);
  } else {
    // Rebuild collection map from DB for resume
    console.log("  (Rebuilding collection map from saved state...)");
    const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
    // Re-fetch collection list to build the ID map
    let url: string | null = `${BASE_URL}/custom_collections.json?limit=${PAGE_SIZE}&fields=id,handle`;
    while (url) {
      const { data, nextLink } = await shopifyFetch<{ custom_collections: { id: number; handle: string }[] }>(url);
      for (const col of data.custom_collections) {
        const cat = categories.find((c) => c.slug === slugify(col.handle));
        if (cat) collectionMap.set(col.id, cat.id);
      }
      url = nextLink;
    }
    url = `${BASE_URL}/smart_collections.json?limit=${PAGE_SIZE}&fields=id,handle`;
    while (url) {
      const { data, nextLink } = await shopifyFetch<{ smart_collections: { id: number; handle: string }[] }>(url);
      for (const col of data.smart_collections) {
        const cat = categories.find((c) => c.slug === slugify(col.handle));
        if (cat) collectionMap.set(col.id, cat.id);
      }
      url = nextLink;
    }
    console.log(`  (Rebuilt map: ${collectionMap.size} collections)`);
  }

  // Phase 2: Products
  if (state.phase === "products" || state.phase === "collections") {
    state.phase = "products";
    await importProducts(state);
  }

  // Phase 3: Product-Category mapping via Collects
  if (state.phase === "collects") {
    await importCollects(state, collectionMap);
  }

  // Done
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Print summary
  const totalProducts = await prisma.product.count();
  const totalVariants = await prisma.variant.count();
  const totalBrands = await prisma.brand.count();
  const totalCategories = await prisma.category.count();
  const totalMappings = await prisma.productCategory.count();

  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log("║  Import Complete                              ║");
  console.log("╚═══════════════════════════════════════════════╝");
  console.log(`  Products:   ${totalProducts}`);
  console.log(`  Variants:   ${totalVariants}`);
  console.log(`  Brands:     ${totalBrands}`);
  console.log(`  Categories: ${totalCategories}`);
  console.log(`  Mappings:   ${totalMappings}`);
  console.log(`  Duration:   ${elapsed}s`);
  console.log("");

  clearState();
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("\nFATAL ERROR:", err);
  console.error("\nState saved. Re-run to resume from last checkpoint.");
  await prisma.$disconnect();
  process.exit(1);
});

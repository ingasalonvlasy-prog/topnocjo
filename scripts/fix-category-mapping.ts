/**
 * Fix category mappings for smart collections
 *
 * The initial Shopify import only mapped custom collections (via /collects.json).
 * Smart collections use dynamic rules and aren't exposed through the collects endpoint.
 * This script fetches products per smart collection via the Shopify API and creates
 * the missing ProductCategory mappings.
 *
 * Usage: npx tsx scripts/fix-category-mapping.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// ── Config ──────────────────────────────────────────────────────────────────

const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN ?? "";
const SHOPIFY_STORE = "zt2xr1-ry.myshopify.com";
const API_VERSION = "2024-01";
const BASE_URL = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}`;
const RATE_LIMIT_MS = 520;

// ── Prisma ──────────────────────────────────────────────────────────────────

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

// ── Types ───────────────────────────────────────────────────────────────────

interface SmartCollection {
  id: number;
  title: string;
  handle: string;
  rules: { column: string; relation: string; condition: string }[];
  disjunctive: boolean;
}

// ── Utilities ───────────────────────────────────────────────────────────────

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

  let nextLink: string | null = null;
  const linkHeader = res.headers.get("link");
  if (linkHeader) {
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (match) nextLink = match[1];
  }

  const data = (await res.json()) as T;
  return { data, nextLink };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  // Pre-stats
  const totalProducts = await prisma.product.count();
  const productsWithCategory = await prisma.productCategory.groupBy({
    by: ["productId"],
  });
  const existingMappings = await prisma.productCategory.count();
  console.log(`\n=== FIX CATEGORY MAPPINGS ===`);
  console.log(`Before: ${productsWithCategory.length}/${totalProducts} products have categories (${(productsWithCategory.length / totalProducts * 100).toFixed(1)}%)`);
  console.log(`Existing mappings: ${existingMappings}\n`);

  // Build sourceId → dbProductId lookup map for fast matching
  console.log("Building sourceId lookup map...");
  const allProducts = await prisma.product.findMany({
    select: { id: true, sourceId: true },
    where: { sourceId: { not: null } },
  });
  const sourceIdMap = new Map<string, string>();
  for (const p of allProducts) {
    if (p.sourceId) sourceIdMap.set(p.sourceId, p.id);
  }
  console.log(`  ${sourceIdMap.size} products with sourceId loaded\n`);

  // Load all DB categories by slug for matching
  const allCategories = await prisma.category.findMany();
  const categoryBySlug = new Map<string, { id: string; name: string }>();
  for (const c of allCategories) {
    categoryBySlug.set(c.slug, { id: c.id, name: c.name });
  }
  console.log(`${allCategories.length} categories in DB\n`);

  // Phase 1: Fetch all smart collections from Shopify
  console.log("Phase 1: Fetching smart collections from Shopify...");
  const smartCollections: SmartCollection[] = [];
  let scUrl: string | null = `${BASE_URL}/smart_collections.json?limit=250`;
  while (scUrl) {
    const { data, nextLink } = await shopifyFetch<{ smart_collections: SmartCollection[] }>(scUrl);
    smartCollections.push(...data.smart_collections);
    scUrl = nextLink;
  }
  console.log(`  Found ${smartCollections.length} smart collections\n`);

  // Also fetch custom collections to cover ALL collections
  console.log("Fetching custom collections...");
  const customCollectionIds: { id: number; handle: string }[] = [];
  let ccUrl: string | null = `${BASE_URL}/custom_collections.json?limit=250&fields=id,handle`;
  while (ccUrl) {
    const { data, nextLink } = await shopifyFetch<{ custom_collections: { id: number; handle: string }[] }>(ccUrl);
    customCollectionIds.push(...data.custom_collections);
    ccUrl = nextLink;
  }
  console.log(`  Found ${customCollectionIds.length} custom collections\n`);

  // Phase 2 & 3: For each collection, fetch products and create mappings
  let totalNewMappings = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;
  let apiCalls = 0;

  // Process smart collections
  console.log("Phase 2: Processing smart collections...");
  for (const sc of smartCollections) {
    const slug = slugify(sc.handle);
    const category = categoryBySlug.get(slug) || categoryBySlug.get(sc.handle);
    if (!category) {
      console.log(`  SKIP: No DB category for smart collection "${sc.title}" (handle: ${sc.handle}, slug: ${slug})`);
      continue;
    }

    let collectionNewMappings = 0;
    let productUrl: string | null = `${BASE_URL}/products.json?collection_id=${sc.id}&fields=id&limit=250`;
    while (productUrl) {
      const { data, nextLink } = await shopifyFetch<{ products: { id: number }[] }>(productUrl);
      apiCalls++;

      for (const product of data.products) {
        const dbProductId = sourceIdMap.get(String(product.id));
        if (!dbProductId) {
          totalNotFound++;
          continue;
        }

        try {
          await prisma.productCategory.upsert({
            where: { productId_categoryId: { productId: dbProductId, categoryId: category.id } },
            update: {},
            create: { productId: dbProductId, categoryId: category.id },
          });
          collectionNewMappings++;
        } catch {
          totalSkipped++;
        }
      }

      productUrl = nextLink;
    }
    totalNewMappings += collectionNewMappings;
    if (collectionNewMappings > 0) {
      console.log(`  ✓ ${category.name}: +${collectionNewMappings} mappings`);
    }
  }

  // Process custom collections (re-mapping to catch any missed by collects)
  console.log("\nPhase 2b: Processing custom collections...");
  for (const cc of customCollectionIds) {
    const slug = slugify(cc.handle);
    const category = categoryBySlug.get(slug) || categoryBySlug.get(cc.handle);
    if (!category) continue;

    let collectionNewMappings = 0;
    let productUrl: string | null = `${BASE_URL}/products.json?collection_id=${cc.id}&fields=id&limit=250`;
    while (productUrl) {
      const { data, nextLink } = await shopifyFetch<{ products: { id: number }[] }>(productUrl);
      apiCalls++;

      for (const product of data.products) {
        const dbProductId = sourceIdMap.get(String(product.id));
        if (!dbProductId) {
          totalNotFound++;
          continue;
        }

        try {
          await prisma.productCategory.upsert({
            where: { productId_categoryId: { productId: dbProductId, categoryId: category.id } },
            update: {},
            create: { productId: dbProductId, categoryId: category.id },
          });
          collectionNewMappings++;
        } catch {
          totalSkipped++;
        }
      }

      productUrl = nextLink;
    }
    totalNewMappings += collectionNewMappings;
    if (collectionNewMappings > 0) {
      console.log(`  ✓ ${category.name}: +${collectionNewMappings} mappings`);
    }
  }

  // Phase 4: Summary
  const afterMappings = await prisma.productCategory.count();
  const afterWithCategory = await prisma.productCategory.groupBy({ by: ["productId"] });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

  console.log(`\n=== SUMMARY ===`);
  console.log(`API calls: ${apiCalls}`);
  console.log(`New/updated mappings processed: ${totalNewMappings}`);
  console.log(`Products not found in DB: ${totalNotFound}`);
  console.log(`Errors/skipped: ${totalSkipped}`);
  console.log(`\nBefore: ${productsWithCategory.length}/${totalProducts} products with categories (${(productsWithCategory.length / totalProducts * 100).toFixed(1)}%)`);
  console.log(`After:  ${afterWithCategory.length}/${totalProducts} products with categories (${(afterWithCategory.length / totalProducts * 100).toFixed(1)}%)`);
  console.log(`Total ProductCategory records: ${existingMappings} → ${afterMappings}`);
  console.log(`Products still without category: ${totalProducts - afterWithCategory.length}`);
  console.log(`Time: ${elapsed}s`);
}

// ── Fallback: productType → category mapping ───────────────────────────────

// Keyword-based rules: if productType contains keyword, map to category slug
// Order matters — first match wins. More specific rules should be first.
const PRODUCT_TYPE_RULES: [RegExp, string][] = [
  // Winter / skiing
  [/lyžař|lyzar|sjezdov|skialpov|běžk|bezk|ski\b|snowboard|splitboard/i, "zima"],
  [/kopačk|kopack|lisovk/i, "kopacky"],
  [/volejbal/i, "volejbalova-obuv"],
  [/ragby/i, "ragbyove-kopacky"],
  [/padel/i, "padelova-obuv"],
  [/halov|sálov|salov/i, "halova-obuv"],
  [/atletick|tretr/i, "atleticka-obuv"],
  // Running shoes
  [/běžec|bezec|running|trail.*obuv|obuv.*trail|obuv.*běh/i, "beh"],
  [/trekov|outdoor|horolez|lano|karabin|horolezec|bivak/i, "hory-a-outdoor"],
  // Cycling
  [/cykl|kolo\b|brompton|koloběžk|odrážed|bike|gravel/i, "doplnky"],
  // Clothing
  [/bund|kalhot|kraťas|mikiny?|trik[oač]|trič|košil|dres[y]?|kombinéz|vesty?|termoprádl|souprav|kabát|pláštěnk|funkčn[ií]|oblečen|šortk|sukn/i, "obleceni"],
  [/ponožk|čepic|čelenk|rukavic|nákrčník|šát[ek]|kukl|kšiltovk/i, "doplnky"],
  // Outdoor / hiking
  [/stan[y]?$|spací|karimatk|batoh|kemping|trekové|turistik/i, "hory-a-outdoor"],
  // Accessories / gear
  [/brýl|helm[ay]|chránič|odolné kufr/i, "doplnky"],
  // Shoes general
  [/obuv|bot[ay]|zimní bot/i, "beh"],
  // Sports general
  [/karate|kimona|jiu|jits|box/i, "doplnky"],
  // Catch-all for "Doplňky" type
  [/doplň[eě]k|příslušenstv|náhradn|světl|zvonek|lahv|adapt/i, "doplnky"],
  // Catch-all for Vyprodej
  [/výprode|vyprodej/i, "vyprodej"],
  // Catch remaining generic types
  [/legín|spodky|tepláky|plavk|prádle|boxerk|kalhotk|tílk/i, "obleceni"],
  [/termosk|lahv|gripy|omotávk|reflexn|organizér|taštičk|tašk/i, "doplnky"],
  [/stanový|stan\w* prut|stan\w* kolík|stan\w* podlážk/i, "hory-a-outdoor"],
  [/duše|plášť|ventil/i, "doplnky"],
];

async function fallbackProductTypeMapping(
  prismaClient: typeof prisma,
  categoryBySlug: Map<string, { id: string; name: string }>
) {
  console.log("\n=== FALLBACK: productType → category mapping ===\n");

  // Find all products without any category that have a productType
  const productsNoCat = await prismaClient.product.findMany({
    where: {
      categories: { none: {} },
      productType: { not: null },
    },
    select: { id: true, productType: true },
  });

  console.log(`Products without category + with productType: ${productsNoCat.length}`);

  let mapped = 0;
  let unmapped = 0;
  const unmappedTypes = new Map<string, number>();

  for (const product of productsNoCat) {
    const pt = product.productType || "";
    let matched = false;

    for (const [regex, slug] of PRODUCT_TYPE_RULES) {
      if (regex.test(pt)) {
        const category = categoryBySlug.get(slug);
        if (category) {
          try {
            await prismaClient.productCategory.upsert({
              where: { productId_categoryId: { productId: product.id, categoryId: category.id } },
              update: {},
              create: { productId: product.id, categoryId: category.id },
            });
            mapped++;
          } catch { /* skip */ }
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      unmapped++;
      unmappedTypes.set(pt, (unmappedTypes.get(pt) || 0) + 1);
    }
  }

  console.log(`  Mapped: ${mapped}`);
  console.log(`  Unmapped: ${unmapped}`);
  if (unmappedTypes.size > 0) {
    console.log(`  Top unmapped types:`);
    const sorted = [...unmappedTypes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    for (const [type, count] of sorted) {
      console.log(`    ${type}: ${count}`);
    }
  }

  return mapped;
}

async function run() {
  await main();

  // Load categories again for fallback
  const allCategories = await prisma.category.findMany();
  const categoryBySlug = new Map<string, { id: string; name: string }>();
  for (const c of allCategories) {
    categoryBySlug.set(c.slug, { id: c.id, name: c.name });
  }

  const fallbackMapped = await fallbackProductTypeMapping(prisma, categoryBySlug);

  // Final summary
  const totalProducts = await prisma.product.count();
  const finalWithCategory = await prisma.productCategory.groupBy({ by: ["productId"] });
  const finalMappings = await prisma.productCategory.count();

  console.log(`\n=== FINAL RESULTS ===`);
  console.log(`Products with categories: ${finalWithCategory.length}/${totalProducts} (${(finalWithCategory.length / totalProducts * 100).toFixed(1)}%)`);
  console.log(`Total ProductCategory records: ${finalMappings}`);
  console.log(`Products still without category: ${totalProducts - finalWithCategory.length}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  });

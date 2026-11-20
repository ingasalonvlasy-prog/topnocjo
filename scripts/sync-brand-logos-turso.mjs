/**
 * Sync brand logos to Turso production DB.
 * Updates brand.logo for all brands that have a generated SVG in /public/brands/
 * but no logo set in Turso.
 *
 * Run with: node scripts/sync-brand-logos-turso.mjs
 */
import { createClient } from "@libsql/client";
import { readdirSync } from "fs";
import { join } from "path";

const url = process.env.TURSO_URL || process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_URL/DATABASE_URL or TURSO_AUTH_TOKEN in env");
  process.exit(1);
}

console.log(`Connecting to: ${url.slice(0, 50)}...`);
const client = createClient({ url, authToken });

// Test connection
try {
  await client.execute("SELECT 1");
  console.log("Connection OK\n");
} catch (err) {
  console.error("Connection failed:", err.message);
  process.exit(1);
}

// Get all SVG files from /public/brands/
const brandsDir = join(process.cwd(), "public", "brands");
const svgFiles = readdirSync(brandsDir)
  .filter((f) => f.endsWith(".svg"))
  .map((f) => f.replace(".svg", ""));

console.log(`Found ${svgFiles.length} SVG files in /public/brands/\n`);

// Check current state in Turso
const { rows: tursobrands } = await client.execute(
  "SELECT slug, logo FROM brands ORDER BY slug"
);
console.log(`Turso has ${tursobrands.length} brands total`);

const noLogo = tursobrands.filter((b) => !b.logo || b.logo === "");
console.log(`${noLogo.length} brands without logo in Turso\n`);

// Build batch of UPDATEs
const BATCH_SIZE = 100;
let updated = 0;
let skipped = 0;

for (let i = 0; i < svgFiles.length; i += BATCH_SIZE) {
  const batch = svgFiles.slice(i, i + BATCH_SIZE);
  const statements = batch.map((slug) => ({
    sql: "UPDATE brands SET logo = ? WHERE slug = ? AND (logo IS NULL OR logo = '')",
    args: [`/brands/${slug}.svg`, slug],
  }));

  const results = await client.batch(statements);

  for (let j = 0; j < results.length; j++) {
    if (results[j].rowsAffected > 0) {
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: processed ${batch.length} brands`);
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped (already had logo or slug not found)`);

// Verify
const { rows: remaining } = await client.execute(
  "SELECT COUNT(*) as cnt FROM brands WHERE logo IS NULL OR logo = ''"
);
console.log(`Brands still without logo in Turso: ${remaining[0].cnt}`);

client.close();

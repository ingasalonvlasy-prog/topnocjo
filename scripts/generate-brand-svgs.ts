/**
 * Generate minimalist text-based SVG logos for brands without a logo.
 *
 * For each brand where logo IS NULL or empty:
 * 1. Generate an SVG with the brand name
 * 2. Save to /public/brands/{slug}.svg
 * 3. Update brand.logo in DB to /brands/{slug}.svg
 *
 * Run with: npx tsx scripts/generate-brand-svgs.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import * as fs from "fs";
import * as path from "path";

function createPrisma() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const adapter = new PrismaLibSql({
    url,
    ...(authToken ? { authToken } : {}),
  });
  return new PrismaClient({ adapter });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate SVG based on brand name length:
 * - <= 3 chars: monogram in circle (Style C)
 * - <= 12 chars: uppercase bold (Style A)
 * - > 12 chars: title case, smaller font (Style B)
 */
function generateSvg(name: string): string {
  const escaped = escapeXml(name);
  const len = name.length;

  // Navy color from Qsport design system
  const navy = "#0B1727";

  if (len <= 3) {
    // Style C: Monogram in circle
    const monogram = escapeXml(name.toUpperCase());
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80">
  <circle cx="100" cy="40" r="32" fill="none" stroke="${navy}" stroke-width="2.5"/>
  <text x="100" y="48" text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-weight="800" font-size="28"
    fill="${navy}">${monogram}</text>
</svg>`;
  }

  if (len <= 12) {
    // Style A: Uppercase bold
    const upper = escapeXml(name.toUpperCase());
    // Scale font size down for longer names
    const fontSize = len <= 6 ? 28 : len <= 9 ? 22 : 18;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80">
  <text x="100" y="48" text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-weight="800" font-size="${fontSize}"
    letter-spacing="0.08em" fill="${navy}">${upper}</text>
</svg>`;
  }

  // Style B: Title case, smaller font for long names
  const fontSize = len <= 16 ? 16 : len <= 20 ? 14 : 12;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80">
  <text x="100" y="48" text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-weight="700" font-size="${fontSize}"
    letter-spacing="0.04em" fill="${navy}">${escaped}</text>
</svg>`;
}

async function main() {
  const prisma = createPrisma();
  const brandsDir = path.join(process.cwd(), "public", "brands");

  // Ensure directory exists
  if (!fs.existsSync(brandsDir)) {
    fs.mkdirSync(brandsDir, { recursive: true });
  }

  // Fetch brands without a logo
  const brands = await prisma.brand.findMany({
    where: {
      OR: [
        { logo: null },
        { logo: "" },
      ],
    },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  console.log(`Found ${brands.length} brands without logo\n`);

  let generated = 0;
  let skipped = 0;

  for (const brand of brands) {
    const svgPath = path.join(brandsDir, `${brand.slug}.svg`);
    const logoUrl = `/brands/${brand.slug}.svg`;

    // Skip if SVG already exists on disk (manual logo)
    if (fs.existsSync(svgPath)) {
      console.log(`  SKIP ${brand.name} — file already exists`);
      // But still update DB if logo field is empty
      await prisma.brand.update({
        where: { id: brand.id },
        data: { logo: logoUrl },
      });
      skipped++;
      continue;
    }

    const svg = generateSvg(brand.name);
    fs.writeFileSync(svgPath, svg, "utf-8");

    await prisma.brand.update({
      where: { id: brand.id },
      data: { logo: logoUrl },
    });

    console.log(`  OK ${brand.name} → ${logoUrl}`);
    generated++;
  }

  console.log(`\nDone: ${generated} generated, ${skipped} skipped (file existed)`);
  console.log(`Total brands with logo now: ${brands.length - skipped + generated + 6} (6 had logos before)`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

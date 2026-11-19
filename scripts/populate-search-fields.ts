/**
 * Populate nameSearch fields for products and brands.
 * nameSearch = stripped diacritics, lowercase, includes name + productType + brand name + category names.
 * Run with: npx tsx scripts/populate-search-fields.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function createPrisma() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const adapter = new PrismaLibSql({
    url,
    ...(authToken ? { authToken } : {}),
  });
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrisma();
  console.log("Populating nameSearch fields...");

  // Brands
  const brands = await prisma.brand.findMany({ select: { id: true, name: true } });
  const brandMap = new Map<string, string>();
  let brandCount = 0;
  for (const b of brands) {
    const ns = stripDiacritics(b.name).toLowerCase();
    brandMap.set(b.id, b.name);
    await prisma.brand.update({
      where: { id: b.id },
      data: { nameSearch: ns },
    });
    brandCount++;
  }
  console.log(`  Brands: ${brandCount} updated`);

  // Products — combine name + productType + brand name + category names
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      productType: true,
      brandId: true,
      categories: { include: { category: { select: { name: true } } } },
    },
  });
  let productCount = 0;
  for (const p of products) {
    const parts = [p.name];
    if (p.productType) parts.push(p.productType);
    const brandName = brandMap.get(p.brandId);
    if (brandName) parts.push(brandName);
    for (const pc of p.categories) {
      parts.push(pc.category.name);
    }
    const ns = stripDiacritics(parts.join(" ")).toLowerCase();
    await prisma.product.update({
      where: { id: p.id },
      data: { nameSearch: ns },
    });
    productCount++;
    if (productCount % 500 === 0) console.log(`  Products: ${productCount}/${products.length}`);
  }
  console.log(`  Products: ${productCount} updated`);

  console.log("Done!");
  await prisma.$disconnect();
}

main().catch(console.error);

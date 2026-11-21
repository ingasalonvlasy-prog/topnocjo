/**
 * Fix brand logos: set logo path for all brands that have a matching SVG file.
 * Usage: npx tsx scripts/fix-brand-logos.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { existsSync } from "fs";
import { join } from "path";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const adapter = new PrismaLibSql({
  url,
  ...(authToken ? { authToken } : {}),
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const brands = await prisma.brand.findMany({
    select: { id: true, slug: true, logo: true },
  });

  console.log(`Total brands: ${brands.length}`);

  let updated = 0;
  let alreadySet = 0;
  let noSvg = 0;

  for (const brand of brands) {
    const svgPath = `/brands/${brand.slug}.svg`;
    const filePath = join(process.cwd(), "public", "brands", `${brand.slug}.svg`);

    if (!existsSync(filePath)) {
      noSvg++;
      continue;
    }

    if (brand.logo === svgPath) {
      alreadySet++;
      continue;
    }

    await prisma.brand.update({
      where: { id: brand.id },
      data: { logo: svgPath },
    });
    updated++;
  }

  console.log(`Updated: ${updated}`);
  console.log(`Already set: ${alreadySet}`);
  console.log(`No SVG found: ${noSvg}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

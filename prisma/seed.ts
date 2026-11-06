import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  console.log("Seeding database...");

  // Brands
  const brands = await Promise.all(
    [
      { name: "Mizuno", slug: "mizuno" },
      { name: "Husky", slug: "husky" },
      { name: "POC", slug: "poc" },
      { name: "Leki", slug: "leki" },
      { name: "On Running", slug: "on-running" },
    ].map((b) => prisma.brand.create({ data: b }))
  );

  const [mizuno, husky, poc, leki, onRunning] = brands;

  // Categories
  const categories = await Promise.all(
    [
      { name: "Kopačky", slug: "kopacky", position: 1, seoTitle: "Kopačky | Qsport.cz", seoDesc: "Široký výběr kopaček od předních značek." },
      { name: "Volejbalová obuv", slug: "volejbalova-obuv", position: 2, seoTitle: "Volejbalová obuv | Qsport.cz", seoDesc: "Kvalitní volejbalové boty pro každou úroveň." },
      { name: "Lyžařské bundy", slug: "lyzarske-bundy", position: 3, seoTitle: "Lyžařské bundy | Qsport.cz", seoDesc: "Lyžařské bundy od značek Husky a POC." },
      { name: "Běžecké boty", slug: "bezecke-boty", position: 4, seoTitle: "Běžecké boty | Qsport.cz", seoDesc: "Běžecká obuv On Running, Mizuno a dalších značek." },
      { name: "Cyklo helmy", slug: "cyklo-helmy", position: 5, seoTitle: "Cyklo helmy | Qsport.cz", seoDesc: "Cyklistické helmy pro bezpečnou jízdu." },
    ].map((c) => prisma.category.create({ data: c }))
  );

  const [kopacky, volejbal, lyzBundy, bezecke, cykloHelmy] = categories;

  // Product definitions
  const productDefs: {
    name: string;
    brandId: string;
    categoryId: string;
    productType: string;
    sizes: string[];
    basePrice: number;
    comparePrice?: number;
  }[] = [
    // Kopačky - Mizuno (10 products)
    { name: "Mizuno Morelia Neo IV", brandId: mizuno.id, categoryId: kopacky.id, productType: "Kopačky", sizes: ["39", "40", "41", "42", "43", "44", "45"], basePrice: 6490, comparePrice: 7990 },
    { name: "Mizuno Morelia II Pro", brandId: mizuno.id, categoryId: kopacky.id, productType: "Kopačky", sizes: ["40", "41", "42", "43", "44"], basePrice: 5990 },
    { name: "Mizuno Alpha Select", brandId: mizuno.id, categoryId: kopacky.id, productType: "Kopačky", sizes: ["39", "40", "41", "42", "43"], basePrice: 3490, comparePrice: 4290 },
    { name: "Mizuno Monarcida Neo III", brandId: mizuno.id, categoryId: kopacky.id, productType: "Kopačky", sizes: ["40", "41", "42", "43", "44", "45"], basePrice: 2290 },
    { name: "Mizuno Rebula Cup", brandId: mizuno.id, categoryId: kopacky.id, productType: "Kopačky", sizes: ["41", "42", "43", "44"], basePrice: 4990 },
    { name: "Mizuno Morelia Neo IV Beta", brandId: mizuno.id, categoryId: kopacky.id, productType: "Kopačky", sizes: ["40", "41", "42", "43"], basePrice: 5490, comparePrice: 6990 },
    { name: "Mizuno Alpha Japan", brandId: mizuno.id, categoryId: kopacky.id, productType: "Kopačky", sizes: ["39", "40", "41", "42", "43", "44"], basePrice: 7990 },
    { name: "Mizuno Morelia Sala Classic", brandId: mizuno.id, categoryId: kopacky.id, productType: "Sálová obuv", sizes: ["39", "40", "41", "42", "43", "44", "45"], basePrice: 2490 },
    { name: "Mizuno Sala Premium IV", brandId: mizuno.id, categoryId: kopacky.id, productType: "Sálová obuv", sizes: ["40", "41", "42", "43"], basePrice: 3290, comparePrice: 3990 },
    { name: "Mizuno Morelia Neo III Pro AG", brandId: mizuno.id, categoryId: kopacky.id, productType: "Kopačky", sizes: ["41", "42", "43", "44", "45"], basePrice: 4290 },

    // Volejbal - Mizuno (10 products)
    { name: "Mizuno Wave Lightning Z8", brandId: mizuno.id, categoryId: volejbal.id, productType: "Volejbalová obuv", sizes: ["38", "39", "40", "41", "42", "43", "44", "45", "46"], basePrice: 4290, comparePrice: 4990 },
    { name: "Mizuno Wave Momentum 3", brandId: mizuno.id, categoryId: volejbal.id, productType: "Volejbalová obuv", sizes: ["40", "41", "42", "43", "44", "45"], basePrice: 4790 },
    { name: "Mizuno Wave Voltage", brandId: mizuno.id, categoryId: volejbal.id, productType: "Volejbalová obuv", sizes: ["39", "40", "41", "42", "43", "44"], basePrice: 2490 },
    { name: "Mizuno Cyclone Speed 4", brandId: mizuno.id, categoryId: volejbal.id, productType: "Volejbalová obuv", sizes: ["38", "39", "40", "41", "42", "43"], basePrice: 1990, comparePrice: 2490 },
    { name: "Mizuno Wave Supersonic 2", brandId: mizuno.id, categoryId: volejbal.id, productType: "Volejbalová obuv", sizes: ["40", "41", "42", "43", "44", "45"], basePrice: 2990 },
    { name: "Mizuno Thunder Blade Z", brandId: mizuno.id, categoryId: volejbal.id, productType: "Volejbalová obuv", sizes: ["39", "40", "41", "42", "43", "44"], basePrice: 2290, comparePrice: 2790 },
    { name: "Mizuno Wave Lightning Z7", brandId: mizuno.id, categoryId: volejbal.id, productType: "Volejbalová obuv", sizes: ["41", "42", "43", "44", "45"], basePrice: 3490 },
    { name: "Mizuno Wave Luminous 2", brandId: mizuno.id, categoryId: volejbal.id, productType: "Volejbalová obuv", sizes: ["40", "41", "42", "43"], basePrice: 2690 },
    { name: "Mizuno Wave Dimension", brandId: mizuno.id, categoryId: volejbal.id, productType: "Volejbalová obuv", sizes: ["39", "40", "41", "42", "43", "44", "45"], basePrice: 3990, comparePrice: 4490 },
    { name: "Mizuno Wave Mirage 4", brandId: mizuno.id, categoryId: volejbal.id, productType: "Volejbalová obuv", sizes: ["40", "41", "42", "43", "44"], basePrice: 4990 },

    // Lyžařské bundy - Husky (10 products)
    { name: "Husky Gambola M", brandId: husky.id, categoryId: lyzBundy.id, productType: "Lyžařská bunda", sizes: ["S", "M", "L", "XL", "XXL"], basePrice: 5990, comparePrice: 7490 },
    { name: "Husky Gambola W", brandId: husky.id, categoryId: lyzBundy.id, productType: "Lyžařská bunda", sizes: ["XS", "S", "M", "L", "XL"], basePrice: 5990, comparePrice: 7490 },
    { name: "Husky Montry M", brandId: husky.id, categoryId: lyzBundy.id, productType: "Lyžařská bunda", sizes: ["M", "L", "XL", "XXL"], basePrice: 4490 },
    { name: "Husky Montry W", brandId: husky.id, categoryId: lyzBundy.id, productType: "Lyžařská bunda", sizes: ["S", "M", "L", "XL"], basePrice: 4490 },
    { name: "Husky Norel M", brandId: husky.id, categoryId: lyzBundy.id, productType: "Lyžařská bunda", sizes: ["S", "M", "L", "XL", "XXL"], basePrice: 3990, comparePrice: 4990 },
    { name: "Husky Norel W", brandId: husky.id, categoryId: lyzBundy.id, productType: "Lyžařská bunda", sizes: ["XS", "S", "M", "L", "XL"], basePrice: 3990, comparePrice: 4990 },
    { name: "POC Meander Jacket", brandId: poc.id, categoryId: lyzBundy.id, productType: "Lyžařská bunda", sizes: ["S", "M", "L", "XL"], basePrice: 8990 },
    { name: "POC Mantle Insulated Jacket", brandId: poc.id, categoryId: lyzBundy.id, productType: "Lyžařská bunda", sizes: ["M", "L", "XL"], basePrice: 11990, comparePrice: 13990 },
    { name: "POC Pure-Lite Splash Jacket", brandId: poc.id, categoryId: lyzBundy.id, productType: "Lyžařská bunda", sizes: ["S", "M", "L", "XL", "XXL"], basePrice: 6990 },
    { name: "Husky Gomez M", brandId: husky.id, categoryId: lyzBundy.id, productType: "Lyžařská bunda", sizes: ["M", "L", "XL"], basePrice: 6490, comparePrice: 7990 },

    // Běžecké boty - On Running (10 products)
    { name: "On Cloudmonster 2", brandId: onRunning.id, categoryId: bezecke.id, productType: "Běžecká obuv", sizes: ["40", "41", "42", "42.5", "43", "44", "44.5", "45", "46"], basePrice: 4490 },
    { name: "On Cloudsurfer", brandId: onRunning.id, categoryId: bezecke.id, productType: "Běžecká obuv", sizes: ["41", "42", "43", "44", "45"], basePrice: 4190 },
    { name: "On Cloud 5", brandId: onRunning.id, categoryId: bezecke.id, productType: "Běžecká obuv", sizes: ["39", "40", "41", "42", "43", "44", "45", "46"], basePrice: 3690 },
    { name: "On Cloudflow 4", brandId: onRunning.id, categoryId: bezecke.id, productType: "Běžecká obuv", sizes: ["40", "41", "42", "43", "44", "45"], basePrice: 4290, comparePrice: 4690 },
    { name: "On Cloudstratus 3", brandId: onRunning.id, categoryId: bezecke.id, productType: "Běžecká obuv", sizes: ["41", "42", "43", "44", "45"], basePrice: 4790 },
    { name: "On Cloudrunner 2", brandId: onRunning.id, categoryId: bezecke.id, productType: "Běžecká obuv", sizes: ["40", "41", "42", "43", "44", "45", "46"], basePrice: 3990 },
    { name: "Mizuno Wave Rider 28", brandId: mizuno.id, categoryId: bezecke.id, productType: "Běžecká obuv", sizes: ["40", "41", "42", "43", "44", "45"], basePrice: 4290, comparePrice: 4990 },
    { name: "Mizuno Wave Inspire 20", brandId: mizuno.id, categoryId: bezecke.id, productType: "Běžecká obuv", sizes: ["41", "42", "43", "44", "45"], basePrice: 3990 },
    { name: "Mizuno Wave Sky 7", brandId: mizuno.id, categoryId: bezecke.id, productType: "Běžecká obuv", sizes: ["40", "41", "42", "43", "44"], basePrice: 4690 },
    { name: "On Cloudeclipse", brandId: onRunning.id, categoryId: bezecke.id, productType: "Běžecká obuv", sizes: ["40", "41", "42", "43", "44", "45"], basePrice: 4990, comparePrice: 5490 },

    // Cyklo helmy - POC + Leki (10 products)
    { name: "POC Omne Air MIPS", brandId: poc.id, categoryId: cykloHelmy.id, productType: "Cyklo helma", sizes: ["S", "M", "L"], basePrice: 3290 },
    { name: "POC Ventral Air MIPS", brandId: poc.id, categoryId: cykloHelmy.id, productType: "Cyklo helma", sizes: ["S", "M", "L"], basePrice: 6990, comparePrice: 7990 },
    { name: "POC Kortal Race MIPS", brandId: poc.id, categoryId: cykloHelmy.id, productType: "Cyklo helma", sizes: ["S", "M-L", "XL-XXL"], basePrice: 5490 },
    { name: "POC Tectal", brandId: poc.id, categoryId: cykloHelmy.id, productType: "Cyklo helma", sizes: ["S", "M-L", "XL-XXL"], basePrice: 3990, comparePrice: 4990 },
    { name: "POC Omne Lite", brandId: poc.id, categoryId: cykloHelmy.id, productType: "Cyklo helma", sizes: ["S", "M", "L"], basePrice: 4490 },
    { name: "POC Aspire", brandId: poc.id, categoryId: cykloHelmy.id, productType: "Cyklo helma", sizes: ["S", "M", "L"], basePrice: 5990 },
    { name: "POC Octal X MIPS", brandId: poc.id, categoryId: cykloHelmy.id, productType: "Cyklo helma", sizes: ["S", "M", "L"], basePrice: 7490 },
    { name: "Leki Ultralight III", brandId: leki.id, categoryId: cykloHelmy.id, productType: "Cyklo helma", sizes: ["S", "M", "L", "XL"], basePrice: 1990 },
    { name: "Leki Pro Shield", brandId: leki.id, categoryId: cykloHelmy.id, productType: "Cyklo helma", sizes: ["S-M", "L-XL"], basePrice: 2490, comparePrice: 2990 },
    { name: "POC Myelin", brandId: poc.id, categoryId: cykloHelmy.id, productType: "Cyklo helma", sizes: ["S", "M", "L"], basePrice: 2790 },
  ];

  console.log(`Creating ${productDefs.length} products with variants...`);

  let skuCounter = 1000;

  for (const def of productDefs) {
    const slug = slugify(def.name);
    const product = await prisma.product.create({
      data: {
        name: def.name,
        slug,
        description: `${def.name} - kvalitní ${def.productType.toLowerCase()} od značky ${brands.find((b) => b.id === def.brandId)!.name}.`,
        bodyHtml: `<p>${def.name} je skvělou volbou pro každého sportovce. Kombinuje moderní technologie s pohodlím a stylem.</p>`,
        brandId: def.brandId,
        productType: def.productType,
        tags: JSON.stringify([def.productType.toLowerCase()]),
        seoTitle: `${def.name} | Qsport.cz`,
        seoDescription: `Koupit ${def.name} za skvělou cenu. ${def.productType} skladem, rychlé doručení.`,
        photos: JSON.stringify([`https://placehold.co/800x800/e2e8f0/475569?text=${encodeURIComponent(def.name.substring(0, 20))}`]),
        status: "ACTIVE",
      },
    });

    // Create variants for each size
    for (let i = 0; i < def.sizes.length; i++) {
      skuCounter++;
      await prisma.variant.create({
        data: {
          productId: product.id,
          sku: `QS-${skuCounter}`,
          title: def.sizes[i],
          size: def.sizes[i],
          price: def.basePrice,
          comparePrice: def.comparePrice ?? null,
          costPrice: Math.round(def.basePrice * 0.5),
          stock: Math.floor(Math.random() * 15) + 1,
          weight: Math.floor(Math.random() * 500) + 200,
          position: i,
        },
      });
    }

    // Link product to category
    await prisma.productCategory.create({
      data: {
        productId: product.id,
        categoryId: def.categoryId,
      },
    });
  }

  console.log("Seed completed!");
  const counts = {
    brands: await prisma.brand.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    variants: await prisma.variant.count(),
  };
  console.log(counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

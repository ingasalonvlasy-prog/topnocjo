import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Strip Czech diacritics so "beh" matches "Běh" */
function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ products: [], brands: [], categories: [] });
  }

  const qNorm = stripDiacritics(q).toLowerCase();

  const [products, brands, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { nameSearch: { contains: qNorm } },
          { name: { contains: q } },
          { brand: { nameSearch: { contains: qNorm } } },
          { brand: { name: { contains: q } } },
          { productType: { contains: q } },
          { tags: { contains: q } },
        ],
      },
      include: {
        variants: { where: { active: true }, orderBy: { position: "asc" } },
        brand: true,
      },
      take: 50,
    }),
    prisma.brand.findMany({
      where: {
        OR: [
          { nameSearch: { contains: qNorm } },
          { name: { contains: q } },
        ],
      },
      take: 5,
    }),
    prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { slug: { contains: qNorm } },
        ],
      },
      take: 5,
    }),
  ]);

  // Score & rank products — better matches first
  function scoreProduct(p: (typeof products)[0]): number {
    let score = 0;
    const nameNorm = stripDiacritics(p.name.toLowerCase());
    const brandNorm = stripDiacritics(p.brand.name.toLowerCase());

    // Exact name start = highest priority
    if (nameNorm.startsWith(qNorm)) score += 100;
    // Brand exact match
    if (brandNorm === qNorm) score += 80;
    // Name contains query
    if (nameNorm.includes(qNorm)) score += 50;
    // Brand starts with query
    if (brandNorm.startsWith(qNorm)) score += 40;
    // Tag match
    try {
      const tags: string[] = JSON.parse(p.tags || "[]");
      if (tags.some((t) => stripDiacritics(t.toLowerCase()).includes(qNorm))) score += 30;
    } catch { /* ignore */ }

    // Stock: bigger weight
    const hasOwnStock = p.variants.some((v) => v.ownStock > 0);
    const hasSupplierStock = p.variants.some((v) => v.supplierStock > 0);
    if (hasOwnStock) score += 40;
    else if (hasSupplierStock) score += 20;

    // Has real photo
    const photos: string[] = JSON.parse(p.photos || "[]");
    if (photos.length > 0 && photos[0]?.includes("shopify")) score += 10;

    // Has sale price
    const hasSale = p.variants.some((v) => v.comparePrice && v.comparePrice > v.price);
    if (hasSale) score += 5;

    return score;
  }

  products.sort((a, b) => scoreProduct(b) - scoreProduct(a));

  // Take top 8
  const topProducts = products.slice(0, 8);

  return NextResponse.json({
    products: topProducts.map((p) => {
      const photos: string[] = JSON.parse(p.photos || "[]");
      const minPrice = p.variants.length > 0 ? Math.min(...p.variants.map((v) => v.price)) : 0;
      const minVariant = p.variants.find((v) => v.price === minPrice);
      const comparePrice = minVariant?.comparePrice ?? null;
      const hasOwnStock = p.variants.some((v) => v.ownStock > 0);
      const hasSupplierStock = p.variants.some((v) => v.supplierStock > 0);

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand.name,
        photo: photos[0] || null,
        price: minPrice,
        comparePrice: comparePrice && comparePrice > minPrice ? comparePrice : null,
        inStock: hasOwnStock,
        onOrder: !hasOwnStock && hasSupplierStock,
      };
    }),
    brands: brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })),
  });
}

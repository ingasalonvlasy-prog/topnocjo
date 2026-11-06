import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ products: [], brands: [], categories: [] });
  }

  const [products, brands, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { name: { contains: q } },
          { brand: { name: { contains: q } } },
          { productType: { contains: q } },
        ],
      },
      include: {
        variants: { where: { active: true }, orderBy: { position: "asc" }, take: 1 },
        brand: true,
      },
      take: 6,
    }),
    prisma.brand.findMany({
      where: { name: { contains: q } },
      take: 3,
    }),
    prisma.category.findMany({
      where: {
        name: { contains: q },
        parentId: null,
      },
      take: 3,
    }),
  ]);

  return NextResponse.json({
    products: products.map((p) => {
      const photos: string[] = JSON.parse(p.photos || "[]");
      const price = p.variants[0]?.price ?? 0;
      const comparePrice = p.variants[0]?.comparePrice ?? null;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand.name,
        photo: photos[0] || null,
        price,
        comparePrice,
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

import { prisma } from "./db";

export interface FilterOptions {
  brands: { slug: string; name: string; count: number }[];
  sizes: string[];
  priceRange: { min: number; max: number };
}

export async function getFilterOptions(categoryId?: string): Promise<FilterOptions> {
  const categoryFilter = categoryId
    ? { product: { categories: { some: { categoryId } }, status: "ACTIVE" } }
    : { product: { status: "ACTIVE" } };

  const [variants, brandData] = await Promise.all([
    prisma.variant.findMany({
      where: { active: true, ...categoryFilter },
      select: { size: true, price: true },
    }),
    prisma.brand.findMany({
      where: {
        products: categoryId
          ? { some: { status: "ACTIVE", categories: { some: { categoryId } } } }
          : { some: { status: "ACTIVE" } },
      },
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean) as string[])].sort((a, b) => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  const prices = variants.map((v) => v.price);
  const priceRange = {
    min: prices.length > 0 ? Math.min(...prices) : 0,
    max: prices.length > 0 ? Math.max(...prices) : 0,
  };

  const brands = brandData.map((b) => ({
    slug: b.slug,
    name: b.name,
    count: b._count.products,
  }));

  return { brands, sizes, priceRange };
}

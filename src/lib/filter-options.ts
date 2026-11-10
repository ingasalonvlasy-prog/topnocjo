import { prisma } from "./db";

export interface FilterOptions {
  brands: { slug: string; name: string; count: number }[];
  sizes: string[];
  priceRange: { min: number; max: number };
}

export async function getFilterOptions(categoryId?: string, opts?: { saleOnly?: boolean }): Promise<FilterOptions> {
  const saleOnly = opts?.saleOnly;
  const saleVariantFilter = saleOnly ? { comparePrice: { not: null, gt: 0 } } : {};

  const productFilter = {
    status: "ACTIVE" as const,
    ...(categoryId ? { categories: { some: { categoryId } } } : {}),
    ...(saleOnly ? { variants: { some: { active: true, comparePrice: { not: null, gt: 0 } } } } : {}),
  };

  const categoryFilter = {
    product: productFilter,
  };

  const [variants, brandData] = await Promise.all([
    prisma.variant.findMany({
      where: { active: true, ...categoryFilter, ...saleVariantFilter },
      select: { size: true, price: true },
    }),
    prisma.brand.findMany({
      where: {
        products: { some: productFilter },
      },
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: productFilter } } },
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

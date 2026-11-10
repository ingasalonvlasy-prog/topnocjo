import { prisma } from "./db";
import { Prisma } from "@prisma/client";

export type ProductWithVariants = Prisma.ProductGetPayload<{
  include: { variants: true; brand: true; categories: { include: { category: true } } };
}>;

export interface GetProductsParams {
  categoryId?: string;
  brandSlug?: string;
  size?: string;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  sort?: "price_asc" | "price_desc" | "name" | "newest";
  page?: number;
  perPage?: number;
  inStock?: boolean;
}

export async function getFilteredProducts(params: GetProductsParams): Promise<{
  items: ProductWithVariants[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const {
    categoryId,
    brandSlug,
    size,
    priceMin,
    priceMax,
    search,
    sort = "newest",
    page = 1,
    perPage = 48,
    inStock,
  } = params;

  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
  };

  if (categoryId) {
    where.categories = { some: { categoryId } };
  }

  if (brandSlug) {
    where.brand = { slug: brandSlug };
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { brand: { name: { contains: search } } },
      { productType: { contains: search } },
    ];
  }

  if (size) {
    where.variants = { some: { size, active: true } };
  }

  if (priceMin !== undefined || priceMax !== undefined || inStock) {
    const variantWhere: Prisma.VariantWhereInput = { active: true };
    if (priceMin !== undefined) variantWhere.price = { ...variantWhere.price as object, gte: priceMin };
    if (priceMax !== undefined) variantWhere.price = { ...variantWhere.price as object, lte: priceMax };
    if (inStock) {
      variantWhere.OR = [
        { ownStock: { gt: 0 } },
        { supplierStock: { gt: 0 } },
      ];
    }
    where.variants = { some: variantWhere };
  }

  const isPriceSort = sort === "price_asc" || sort === "price_desc";

  let orderBy: Prisma.ProductOrderByWithRelationInput;
  switch (sort) {
    case "name":
      orderBy = { name: "asc" };
      break;
    case "price_asc":
    case "price_desc":
    case "newest":
    default:
      orderBy = { createdAt: "desc" };
  }

  const include = {
    variants: { where: { active: true }, orderBy: { position: "asc" } as const },
    brand: true as const,
    categories: { include: { category: true } },
  };

  if (isPriceSort) {
    // Fetch all matching products, sort by min variant price in JS
    const [allItems, total] = await Promise.all([
      prisma.product.findMany({ where, include, orderBy }),
      prisma.product.count({ where }),
    ]);

    allItems.sort((a, b) => {
      const aMin = a.variants.length > 0 ? Math.min(...a.variants.map((v) => v.price)) : 0;
      const bMin = b.variants.length > 0 ? Math.min(...b.variants.map((v) => v.price)) : 0;
      return sort === "price_asc" ? aMin - bMin : bMin - aMin;
    });

    const items = allItems.slice((page - 1) * perPage, page * perPage);

    return {
      items,
      total,
      page,
      totalPages: total > 0 ? Math.ceil(total / perPage) : 1,
    };
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    totalPages: total > 0 ? Math.ceil(total / perPage) : 1,
  };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      variants: { where: { active: true }, orderBy: { position: "asc" } },
      brand: true,
      categories: { include: { category: true } },
    },
  });
}

export function getMinPrice(variants: { price: number }[]): number {
  return Math.min(...variants.map((v) => v.price));
}

export function getComparePrice(variants: { comparePrice: number | null }[]): number | null {
  const prices = variants.filter((v) => v.comparePrice).map((v) => v.comparePrice!);
  return prices.length > 0 ? Math.min(...prices) : null;
}

export async function getRelatedProducts(productId: string, brandId: string, categoryIds: string[], limit = 4) {
  // "Hodí se k tomu" = complementary products: same brand, DIFFERENT category
  const complementary = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      id: { not: productId },
      brandId,
      ...(categoryIds.length > 0 ? { categories: { none: { categoryId: { in: categoryIds } } } } : {}),
    },
    include: {
      variants: { where: { active: true }, orderBy: { position: "asc" } },
      brand: true,
      categories: { include: { category: true } },
    },
    take: limit,
  });

  // If not enough complementary, fill with other brands from different categories
  if (complementary.length < limit) {
    const excludeIds = [productId, ...complementary.map((p) => p.id)];
    const more = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        id: { notIn: excludeIds },
        ...(categoryIds.length > 0 ? { categories: { none: { categoryId: { in: categoryIds } } } } : {}),
      },
      include: {
        variants: { where: { active: true }, orderBy: { position: "asc" } },
        brand: true,
        categories: { include: { category: true } },
      },
      take: limit - complementary.length,
    });
    return [...complementary, ...more];
  }

  return complementary;
}

export function formatPrice(amount: number): string {
  const formatted = new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted}\u00A0Kč`;
}

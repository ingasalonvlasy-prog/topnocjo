import { prisma } from "./db";

export type SizeType = "shoe" | "clothing" | "kids_height" | "unknown";

export interface FilterOptions {
  brands: { slug: string; name: string; count: number }[];
  sizes: string[];
  sizeType: SizeType | "mixed" | null;
  priceRange: { min: number; max: number };
}

// Standard clothing sizes
const CLOTHING_SIZES = new Set([
  "XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL",
  "SML", "UNI", "ONESIZE", "ONE SIZE",
]);

// Composite clothing sizes
const COMPOSITE_RE = /^(X{0,2}S|S|M|L|X{1,3}L)\/(X{0,2}S|S|M|L|X{1,3}L)$/i;

/**
 * Returns true for real wearable sizes (clothing S–5XL, shoes 16–52, kids 86–176).
 * Rejects SKU codes, volumes, colors, and other garbage from Shopify imports.
 */
export function isValidSize(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;

  // Reject anything with underscores (SKU codes like 32ED7B65LC07_XL)
  if (s.includes("_")) return false;
  // Reject anything longer than 8 chars
  if (s.length > 8) return false;
  // Reject anything with units (l, kg, mm, ml, cm preceded by space or digit)
  if (/\d\s*(l|kg|mm|ml|cm)$/i.test(s)) return false;
  // Reject color names and other non-size text with lowercase letters longer than 3
  if (/^[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s]{4,}$/.test(s)) return false;

  const upper = s.toUpperCase().replace(/\s+/g, " ").trim();

  // Standard clothing sizes
  if (CLOTHING_SIZES.has(upper)) return true;

  // Composite like S/M, L/XL
  if (COMPOSITE_RE.test(s)) return true;

  // Numeric with optional .5 or ,5 — shoe sizes (16–52) or kids (80–176)
  const num = parseFloat(s.replace(",", "."));
  if (!isNaN(num) && /^\d{2,3}([.,]\d)?$/.test(s)) {
    if (num >= 16 && num <= 52) return true;
    if (num >= 80 && num <= 176) return true;
  }

  return false;
}

export function classifySizeType(size: string): SizeType {
  const s = size.trim();
  const upper = s.toUpperCase().replace(/\s+/g, " ").trim();

  if (CLOTHING_SIZES.has(upper)) return "clothing";
  if (COMPOSITE_RE.test(s)) return "clothing";

  const num = parseFloat(s.replace(",", "."));
  if (!isNaN(num) && /^\d{2,3}([.,]\d)?$/.test(s)) {
    if (num >= 16 && num <= 52) return "shoe";
    if (num >= 80 && num <= 176) return "kids_height";
  }

  return "unknown";
}

export async function getFilterOptions(categoryId?: string | string[], opts?: { saleOnly?: boolean; brandSlug?: string; search?: string }): Promise<FilterOptions> {
  const saleOnly = opts?.saleOnly;
  const brandSlug = opts?.brandSlug;
  const search = opts?.search;
  const saleVariantFilter = saleOnly ? { comparePrice: { not: null, gt: 0 } } : {};

  const categoryCondition = categoryId
    ? Array.isArray(categoryId)
      ? { categories: { some: { categoryId: { in: categoryId } } } }
      : { categories: { some: { categoryId } } }
    : {};

  const brandCondition = brandSlug ? { brand: { slug: brandSlug } } : {};

  const searchCondition = search
    ? (() => {
        const searchNorm = search.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return {
          OR: [
            { nameSearch: { contains: searchNorm } },
            { name: { contains: search } },
            { brand: { nameSearch: { contains: searchNorm } } },
            { brand: { name: { contains: search } } },
            { productType: { contains: search } },
            { tags: { contains: search } },
          ],
        };
      })()
    : {};

  const productFilter = {
    status: "ACTIVE" as const,
    ...categoryCondition,
    ...brandCondition,
    ...searchCondition,
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

  const sizes = [...new Set(
    (variants.map((v) => v.size).filter(Boolean) as string[]).filter(isValidSize)
  )].sort((a, b) => {
    const numA = parseFloat(a.replace(",", "."));
    const numB = parseFloat(b.replace(",", "."));
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

  // Classify sizes to determine if size filter makes sense
  let sizeType: SizeType | "mixed" | null = null;
  if (sizes.length > 0) {
    const types = new Set(sizes.map(classifySizeType));
    types.delete("unknown");
    if (types.size === 1) {
      sizeType = [...types][0];
    } else if (types.size > 1) {
      sizeType = "mixed";
    } else {
      sizeType = "unknown";
    }
  }

  return { brands, sizes, priceRange, sizeType };
}

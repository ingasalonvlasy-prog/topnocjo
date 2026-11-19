import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/StatCard";
import { ProductTable } from "./ProductTable";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const search = (sp.q as string) || "";
  const status = (sp.status as string) || "";
  const brandFilter = (sp.brand as string) || "";
  const categoryFilter = (sp.category as string) || "";
  const page = Number(sp.page) || 1;
  const perPage = 20;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { brand: { name: { contains: search } } },
    ];
  }
  if (status) where.status = status;
  if (brandFilter) where.brand = { slug: brandFilter };
  if (categoryFilter) {
    where.categories = { some: { category: { slug: categoryFilter } } };
  }

  const [products, total, brands, allProducts, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        brand: true,
        variants: { where: { active: true } },
        categories: { include: { category: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      select: {
        status: true,
        variants: { select: { ownStock: true, supplierStock: true, active: true } },
      },
    }),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { position: "asc" },
      select: { name: true, slug: true },
    }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  // Stats
  const activeProducts = allProducts.filter(p => p.status === "ACTIVE").length;
  const totalVariants = allProducts.reduce((sum, p) => sum + p.variants.length, 0);
  const lowStockProducts = allProducts.filter(p => {
    const stock = p.variants
      .filter(v => v.active)
      .reduce((s, v) => s + v.ownStock + v.supplierStock, 0);
    return p.status === "ACTIVE" && stock > 0 && stock <= 2;
  }).length;
  const outOfStock = allProducts.filter(p => {
    if (p.status !== "ACTIVE") return false;
    return p.variants
      .filter(v => v.active)
      .reduce((s, v) => s + v.ownStock + v.supplierStock, 0) === 0;
  }).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produkty</h1>
          <p className="text-sm text-gray-500 mt-1">{total} produktů celkem</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/admin/products/export"
            download
            className="h-9 px-4 flex items-center gap-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Export CSV
          </a>
          <Link
            href="/admin/produkty/novy"
            className="h-9 px-4 flex items-center gap-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nový produkt
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Aktivní produkty"
          value={String(activeProducts)}
          change={`z ${allProducts.length} celkem`}
          changeType="neutral"
        />
        <StatCard
          label="Celkem variant"
          value={String(totalVariants)}
          changeType="neutral"
        />
        <StatCard
          label="Nízký sklad"
          value={String(lowStockProducts)}
          change="1-2 kusy"
          changeType={lowStockProducts > 0 ? "down" : "neutral"}
        />
        <StatCard
          label="Vyprodané"
          value={String(outOfStock)}
          change="aktivní bez skladu"
          changeType={outOfStock > 0 ? "down" : "neutral"}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
        <form className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-0 sm:min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Hledat</label>
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Název produktu nebo značka..."
              className="w-full h-9 text-sm border border-gray-300 rounded-md px-3 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
            />
          </div>
          <div className="w-full sm:w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1">Stav</label>
            <select
              name="status"
              defaultValue={status}
              className="w-full h-9 text-sm border border-gray-300 rounded-md px-2 bg-white focus:border-green-500 outline-none"
            >
              <option value="">Všechny</option>
              <option value="ACTIVE">Aktivní</option>
              <option value="DRAFT">Koncept</option>
              <option value="ARCHIVED">Archivovaný</option>
            </select>
          </div>
          <div className="w-full sm:w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Značka</label>
            <select
              name="brand"
              defaultValue={brandFilter}
              className="w-full h-9 text-sm border border-gray-300 rounded-md px-2 bg-white focus:border-green-500 outline-none"
            >
              <option value="">Všechny</option>
              {brands.map((b) => (
                <option key={b.slug} value={b.slug}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Kategorie</label>
            <select
              name="category"
              defaultValue={categoryFilter}
              className="w-full h-9 text-sm border border-gray-300 rounded-md px-2 bg-white focus:border-green-500 outline-none"
            >
              <option value="">Všechny</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-9 px-4 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Filtrovat
          </button>
        </form>
      </div>

      {/* Products table with bulk actions */}
      <ProductTable
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          photos: p.photos,
          productType: p.productType,
          brand: { name: p.brand.name },
          variants: p.variants.map((v) => ({ price: v.price, ownStock: v.ownStock, supplierStock: v.supplierStock })),
          categories: p.categories.map(pc => pc.category.name),
        }))}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 mt-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">
            Strana {page} z {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/produkty?${new URLSearchParams({
                  ...(search ? { q: search } : {}),
                  ...(status ? { status } : {}),
                  ...(brandFilter ? { brand: brandFilter } : {}),
                  ...(categoryFilter ? { category: categoryFilter } : {}),
                  page: String(page - 1),
                })}`}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-white transition-colors"
              >
                Předchozí
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/produkty?${new URLSearchParams({
                  ...(search ? { q: search } : {}),
                  ...(status ? { status } : {}),
                  ...(brandFilter ? { brand: brandFilter } : {}),
                  ...(categoryFilter ? { category: categoryFilter } : {}),
                  page: String(page + 1),
                })}`}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-white transition-colors"
              >
                Další
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

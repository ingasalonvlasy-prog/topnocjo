import Link from "next/link";
import { prisma } from "@/lib/db";
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

  const [products, total, brands] = await Promise.all([
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
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produkty</h1>
          <p className="text-sm text-gray-500 mt-1">{total} produktů celkem</p>
        </div>
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

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
        <form className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Hledat</label>
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Název produktu nebo značka..."
              className="w-full h-9 text-sm border border-gray-300 rounded-md px-3 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
            />
          </div>
          <div className="w-36">
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
          <div className="w-40">
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
                href={`/admin/produkty?page=${page - 1}${search ? `&q=${search}` : ""}${status ? `&status=${status}` : ""}${brandFilter ? `&brand=${brandFilter}` : ""}`}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-white transition-colors"
              >
                Předchozí
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/produkty?page=${page + 1}${search ? `&q=${search}` : ""}${status ? `&status=${status}` : ""}${brandFilter ? `&brand=${brandFilter}` : ""}`}
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

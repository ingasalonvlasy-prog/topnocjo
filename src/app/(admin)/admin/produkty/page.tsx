import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";

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

      {/* Products table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Produkt</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Značka</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Typ</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Cena</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Sklad</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => {
                const photos: string[] = JSON.parse(product.photos || "[]");
                const photo = photos[0] || "https://placehold.co/40x40/e2e8f0/475569?text=?";
                const minPrice = product.variants.length > 0
                  ? Math.min(...product.variants.map((v) => v.price))
                  : 0;
                const totalStock = product.variants.reduce((sum, v) => sum + v.ownStock + v.supplierStock, 0);

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/produkty/${product.id}`} className="flex items-center gap-3 group">
                        <Image
                          src={photo}
                          alt=""
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded object-cover bg-gray-100"
                        />
                        <div>
                          <p className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-400">{product.variants.length} variant</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{product.brand.name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{product.productType || "-"}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {minPrice > 0 ? formatPrice(minPrice) : "-"}
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className={`text-sm ${totalStock <= 2 ? "text-red-500 font-medium" : "text-gray-600"}`}>
                        {totalStock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                        product.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : product.status === "DRAFT"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {product.status === "ACTIVE" ? "Aktivní" : product.status === "DRAFT" ? "Koncept" : "Archiv"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
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
    </div>
  );
}

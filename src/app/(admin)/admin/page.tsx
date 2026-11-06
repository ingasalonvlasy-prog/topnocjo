import { prisma } from "@/lib/db";
import { StatCard } from "@/components/admin/StatCard";
import { formatPrice } from "@/lib/products";
import Link from "next/link";

export default async function AdminDashboard() {
  const [productCount, activeCount, categoryCount, brandCount, variantCount, lowStockCount] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.variant.count({ where: { active: true } }),
    prisma.variant.count({ where: { active: true, stock: { lte: 2 } } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Celkem produktů"
          value={String(productCount)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          }
        />
        <StatCard
          label="Aktivní produkty"
          value={String(activeCount)}
          change={`${productCount > 0 ? Math.round((activeCount / productCount) * 100) : 0}% z celku`}
          changeType="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <StatCard
          label="Kategorie"
          value={String(categoryCount)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
          }
        />
        <StatCard
          label="Nízký sklad"
          value={String(lowStockCount)}
          change={`${variantCount} variant celkem`}
          changeType={lowStockCount > 10 ? "down" : "neutral"}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          }
        />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rychlé akce</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/produkty"
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Spravovat produkty
          </Link>
          <Link
            href="/admin/kategorie"
            className="px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Spravovat kategorie
          </Link>
          <Link
            href="/admin/nastaveni"
            className="px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Nastavení e-shopu
          </Link>
          <Link
            href="/"
            target="_blank"
            className="px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Zobrazit e-shop &rarr;
          </Link>
        </div>
      </div>

      {/* Brands overview */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Značky</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(await prisma.brand.findMany({
            include: { _count: { select: { products: true } } },
            orderBy: { name: "asc" },
          })).map((brand) => (
            <div key={brand.id} className="text-center p-3 bg-gray-50 rounded-md">
              <p className="font-medium text-gray-900">{brand.name}</p>
              <p className="text-sm text-gray-500">{brand._count.products} produktů</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

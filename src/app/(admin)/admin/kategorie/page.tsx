import { prisma } from "@/lib/db";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    include: {
      parent: true,
      _count: { select: { products: true } },
    },
    orderBy: { position: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategorie</h1>
          <p className="text-sm text-gray-500 mt-1">{categories.length} kategorií</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Pozice</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Název</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Slug</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Nadřazená</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Produkty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 w-16">{cat.position}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{cat.slug}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{cat.parent?.name || "-"}</td>
                <td className="px-4 py-3 text-center text-gray-600">{cat._count.products}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

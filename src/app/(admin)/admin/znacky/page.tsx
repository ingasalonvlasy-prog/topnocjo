import Link from "next/link";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function AdminBrandsPage() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  async function createBrand(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    if (!name) return;
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    await prisma.brand.create({ data: { name, slug } });
    revalidatePath("/admin/znacky");
  }

  async function deleteBrand(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (brand && brand._count.products === 0) {
      await prisma.brand.delete({ where: { id } });
    }
    revalidatePath("/admin/znacky");
    redirect("/admin/znacky");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Značky</h1>
          <p className="text-sm text-gray-500 mt-1">
            {brands.length} značek
          </p>
        </div>
      </div>

      {/* Quick create */}
      <form action={createBrand} className="mb-6">
        <div className="flex gap-3">
          <input
            name="name"
            type="text"
            required
            placeholder="Nová značka..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Přidat
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Název</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Slug</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Logo</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Produkty</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Akce</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{brand.name}</td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{brand.slug}</code>
                </td>
                <td className="px-4 py-3">
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="w-8 h-8 object-contain rounded"
                    />
                  ) : (
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 text-xs font-bold text-gray-400">
                      {brand.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{brand._count.products}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/znacky/${brand.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Upravit
                    </Link>
                    {brand._count.products === 0 && (
                      <form action={deleteBrand} className="inline">
                        <input type="hidden" name="id" value={brand.id} />
                        <button type="submit" className="text-sm font-medium text-red-500 hover:text-red-700">
                          Smazat
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {brands.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Žádné značky
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

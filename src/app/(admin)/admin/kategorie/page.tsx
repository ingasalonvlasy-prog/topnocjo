import Link from "next/link";
import { prisma } from "@/lib/db";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    include: {
      parent: { select: { name: true } },
      _count: { select: { products: true, children: true } },
    },
    orderBy: { position: "asc" },
  });

  async function createCategory(formData: FormData) {
    "use server";
    await requireAdmin();
    const name = formData.get("name") as string;
    if (!name) return;
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const maxPos = await prisma.category.aggregate({ _max: { position: true } });
    await prisma.category.create({
      data: { name, slug, position: (maxPos._max.position ?? 0) + 1 },
    });
    updateTag("category");
    updateTag("nav-categories");
    revalidatePath("/admin/kategorie");
  }

  async function deleteCategory(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = formData.get("id") as string;
    const cat = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (cat && cat._count.products === 0 && cat._count.children === 0) {
      await prisma.category.delete({ where: { id } });
    }
    updateTag("category");
    updateTag("nav-categories");
    revalidatePath("/admin/kategorie");
    redirect("/admin/kategorie");
  }

  const topLevel = categories.filter((c) => !c.parentId);
  const childCats = categories.filter((c) => c.parentId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategorie</h1>
          <p className="text-sm text-gray-500 mt-1">
            {categories.length} kategorií
          </p>
        </div>
      </div>

      {/* Quick create */}
      <form action={createCategory} className="mb-6">
        <div className="flex gap-3">
          <input
            name="name"
            type="text"
            required
            placeholder="Nová kategorie..."
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
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Název</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Slug</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Nadřazená</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Produkty</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Podkat.</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Akce</th>
            </tr>
          </thead>
          <tbody>
            {topLevel.map((cat) => {
              const subs = childCats.filter((c) => c.parentId === cat.id);
              return [
                <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{cat.slug}</code>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">—</td>
                  <td className="px-4 py-3 text-center text-gray-600">{cat._count.products}</td>
                  <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{cat._count.children}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/kategorie/${cat.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Upravit
                      </Link>
                      {cat._count.products === 0 && cat._count.children === 0 && (
                        <form action={deleteCategory} className="inline">
                          <input type="hidden" name="id" value={cat.id} />
                          <button type="submit" className="text-sm font-medium text-red-500 hover:text-red-700">
                            Smazat
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>,
                ...subs.map((sub) => (
                  <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50 bg-gray-50/50">
                    <td className="px-4 py-3 pl-8 font-medium text-gray-700">
                      <span className="text-gray-400 mr-1">└</span> {sub.name}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{sub.slug}</code>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{cat.name}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{sub._count.products}</td>
                    <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{sub._count.children}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/kategorie/${sub.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Upravit
                        </Link>
                        {sub._count.products === 0 && sub._count.children === 0 && (
                          <form action={deleteCategory} className="inline">
                            <input type="hidden" name="id" value={sub.id} />
                            <button type="submit" className="text-sm font-medium text-red-500 hover:text-red-700">
                              Smazat
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                )),
              ];
            })}
            {categories.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Žádné kategorie
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

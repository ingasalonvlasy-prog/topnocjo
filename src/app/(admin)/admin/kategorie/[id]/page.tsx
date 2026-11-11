import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function CategoryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });

  if (!category) {
    redirect("/admin/kategorie");
  }

  const allCategories = await prisma.category.findMany({
    where: { id: { not: id }, parentId: null },
    orderBy: { position: "asc" },
    select: { id: true, name: true },
  });

  async function updateCategory(formData: FormData) {
    "use server";
    await requireAdmin();
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const parentId = (formData.get("parentId") as string) || null;
    const position = parseInt(formData.get("position") as string, 10) || 0;
    const seoTitle = (formData.get("seoTitle") as string) || null;
    const seoDesc = (formData.get("seoDesc") as string) || null;
    const image = (formData.get("image") as string) || null;

    await prisma.category.update({
      where: { id },
      data: { name, slug, parentId, position, seoTitle, seoDesc, image },
    });

    revalidatePath("/admin/kategorie");
    redirect("/admin/kategorie");
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/kategorie"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Zpět na kategorie
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{category.name}</h1>
        <p className="text-sm text-gray-500 mt-1">Upravit kategorii</p>
      </div>

      <form action={updateCategory}>
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Název</label>
              <input
                name="name"
                type="text"
                defaultValue={category.name}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                name="slug"
                type="text"
                defaultValue={category.slug}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nadřazená kategorie</label>
              <select
                name="parentId"
                defaultValue={category.parentId || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Žádná (top-level)</option>
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pozice</label>
              <input
                name="position"
                type="number"
                min={0}
                defaultValue={category.position}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Obrázek (URL)</label>
            <input
              name="image"
              type="text"
              defaultValue={category.image || ""}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* SEO */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">SEO</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
                <input
                  name="seoTitle"
                  type="text"
                  defaultValue={category.seoTitle || ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description</label>
                <textarea
                  name="seoDesc"
                  rows={2}
                  defaultValue={category.seoDesc || ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Uložit změny
          </button>
          <Link
            href="/admin/kategorie"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Zrušit
          </Link>
        </div>
      </form>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { logAdminAction } from "@/lib/admin-log";
import { requireAdmin } from "@/lib/auth";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function createProduct(formData: FormData) {
  "use server";
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const brandId = formData.get("brandId") as string;
  const productType = (formData.get("productType") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const status = (formData.get("status") as string) || "DRAFT";

  if (!name || !brandId) {
    redirect("/admin/produkty/novy?error=missing");
  }

  let slug = slugify(name);
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // Get selected category IDs
  const categoryIds: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("cat_") && value === "on") {
      categoryIds.push(key.replace("cat_", ""));
    }
  }

  // Build compound nameSearch: name + productType + brand name + category names
  const brandForSearch = await prisma.brand.findUnique({ where: { id: brandId }, select: { name: true } });
  const searchParts = [name];
  if (productType) searchParts.push(productType);
  if (brandForSearch) searchParts.push(brandForSearch.name);
  if (categoryIds.length > 0) {
    const cats = await prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { name: true } });
    for (const c of cats) searchParts.push(c.name);
  }
  const nameSearch = searchParts.join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const product = await prisma.product.create({
    data: {
      name,
      nameSearch,
      slug,
      brandId,
      productType,
      description,
      status,
      categories: {
        create: categoryIds.map((categoryId) => ({ categoryId })),
      },
      // Create one default variant
      variants: {
        create: {
          title: "Default",
          price: 0,
          ownStock: 0,
          supplierStock: 0,
        },
      },
    },
  });

  logAdminAction("create", "product", product.id, name);

  redirect(`/admin/produkty/${product.id}`);
}

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = sp.error as string | undefined;

  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { position: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/produkty"
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nový produkt</h1>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
          Vyplň název a vyber značku.
        </p>
      )}

      <form action={createProduct}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Základní informace</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Název <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    required
                    placeholder="Např. Nike Pegasus 41"
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Popis</label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Krátký popis produktu..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-y"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Stav</h3>
              <select
                name="status"
                defaultValue="DRAFT"
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white focus:border-green-500 outline-none"
              >
                <option value="ACTIVE">Aktivní</option>
                <option value="DRAFT">Koncept</option>
              </select>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Značka <span className="text-red-500">*</span>
              </h3>
              <select
                name="brandId"
                required
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white focus:border-green-500 outline-none"
              >
                <option value="">Vyber značku...</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Typ produktu</h3>
              <input
                name="productType"
                placeholder="Např. Běžecké boty"
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Kategorie</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      name={`cat_${cat.id}`}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-gray-700">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              Vytvořit produkt
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

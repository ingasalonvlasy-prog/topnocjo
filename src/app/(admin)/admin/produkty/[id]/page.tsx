import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { logAdminAction } from "@/lib/admin-log";
import { requireAdmin } from "@/lib/auth";

async function updateProduct(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const bodyHtml = formData.get("bodyHtml") as string;
  const status = formData.get("status") as string;
  const brandId = formData.get("brandId") as string;
  const productType = formData.get("productType") as string;
  const seoTitle = formData.get("seoTitle") as string;
  const seoDescription = formData.get("seoDescription") as string;

  // Collect photo URLs
  const photoUrls: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("photo_") && typeof value === "string" && value.trim()) {
      photoUrls.push(value.trim());
    }
  }

  // Collect category IDs
  const categoryIds: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("cat_") && value === "on") {
      categoryIds.push(key.replace("cat_", ""));
    }
  }

  await prisma.$transaction(async (tx) => {
    // Update product
    await tx.product.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        bodyHtml,
        status,
        brandId,
        productType,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        photos: JSON.stringify(photoUrls),
      },
    });

    // Update categories — delete all, re-create
    await tx.productCategory.deleteMany({ where: { productId: id } });
    if (categoryIds.length > 0) {
      await tx.productCategory.createMany({
        data: categoryIds.map((categoryId) => ({ productId: id, categoryId })),
      });
    }
  });

  logAdminAction("update", "product", id, name);

  revalidatePath(`/admin/produkty/${id}`);
  redirect(`/admin/produkty/${id}?saved=1`);
}

async function updateVariant(formData: FormData) {
  "use server";
  await requireAdmin();

  const variantId = formData.get("variantId") as string;
  const productId = formData.get("productId") as string;
  const price = Math.round(parseFloat(formData.get("price") as string) * 100) || 0;
  const comparePrice = formData.get("comparePrice") as string;
  const ownStock = Math.max(0, parseInt(formData.get("ownStock") as string) || 0);
  const size = (formData.get("size") as string)?.trim() || null;
  const color = (formData.get("color") as string)?.trim() || null;
  const sku = (formData.get("sku") as string)?.trim() || null;

  await prisma.variant.update({
    where: { id: variantId },
    data: {
      price,
      comparePrice: comparePrice ? Math.round(parseFloat(comparePrice) * 100) : null,
      ownStock,
      size,
      color,
      sku,
    },
  });

  revalidatePath(`/admin/produkty/${productId}`);
  redirect(`/admin/produkty/${productId}?saved=variant`);
}

async function addVariant(formData: FormData) {
  "use server";
  await requireAdmin();

  const productId = formData.get("productId") as string;
  const title = (formData.get("title") as string)?.trim() || "Nová varianta";
  const size = (formData.get("newSize") as string)?.trim() || null;

  // Get max position
  const last = await prisma.variant.findFirst({
    where: { productId },
    orderBy: { position: "desc" },
  });

  await prisma.variant.create({
    data: {
      productId,
      title: size || title,
      size,
      price: 0,
      ownStock: 0,
      supplierStock: 0,
      position: (last?.position || 0) + 1,
    },
  });

  revalidatePath(`/admin/produkty/${productId}`);
  redirect(`/admin/produkty/${productId}?saved=variant-added`);
}

async function deleteVariant(formData: FormData) {
  "use server";
  await requireAdmin();

  const variantId = formData.get("variantId") as string;
  const productId = formData.get("productId") as string;

  // Don't delete the last variant
  const count = await prisma.variant.count({ where: { productId } });
  if (count > 1) {
    await prisma.variant.delete({ where: { id: variantId } });
  }

  revalidatePath(`/admin/produkty/${productId}`);
  redirect(`/admin/produkty/${productId}`);
}

export default async function AdminProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const saved = sp.saved as string | undefined;

  const [product, brands, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        variants: { orderBy: { position: "asc" } },
        categories: { include: { category: true } },
      },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { position: "asc" } }),
  ]);

  if (!product) notFound();

  const photos: string[] = JSON.parse(product.photos || "[]");
  const productCategoryIds = product.categories.map((c) => c.categoryId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/produkty"
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-sm text-gray-500">{product.brand.name} &middot; {product.productType || "Bez typu"}</p>
        </div>
      </div>

      {saved && (
        <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg mb-4">
          {saved === "variant" ? "Varianta uložena." : saved === "variant-added" ? "Varianta přidána." : "Změny uloženy."}
        </p>
      )}

      <form action={updateProduct}>
        <input type="hidden" name="id" value={product.id} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Základní informace</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Název</label>
                  <input
                    name="name"
                    defaultValue={product.name}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Popis</label>
                  <textarea
                    name="description"
                    defaultValue={product.description || ""}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HTML obsah</label>
                  <textarea
                    name="bodyHtml"
                    defaultValue={product.bodyHtml || ""}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-y"
                  />
                </div>
              </div>
            </div>

            {/* Photos — URL management */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Obrázky</h2>
              <div className="space-y-3">
                {photos.map((photo, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden border border-gray-200 shrink-0">
                      <Image src={photo} alt="" width={48} height={48} className="w-full h-full object-contain p-0.5" />
                    </div>
                    <input
                      name={`photo_${i}`}
                      defaultValue={photo}
                      placeholder="URL obrázku..."
                      className="flex-1 h-9 px-3 border border-gray-300 rounded-md text-sm font-mono focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                    />
                    <span className="text-xs text-gray-400 shrink-0">#{i + 1}</span>
                  </div>
                ))}
                {/* Empty slot for adding new photo */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-50 rounded border border-dashed border-gray-300 shrink-0 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <input
                    name={`photo_${photos.length}`}
                    placeholder="Přidej URL nového obrázku..."
                    className="flex-1 h-9 px-3 border border-gray-300 rounded-md text-sm font-mono focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                  />
                  <span className="text-xs text-gray-400 shrink-0">nový</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Vlož URL obrázku. Smazání = vymaž URL a ulož.</p>
            </div>

            {/* Variants — inline editing */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Varianty ({product.variants.length})
                </h2>
              </div>

              <div className="space-y-3">
                {product.variants.map((v) => (
                  <div key={v.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <form action={updateVariant}>
                      <input type="hidden" name="variantId" value={v.id} />
                      <input type="hidden" name="productId" value={product.id} />

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Velikost</label>
                          <input
                            name="size"
                            defaultValue={v.size || ""}
                            className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:border-green-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Barva</label>
                          <input
                            name="color"
                            defaultValue={v.color || ""}
                            className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:border-green-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Cena (Kč)</label>
                          <input
                            name="price"
                            type="number"
                            step="0.01"
                            defaultValue={(v.price / 100).toFixed(0)}
                            className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:border-green-500 outline-none text-right font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Původní cena</label>
                          <input
                            name="comparePrice"
                            type="number"
                            step="0.01"
                            defaultValue={v.comparePrice ? (v.comparePrice / 100).toFixed(0) : ""}
                            className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:border-green-500 outline-none text-right"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-green-600 mb-1">Náš sklad</label>
                          <input
                            name="ownStock"
                            type="number"
                            defaultValue={v.ownStock}
                            className={`w-full h-8 px-2 text-sm border border-gray-300 rounded focus:border-green-500 outline-none text-center font-medium ${
                              (v.ownStock + v.supplierStock) <= 2 ? "text-red-600 bg-red-50" : ""
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-amber-600 mb-1">Dodavatel</label>
                          <input
                            type="number"
                            value={v.supplierStock}
                            readOnly
                            className="w-full h-8 px-2 text-sm border border-gray-200 rounded bg-gray-50 outline-none text-center text-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Celkem</label>
                          <div className="w-full h-8 px-2 text-sm flex items-center justify-center font-bold text-gray-900">
                            {v.ownStock + v.supplierStock}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">SKU</label>
                          <input
                            name="sku"
                            defaultValue={v.sku || ""}
                            className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:border-green-500 outline-none font-mono text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="h-7 px-3 text-xs font-medium bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                        >
                          Uložit variantu
                        </button>
                        <span className="text-xs text-gray-400">{v.title}</span>
                      </div>
                    </form>
                    {product.variants.length > 1 && (
                      <form action={deleteVariant} className="inline">
                        <input type="hidden" name="variantId" value={v.id} />
                        <input type="hidden" name="productId" value={product.id} />
                        <button
                          type="submit"
                          className="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          Smazat variantu
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>

              {/* Add variant */}
              <form action={addVariant} className="mt-4 flex items-end gap-3">
                <input type="hidden" name="productId" value={product.id} />
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nová varianta (velikost)</label>
                  <input
                    name="newSize"
                    placeholder="Např. 42"
                    className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:border-green-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="h-9 px-4 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Přidat variantu
                </button>
              </form>
            </div>

            {/* SEO */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">SEO</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
                  <input
                    name="seoTitle"
                    defaultValue={product.seoTitle || ""}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description</label>
                  <textarea
                    name="seoDescription"
                    defaultValue={product.seoDescription || ""}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL handle (slug)</label>
                  <input
                    name="slug"
                    defaultValue={product.slug}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm font-mono focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                  />
                </div>
                {/* Google preview */}
                <div className="p-4 bg-gray-50 rounded-md">
                  <p className="text-xs text-gray-400 mb-1">Náhled ve vyhledávači</p>
                  <p className="text-blue-700 text-base">{product.seoTitle || product.name}</p>
                  <p className="text-green-700 text-xs">qsport.cz/produkt/{product.slug}</p>
                  <p className="text-gray-600 text-xs line-clamp-2">
                    {product.seoDescription || product.description || ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar (1/3) */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Stav</h3>
              <select
                name="status"
                defaultValue={product.status}
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white focus:border-green-500 outline-none"
              >
                <option value="ACTIVE">Aktivní</option>
                <option value="DRAFT">Koncept</option>
                <option value="ARCHIVED">Archivovaný</option>
              </select>
            </div>

            {/* Brand */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Značka</h3>
              <select
                name="brandId"
                defaultValue={product.brandId}
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white focus:border-green-500 outline-none"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Product type */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Typ produktu</h3>
              <input
                name="productType"
                defaultValue={product.productType || ""}
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              />
            </div>

            {/* Categories — working checkboxes */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Kategorie</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      name={`cat_${cat.id}`}
                      defaultChecked={productCategoryIds.includes(cat.id)}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-gray-700">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Save */}
            <button
              type="submit"
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              Uložit změny
            </button>

            {/* View on site */}
            <Link
              href={`/produkt/${product.slug}`}
              target="_blank"
              className="block text-center text-sm text-gray-500 hover:text-green-600 transition-colors"
            >
              Zobrazit na e-shopu &rarr;
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

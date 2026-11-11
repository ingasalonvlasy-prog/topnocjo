import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function BrandEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brand = await prisma.brand.findUnique({ where: { id } });

  if (!brand) {
    redirect("/admin/znacky");
  }

  async function updateBrand(formData: FormData) {
    "use server";
    await requireAdmin();
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const logo = (formData.get("logo") as string) || null;

    await prisma.brand.update({
      where: { id },
      data: { name, slug, logo },
    });

    revalidatePath("/admin/znacky");
    redirect("/admin/znacky");
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/znacky"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Zpět na značky
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{brand.name}</h1>
        <p className="text-sm text-gray-500 mt-1">Upravit značku</p>
      </div>

      <form action={updateBrand}>
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Název</label>
              <input
                name="name"
                type="text"
                defaultValue={brand.name}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                name="slug"
                type="text"
                defaultValue={brand.slug}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo (URL)</label>
            <input
              name="logo"
              type="text"
              defaultValue={brand.logo || ""}
              placeholder="https://... nebo /brands/logo.svg"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {brand.logo && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={brand.logo} alt={brand.name} className="h-8 w-auto" />
              </div>
            )}
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
            href="/admin/znacky"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Zrušit
          </Link>
        </div>
      </form>
    </div>
  );
}

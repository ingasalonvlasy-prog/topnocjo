import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFilteredProducts } from "@/lib/products";
import { getFilterOptions } from "@/lib/filter-options";
import { ProductCard } from "@/components/ProductCard";
import { Pagination } from "@/components/Pagination";
import { FilterBar } from "@/components/FilterBar";

type SortOption = "price_asc" | "price_desc" | "name" | "newest";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return { title: "Kategorie nenalezena" };
  return {
    title: category.seoTitle || `${category.name} | Qsport.cz`,
    description: category.seoDesc || `${category.name} – sportovní vybavení na Qsport.cz`,
    openGraph: {
      title: category.seoTitle || category.name,
      description: category.seoDesc || `${category.name} – sportovní vybavení na Qsport.cz`,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const page = Number(sp.strana) || 1;
  const sort = (sp.razeni as SortOption) || undefined;
  const brandSlug = (sp.znacka as string) || undefined;
  const size = (sp.velikost as string) || undefined;
  const priceMin = sp.cena_od ? Number(sp.cena_od) : undefined;
  const priceMax = sp.cena_do ? Number(sp.cena_do) : undefined;
  const inStock = sp.skladem === "1";

  const [result, filterOptions] = await Promise.all([
    getFilteredProducts({
      categoryId: category.id,
      brandSlug,
      size,
      priceMin,
      priceMax,
      sort,
      page,
      inStock,
    }),
    getFilterOptions(category.id),
  ]);

  const paginationParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (k !== "strana" && typeof v === "string") paginationParams[k] = v;
  }

  const sortLabel: Record<string, string> = {
    "": "Nejprodávanější",
    "price_asc": "Nejlevnější",
    "price_desc": "Nejdražší",
    "name": "Název A–Z",
    "newest": "Nejnovější",
  };

  return (
    <div>
      {/* Navy hero banner */}
      <section className="bg-navy text-white py-10 lg:py-14">
        <div className="max-w-[var(--container)] mx-auto px-6">
          {/* Breadcrumbs */}
          <nav className="text-[13px] text-white/50 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Domů</Link>
            <span className="mx-1.5">/</span>
            <span className="text-white/70">{category.name}</span>
          </nav>

          <h1 className="text-[32px] lg:text-[48px] font-extrabold tracking-[-0.04em] leading-tight">
            {category.name.split(" ").length > 1 ? (
              <>
                {category.name.split(" ").slice(0, -1).join(" ")}{" "}
                <span className="relative inline-block">
                  {category.name.split(" ").at(-1)}.
                  <span className="absolute bottom-0 left-0 w-full h-[4px] bg-blue" style={{ bottom: "2px" }} />
                </span>
              </>
            ) : (
              <span className="relative inline-block">
                {category.name}.
                <span className="absolute bottom-0 left-0 w-full h-[4px] bg-blue" style={{ bottom: "2px" }} />
              </span>
            )}
          </h1>

          {category.seoDesc && (
            <p className="text-[15px] text-white/50 font-medium mt-3 max-w-[400px]">{category.seoDesc}</p>
          )}
        </div>
      </section>

      {/* Content: sidebar filters + product grid */}
      <div className="max-w-[var(--container)] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          {/* Sidebar filters */}
          <aside className="hidden lg:block">
            <FilterBar
              brands={filterOptions.brands}
              sizes={filterOptions.sizes}
              priceRange={filterOptions.priceRange}
            />
          </aside>

          {/* Product grid */}
          <div>
            {/* Top bar: count + sort */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-[14px] font-bold text-ink">{result.total} produktů</span>
              <span className="text-[13px] text-muted">
                Řadit: <span className="font-bold text-ink">{sortLabel[sort || ""] || "Nejprodávanější"} &#9660;</span>
              </span>
            </div>

            {/* Mobile filters */}
            <div className="lg:hidden mb-5">
              <FilterBar
                brands={filterOptions.brands}
                sizes={filterOptions.sizes}
                priceRange={filterOptions.priceRange}
              />
            </div>

            {result.items.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {result.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-[16px] font-bold text-ink mb-2">Žádné produkty neodpovídají filtru.</p>
                <p className="text-[13px] text-muted">Zkus upravit filtry nebo zobraz všechny produkty.</p>
              </div>
            )}

            <Pagination
              currentPage={result.page}
              totalPages={result.totalPages}
              baseUrl={`/kategorie/${slug}`}
              searchParams={paginationParams}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

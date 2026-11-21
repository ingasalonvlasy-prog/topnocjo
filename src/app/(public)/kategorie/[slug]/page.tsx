import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { getFilteredProducts } from "@/lib/products";
import { getFilterOptions } from "@/lib/filter-options";
import { ProductCard } from "@/components/ProductCard";
import { Pagination } from "@/components/Pagination";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { SortDropdown } from "@/components/SortDropdown";
import { ActiveFilterChips } from "@/components/ActiveFilterChips";
import { CategorySidebar } from "@/components/CategorySidebar";
import { HorizontalFilters } from "@/components/HorizontalFilters";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { cleanTitle } from "@/lib/seo";

type SortOption = "price_asc" | "price_desc" | "name" | "newest";

const getCachedCategoryMeta = unstable_cache(
  async (slug: string) =>
    prisma.category.findUnique({
      where: { slug },
      select: { name: true, seoTitle: true, seoDesc: true },
    }),
  ["category-meta"],
  { revalidate: 600, tags: ["category"] }
);

const getCachedCategoryWithChildren = unstable_cache(
  async (slug: string) =>
    prisma.category.findUnique({
      where: { slug },
      include: {
        children: { orderBy: { position: "asc" } },
        parent: {
          include: {
            children: { orderBy: { position: "asc" } },
          },
        },
      },
    }),
  ["category-detail"],
  { revalidate: 600, tags: ["category"] }
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCachedCategoryMeta(slug);
  if (!category) return { title: "Kategorie nenalezena" };
  const title = cleanTitle(category.seoTitle || category.name);
  return {
    title,
    description: category.seoDesc || `${category.name} – sportovní vybavení na Qsport.cz`,
    openGraph: {
      title,
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

  const category = await getCachedCategoryWithChildren(slug);
  if (!category) notFound();

  const page = Number(sp.strana) || 1;
  const sort = (sp.razeni as SortOption) || undefined;
  const brandSlug = (sp.znacka as string) || undefined;
  const size = (sp.velikost as string) || undefined;
  const priceMin = sp.cena_od ? Number(sp.cena_od) : undefined;
  const priceMax = sp.cena_do ? Number(sp.cena_do) : undefined;
  const inStock = sp.skladem === "1";

  // For parent categories, include all child category IDs
  const isParent = category.children.length > 0;
  const categoryIds = isParent
    ? [category.id, ...category.children.map((c) => c.id)]
    : category.id;

  const [result, filterOptions] = await Promise.all([
    getFilteredProducts({
      categoryId: categoryIds,
      brandSlug,
      size,
      priceMin,
      priceMax,
      sort,
      page,
      inStock,
    }),
    getFilterOptions(
      isParent
        ? [category.id, ...category.children.map((c) => c.id)]
        : category.id
    ),
  ]);

  const paginationParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (k !== "strana" && typeof v === "string") paginationParams[k] = v;
  }

  // Count active filters for mobile drawer badge
  let activeFilterCount = 0;
  if (brandSlug) activeFilterCount++;
  if (size) activeFilterCount++;
  if (priceMin !== undefined) activeFilterCount++;
  if (inStock) activeFilterCount++;

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

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-3">
            {category.seoDesc && (
              <p className="text-[15px] text-white/50 font-medium max-w-[400px]">{category.seoDesc}</p>
            )}
            {(() => {
              const isParent = category.children.length > 0;
              const isChild = !!category.parent;

              if (!isParent && !isChild) return null;

              const parentCat = isChild ? category.parent! : category;
              const siblings = isChild ? category.parent!.children : category.children;

              return (
                <div className="relative lg:hidden">
                  <div className="flex flex-nowrap overflow-x-auto sm:flex-wrap gap-2 pb-2 sm:pb-0 scrollbar-hide pr-8">
                    <Link
                      href={`/kategorie/${parentCat.slug}`}
                      className={`shrink-0 px-5 py-2 rounded-full text-[14px] font-bold transition-colors ${
                        !isChild
                          ? "bg-white text-navy"
                          : "border border-white/30 text-white hover:bg-white/10"
                      }`}
                    >
                      Vše
                    </Link>
                    {siblings.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/kategorie/${sub.slug}`}
                        className={`shrink-0 px-5 py-2 rounded-full text-[14px] font-bold transition-colors ${
                          sub.slug === slug
                            ? "bg-white text-navy"
                            : "border border-white/30 text-white hover:bg-white/10"
                        }`}
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                  {/* Scroll indicator — fade gradient on right */}
                  <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-navy to-transparent pointer-events-none sm:hidden" />
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Content: category sidebar + horizontal filters + product grid */}
      <div className="max-w-[var(--container)] mx-auto px-6 py-8">
        {(() => {
          // Determine sidebar data
          const isChild = !!category.parent;
          const parentCat = isChild
            ? { id: category.parent!.id, name: category.parent!.name, slug: category.parent!.slug }
            : { id: category.id, name: category.name, slug: category.slug };
          const childCats = isChild ? category.parent!.children : category.children;
          const hasSidebar = childCats.length > 0;

          return (
            <div className={`grid grid-cols-1 ${hasSidebar ? "lg:grid-cols-[200px_1fr]" : ""} gap-8`}>
              {/* Sidebar: Category tree navigation (desktop only) */}
              {hasSidebar && (
                <aside className="hidden lg:block">
                  <CategorySidebar
                    currentSlug={slug}
                    parentCategory={parentCat}
                    childCategories={childCats}
                  />
                </aside>
              )}

              {/* Main content */}
              <div>
                {/* Horizontal filter chips (desktop) */}
                <div className="hidden lg:block">
                  <HorizontalFilters
                    brands={filterOptions.brands}
                    sizes={filterOptions.sizes}
                    sizeType={filterOptions.sizeType}
                    priceRange={filterOptions.priceRange}
                    showSizeFilter={!isParent}
                  />
                </div>

                {/* Top bar: count + sort + mobile filter trigger */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <span className="text-[14px] font-bold text-ink">{result.total} produktů</span>
                    <div className="lg:hidden">
                      <MobileFilterDrawer
                        brands={filterOptions.brands}
                        sizes={filterOptions.sizes}
                        priceRange={filterOptions.priceRange}
                        activeFilterCount={activeFilterCount}
                        showSizeFilter={!isParent}
                      />
                    </div>
                  </div>
                  <SortDropdown />
                </div>

                {/* Active filter chips */}
                <ActiveFilterChips brands={filterOptions.brands} />

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
          );
        })()}
      </div>

      {/* JSON-LD: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd([
          { name: category.name },
        ])) }}
      />
    </div>
  );
}

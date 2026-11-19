import Link from "next/link";
import { prisma } from "@/lib/db";
import { getFilteredProducts } from "@/lib/products";
import { getFilterOptions } from "@/lib/filter-options";
import { ProductCard } from "@/components/ProductCard";
import { Pagination } from "@/components/Pagination";
import { FilterBar } from "@/components/FilterBar";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { SortDropdown } from "@/components/SortDropdown";
import { ActiveFilterChips } from "@/components/ActiveFilterChips";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";

type SortOption = "price_asc" | "price_desc" | "name" | "newest";

export const metadata = {
  title: "Bazar",
  description: "Secondhand sportovní vybavení za skvělé ceny. Použité, ale stále skvělé — bazar na Qsport.cz.",
  openGraph: {
    title: "Bazar",
    description: "Secondhand sportovní vybavení za skvělé ceny. Použité, ale stále skvělé — bazar na Qsport.cz.",
  },
};

export default async function BazarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const category = await prisma.category.findUnique({
    where: { slug: "bazar" },
  });

  const page = Number(sp.strana) || 1;
  const sort = (sp.razeni as SortOption) || undefined;
  const brandSlug = (sp.znacka as string) || undefined;
  const size = (sp.velikost as string) || undefined;
  const priceMin = sp.cena_od ? Number(sp.cena_od) : undefined;
  const priceMax = sp.cena_do ? Number(sp.cena_do) : undefined;
  const inStock = sp.skladem === "1";

  const [result, filterOptions] = await Promise.all([
    getFilteredProducts({
      categoryId: category?.id,
      brandSlug,
      size,
      priceMin,
      priceMax,
      sort,
      page,
      perPage: 24,
      inStock,
    }),
    getFilterOptions(category?.id),
  ]);

  const paginationParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (k !== "strana" && typeof v === "string") paginationParams[k] = v;
  }

  let activeFilterCount = 0;
  if (brandSlug) activeFilterCount++;
  if (size) activeFilterCount++;
  if (priceMin !== undefined) activeFilterCount++;
  if (inStock) activeFilterCount++;

  return (
    <div>
      {/* Wash hero banner */}
      <section className="bg-wash text-ink py-10 lg:py-14">
        <div className="max-w-[var(--container)] mx-auto px-6">
          {/* Breadcrumbs */}
          <nav className="text-[13px] text-muted mb-4">
            <Link href="/" className="hover:text-ink transition-colors">Domů</Link>
            <span className="mx-1.5">/</span>
            <span className="text-ink/70">Bazar</span>
          </nav>

          <span className="inline-block bg-navy text-white text-[11px] font-extrabold uppercase tracking-[0.1em] px-3 py-1 rounded-[var(--radius-pill)] mb-3">
            Bazar
          </span>

          <h1 className="text-[32px] lg:text-[48px] font-extrabold tracking-[-0.04em] leading-tight text-navy">
            Druhá šance{" "}
            <span className="relative inline-block">
              pro&nbsp;výbavu.
              <span className="absolute bottom-0 left-0 w-full h-[4px] bg-blue" style={{ bottom: "2px" }} />
            </span>
          </h1>

          <p className="text-[15px] text-muted font-medium max-w-[440px] mt-3">
            Použité sportovní vybavení v dobrém stavu za zlomek ceny. Každý kus prověřený, poctivě popsaný.
          </p>
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
                <p className="text-[16px] font-bold text-ink mb-2">V bazaru momentálně nic není.</p>
                <p className="text-[13px] text-muted">Nové kousky přibývají průběžně — mrkni sem zase později.</p>
              </div>
            )}

            <Pagination
              currentPage={result.page}
              totalPages={result.totalPages}
              baseUrl="/bazar"
              searchParams={paginationParams}
            />
          </div>
        </div>
      </div>

      {/* JSON-LD: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd([
          { name: "Bazar" },
        ])) }}
      />
    </div>
  );
}

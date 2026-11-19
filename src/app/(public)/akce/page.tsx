import Link from "next/link";
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
  title: "Akce a výprodej | Qsport.cz",
  description: "Zlevněné sportovní vybavení, oblečení a doplňky za akční ceny. Využij slevy na Qsport.cz.",
  openGraph: {
    title: "Akce a výprodej | Qsport.cz",
    description: "Zlevněné sportovní vybavení, oblečení a doplňky za akční ceny. Využij slevy na Qsport.cz.",
  },
};

export default async function AkcePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const page = Number(sp.strana) || 1;
  const sort = (sp.razeni as SortOption) || undefined;
  const brandSlug = (sp.znacka as string) || undefined;
  const size = (sp.velikost as string) || undefined;
  const priceMin = sp.cena_od ? Number(sp.cena_od) : undefined;
  const priceMax = sp.cena_do ? Number(sp.cena_do) : undefined;
  const inStock = sp.skladem === "1";

  const [result, filterOptions] = await Promise.all([
    getFilteredProducts({
      brandSlug,
      size,
      priceMin,
      priceMax,
      sort,
      page,
      perPage: 24,
      inStock,
      saleOnly: true,
    }),
    getFilterOptions(undefined, { saleOnly: true }),
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

  const showSizeFilter = filterOptions.sizeType !== null && filterOptions.sizeType !== "mixed";

  return (
    <div>
      {/* Navy hero banner */}
      <section className="bg-navy text-white py-10 lg:py-14">
        <div className="max-w-[var(--container)] mx-auto px-6">
          {/* Breadcrumbs */}
          <nav className="text-[13px] text-white/50 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Domů</Link>
            <span className="mx-1.5">/</span>
            <span className="text-white/70">Akce a výprodej</span>
          </nav>

          <span className="inline-block bg-sale text-white text-[11px] font-extrabold uppercase tracking-[0.1em] px-3 py-1 rounded-[var(--radius-pill)] mb-3">
            Akce a výprodej
          </span>

          <h1 className="text-[32px] lg:text-[48px] font-extrabold tracking-[-0.04em] leading-tight">
            Nepřehlédni{" "}
            <span className="relative inline-block">
              slevy.
              <span className="absolute bottom-0 left-0 w-full h-[4px] bg-sale" style={{ bottom: "2px" }} />
            </span>
          </h1>

          <p className="text-[15px] text-white/50 font-medium max-w-[400px] mt-3">
            Vybrané produkty za zvýhodněné ceny. Akční nabídky se průběžně mění — vyplatí se sledovat.
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
              showSizeFilter={showSizeFilter}
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
                    showSizeFilter={showSizeFilter}
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
                <p className="text-[16px] font-bold text-ink mb-2">Momentálně žádné akční produkty.</p>
                <p className="text-[13px] text-muted">Akce se průběžně mění — zkus to znovu později.</p>
              </div>
            )}

            <Pagination
              currentPage={result.page}
              totalPages={result.totalPages}
              baseUrl="/akce"
              searchParams={paginationParams}
            />
          </div>
        </div>
      </div>

      {/* JSON-LD: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd([
          { name: "Akce a výprodej" },
        ])) }}
      />
    </div>
  );
}

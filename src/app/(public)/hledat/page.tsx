import Link from "next/link";
import type { Metadata } from "next";
import { getFilteredProducts } from "@/lib/products";
import { getFilterOptions } from "@/lib/filter-options";
import { ProductCard } from "@/components/ProductCard";
import { Pagination } from "@/components/Pagination";
import { FilterBar } from "@/components/FilterBar";
import { SortDropdown } from "@/components/SortDropdown";
import { ActiveFilterChips } from "@/components/ActiveFilterChips";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";

type SortOption = "price_asc" | "price_desc" | "name" | "newest";

export function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Metadata {
  return {
    title: "Vyhledávání",
    description: "Hledej sportovní vybavení na Qsport.cz",
    openGraph: { title: "Vyhledávání", description: "Hledej sportovní vybavení na Qsport.cz" },
    robots: { index: false },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query = (sp.q as string) || "";
  const page = Number(sp.strana) || 1;
  const sort = (sp.razeni as SortOption) || undefined;
  const brandSlug = (sp.znacka as string) || undefined;
  const size = (sp.velikost as string) || undefined;
  const priceMin = sp.cena_od ? Number(sp.cena_od) : undefined;
  const priceMax = sp.cena_do ? Number(sp.cena_do) : undefined;
  const inStock = sp.skladem === "1";

  const [result, filterOptions] = await Promise.all([
    getFilteredProducts({
      search: query || undefined,
      brandSlug,
      size,
      priceMin,
      priceMax,
      sort,
      page,
      inStock,
    }),
    getFilterOptions(),
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
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      {/* Breadcrumbs */}
      <nav className="text-[13px] text-muted mb-4">
        <Link href="/" className="hover:text-navy transition-colors">Domů</Link>
        <span className="text-line mx-1.5">/</span>
        <span className="text-ink">{query ? `Hledání: „${query}"` : "Všechny produkty"}</span>
      </nav>

      <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] mb-2">
        {query ? `Výsledky pro „${query}"` : "Všechny produkty"}
      </h1>
      <p className="text-[13px] text-muted font-medium mb-6">{result.total} produktů</p>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        {/* Sidebar filters — desktop */}
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
            <div className="hidden lg:block">
              <SortDropdown />
            </div>
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
              <svg className="mx-auto mb-4 text-line" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
              <p className="text-[18px] font-bold text-ink mb-2">
                {query ? `Žádné výsledky pro „${query}"` : "Žádné produkty nebyly nalezeny"}
              </p>
              <p className="text-[14px] text-muted mb-6">Zkus jiný výraz, zkontroluj pravopis nebo prohlédni naše kategorie.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/kategorie/beh" className="inline-flex items-center h-[36px] px-4 bg-wash text-[13px] font-bold text-ink rounded-full hover:bg-line transition-colors">
                  Běh
                </Link>
                <Link href="/kategorie/kopacky" className="inline-flex items-center h-[36px] px-4 bg-wash text-[13px] font-bold text-ink rounded-full hover:bg-line transition-colors">
                  Kopačky
                </Link>
                <Link href="/kategorie/obleceni" className="inline-flex items-center h-[36px] px-4 bg-wash text-[13px] font-bold text-ink rounded-full hover:bg-line transition-colors">
                  Oblečení
                </Link>
                <Link href="/kategorie/hory-a-outdoor" className="inline-flex items-center h-[36px] px-4 bg-wash text-[13px] font-bold text-ink rounded-full hover:bg-line transition-colors">
                  Hory a outdoor
                </Link>
                <Link href="/kategorie/doplnky" className="inline-flex items-center h-[36px] px-4 bg-wash text-[13px] font-bold text-ink rounded-full hover:bg-line transition-colors">
                  Doplňky
                </Link>
                <Link href="/znacky" className="inline-flex items-center h-[36px] px-4 bg-navy text-[13px] font-bold text-white rounded-full hover:bg-navy/80 transition-colors">
                  Všechny značky
                </Link>
              </div>
            </div>
          )}

          <Pagination
            currentPage={result.page}
            totalPages={result.totalPages}
            baseUrl="/hledat"
            searchParams={paginationParams}
          />
        </div>
      </div>
    </div>
  );
}

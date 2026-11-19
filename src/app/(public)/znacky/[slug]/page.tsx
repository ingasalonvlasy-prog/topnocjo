import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getFilteredProducts } from "@/lib/products";
import { getFilterOptions } from "@/lib/filter-options";
import { ProductCard } from "@/components/ProductCard";
import { Pagination } from "@/components/Pagination";
import { FilterBar } from "@/components/FilterBar";
import { SortDropdown } from "@/components/SortDropdown";
import { ActiveFilterChips } from "@/components/ActiveFilterChips";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";

type SortOption = "price_asc" | "price_desc" | "name" | "newest";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await prisma.brand.findUnique({ where: { slug } });
  if (!brand) return { title: "Značka nenalezena" };
  const title = `${brand.name} — sportovní vybavení | Qsport.cz`;
  const description = `Sportovní vybavení ${brand.name} na Qsport.cz — boty, oblečení a doplňky za skvělé ceny.`;
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const brand = await prisma.brand.findUnique({ where: { slug } });
  if (!brand) notFound();

  const page = Number(sp.strana) || 1;
  const sort = (sp.razeni as SortOption) || undefined;
  const size = (sp.velikost as string) || undefined;
  const priceMin = sp.cena_od ? Number(sp.cena_od) : undefined;
  const priceMax = sp.cena_do ? Number(sp.cena_do) : undefined;
  const inStock = sp.skladem === "1";

  const [result, filterOptions] = await Promise.all([
    getFilteredProducts({
      brandSlug: slug,
      size,
      priceMin,
      priceMax,
      sort,
      page,
      inStock,
    }),
    getFilterOptions(undefined, { brandSlug: slug }),
  ]);

  const paginationParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (k !== "strana" && typeof v === "string") paginationParams[k] = v;
  }

  // Count active filters for mobile drawer badge
  let activeFilterCount = 0;
  if (size) activeFilterCount++;
  if (priceMin !== undefined) activeFilterCount++;
  if (inStock) activeFilterCount++;

  // Determine if size filter makes sense
  const showSizeFilter = filterOptions.sizeType !== null && filterOptions.sizeType !== "mixed";

  return (
    <div>
      {/* Navy hero banner */}
      <section className="bg-navy text-white py-10 lg:py-14">
        <div className="max-w-[var(--container)] mx-auto px-6">
          <nav className="text-[13px] text-white/50 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Domů</Link>
            <span className="mx-1.5">/</span>
            <Link href="/znacky" className="hover:text-white transition-colors">Značky</Link>
            <span className="mx-1.5">/</span>
            <span className="text-white/70">{brand.name}</span>
          </nav>

          <h1 className="text-[32px] lg:text-[48px] font-extrabold tracking-[-0.04em] leading-tight">
            <span className="relative inline-block">
              {brand.name}.
              <span className="absolute bottom-0 left-0 w-full h-[4px] bg-blue" style={{ bottom: "2px" }} />
            </span>
          </h1>

          <p className="text-[15px] text-white/50 font-medium mt-3">
            {result.total} produktů
          </p>
        </div>
      </section>

      <div className="max-w-[var(--container)] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          {/* Sidebar filters — desktop */}
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
            {/* Top bar: sort + mobile filter trigger */}
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
                <svg className="mx-auto mb-4 text-line" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
                <p className="text-[16px] font-bold text-ink mb-2">Žádné produkty neodpovídají filtru.</p>
                <p className="text-[13px] text-muted">Zkus upravit filtry nebo zobraz všechny produkty.</p>
              </div>
            )}

            <Pagination
              currentPage={result.page}
              totalPages={result.totalPages}
              baseUrl={`/znacky/${slug}`}
              searchParams={paginationParams}
            />
          </div>
        </div>
      </div>

      {/* JSON-LD: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd([
          { name: "Značky", url: "/znacky" },
          { name: brand.name },
        ])) }}
      />
    </div>
  );
}

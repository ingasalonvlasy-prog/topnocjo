import Link from "next/link";
import type { Metadata } from "next";
import { getFilteredProducts } from "@/lib/products";
import { getFilterOptions } from "@/lib/filter-options";
import { ProductCard } from "@/components/ProductCard";
import { Pagination } from "@/components/Pagination";
import { FilterBar } from "@/components/FilterBar";

type SortOption = "price_asc" | "price_desc" | "name" | "newest";

export function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Metadata {
  return {
    title: "Vyhledávání",
    description: "Hledej sportovní vybavení na Qsport.cz",
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

      <FilterBar
        brands={filterOptions.brands}
        sizes={filterOptions.sizes}
        priceRange={filterOptions.priceRange}
      />

      {result.items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {result.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-[16px] font-bold text-ink mb-2">Žádné produkty nebyly nalezeny.</p>
          <p className="text-[13px] text-muted">Zkus jiný dotaz nebo uprav filtry.</p>
        </div>
      )}

      <Pagination
        currentPage={result.page}
        totalPages={result.totalPages}
        baseUrl="/hledat"
        searchParams={paginationParams}
      />
    </div>
  );
}

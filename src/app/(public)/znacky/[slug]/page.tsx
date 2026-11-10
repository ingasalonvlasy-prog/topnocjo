import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFilteredProducts } from "@/lib/products";
import { getFilterOptions } from "@/lib/filter-options";
import { ProductCard } from "@/components/ProductCard";
import { Pagination } from "@/components/Pagination";
import { FilterBar } from "@/components/FilterBar";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";

type SortOption = "price_asc" | "price_desc" | "name" | "newest";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await prisma.brand.findUnique({ where: { slug } });
  if (!brand) return { title: "Značka nenalezena" };
  return {
    title: `${brand.name} | Qsport.cz`,
    description: `Sportovní vybavení ${brand.name} na Qsport.cz`,
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
    getFilterOptions(),
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
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <nav className="text-[13px] text-muted mb-4">
        <Link href="/" className="hover:text-navy transition-colors">Domů</Link>
        <span className="text-line mx-1.5">/</span>
        <Link href="/znacky" className="hover:text-navy transition-colors">Značky</Link>
        <span className="text-line mx-1.5">/</span>
        <span className="text-ink">{brand.name}</span>
      </nav>

      <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-1">
        {brand.name}
      </h1>
      <p className="text-[13px] text-muted font-medium mb-6">{result.total} produktů</p>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        <aside className="hidden lg:block">
          <FilterBar
            brands={filterOptions.brands}
            sizes={filterOptions.sizes}
            priceRange={filterOptions.priceRange}
          />
        </aside>

        <div>
          <div className="flex items-center justify-between mb-5">
            <span className="text-[14px] font-bold text-ink">{result.total} produktů</span>
            <span className="text-[13px] text-muted">
              Řadit: <span className="font-bold text-ink">{sortLabel[sort || ""] || "Nejprodávanější"} &#9660;</span>
            </span>
          </div>

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
            baseUrl={`/znacky/${slug}`}
            searchParams={paginationParams}
          />
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

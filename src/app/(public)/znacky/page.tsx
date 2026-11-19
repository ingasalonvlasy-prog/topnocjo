import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";

const pastelBgs = ["bg-mint", "bg-sky", "bg-peach", "bg-lilac"];

export const metadata: Metadata = {
  title: "Prémiové značky",
  description: "Spolupracujeme s nejlepšími sportovními značkami. ON, POC, Maloja, Alpina, Mizuno, LEKI a další na Qsport.cz.",
  openGraph: {
    title: "Prémiové značky",
    description: "Spolupracujeme s nejlepšími sportovními značkami. ON, POC, Maloja, Alpina, Mizuno, LEKI a další na Qsport.cz.",
  },
};

const getCachedBrandsWithCount = unstable_cache(
  async () => {
    try {
      return await prisma.brand.findMany({
        where: { products: { some: { status: "ACTIVE" } } },
        select: {
          slug: true,
          name: true,
          logo: true,
          _count: { select: { products: { where: { status: "ACTIVE" } } } },
        },
        orderBy: { name: "asc" },
      });
    } catch { return []; }
  },
  ["brands-page"],
  { revalidate: 3600, tags: ["brand"] }
);

export default async function BrandsPage() {
  const brands = await getCachedBrandsWithCount();

  return (
    <div>
      {/* Navy hero banner */}
      <section className="bg-navy text-white py-10 lg:py-14">
        <div className="max-w-[var(--container)] mx-auto px-6">
          {/* Breadcrumbs */}
          <nav className="text-[13px] text-white/50 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Domů</Link>
            <span className="mx-1.5">/</span>
            <span className="text-white/70">Značky</span>
          </nav>

          <h1 className="text-[32px] lg:text-[48px] font-extrabold tracking-[-0.04em] leading-tight">
            Prémiové{" "}
            <span className="relative inline-block">
              značky.
              <span className="absolute bottom-0 left-0 w-full h-[4px] bg-blue" style={{ bottom: "2px" }} />
            </span>
          </h1>

          <p className="text-[15px] text-white/50 font-medium max-w-[440px] mt-3">
            Spolupracujeme s nejlepšími značkami pro tvůj sportovní výkon. {brands.length} značek v nabídce.
          </p>
        </div>
      </section>

      {/* Brand grid */}
      <div className="max-w-[var(--container)] mx-auto px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {brands.map((brand, i) => {
            const pastel = pastelBgs[i % pastelBgs.length];

            return (
              <Link
                key={brand.slug}
                href={`/znacky/${brand.slug}`}
                className="group flex flex-col items-center gap-4 p-6 bg-white rounded-[var(--radius-card)] border border-line hover:border-navy hover:shadow-[0_8px_24px_rgba(11,23,39,0.08)] hover:-translate-y-1 transition-all text-center"
              >
                {/* Logo area with pastel bg */}
                <div className={`w-full aspect-[3/2] ${pastel} rounded-[8px] flex items-center justify-center`}>
                  {brand.logo ? (
                    <Image
                      src={brand.logo}
                      alt={brand.name}
                      width={120}
                      height={60}
                      className="object-contain max-h-[60px] w-auto mix-blend-multiply"
                    />
                  ) : (
                    <span className="text-[14px] font-extrabold uppercase tracking-[0.08em] text-navy/40">{brand.name}</span>
                  )}
                </div>

                {/* Brand info */}
                <div>
                  <div className="text-[16px] font-bold text-navy group-hover:text-blue transition-colors">{brand.name}</div>
                  <div className="text-[13px] text-muted mt-0.5">{brand._count.products} produktů</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* JSON-LD: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd([
          { name: "Značky" },
        ])) }}
      />
    </div>
  );
}

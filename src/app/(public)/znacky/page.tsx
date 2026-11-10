import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Značky | Qsport.cz",
  description: "Přehled všech sportovních značek na Qsport.cz",
};

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({
    where: { products: { some: { status: "ACTIVE" } } },
    select: {
      slug: true,
      name: true,
      logo: true,
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <nav className="text-[13px] text-muted mb-4">
        <Link href="/" className="hover:text-navy transition-colors">Domů</Link>
        <span className="text-line mx-1.5">/</span>
        <span className="text-ink">Značky</span>
      </nav>

      <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-1">
        Značky
      </h1>
      <p className="text-[13px] text-muted font-medium mb-8">{brands.length} značek</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {brands.map((brand) => (
          <Link
            key={brand.slug}
            href={`/znacky/${brand.slug}`}
            className="flex flex-col items-center gap-3 p-6 bg-white border border-line rounded-[var(--radius-card)] hover:border-navy hover:shadow-sm transition-all text-center"
          >
            {brand.logo ? (
              <div className="w-[80px] h-[40px] flex items-center justify-center">
                <Image
                  src={brand.logo}
                  alt={brand.name}
                  width={80}
                  height={40}
                  className="object-contain max-h-[40px] w-auto"
                />
              </div>
            ) : (
              <div className="w-[60px] h-[60px] rounded-full bg-wash flex items-center justify-center">
                <span className="text-[22px] font-extrabold text-navy">{brand.name[0]}</span>
              </div>
            )}
            <div>
              <div className="text-[16px] font-bold text-navy">{brand.name}</div>
              <div className="text-[13px] text-muted">{brand._count.products} produktů</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

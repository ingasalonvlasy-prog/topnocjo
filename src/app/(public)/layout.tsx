import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/lib/cart";
import { CookieConsent } from "@/components/CookieConsent";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { unstable_cache } from "next/cache";
import type { NavCategory, NavBrand } from "@/components/MegaMenu";

const NAV_SLUGS = ["muzi", "zeny", "deti"];

const getNavData = unstable_cache(
  async (): Promise<{ categories: NavCategory[]; topBrands: NavBrand[] }> => {
    try {
      const [cats, topBrands] = await Promise.all([
        prisma.category.findMany({
          where: { parentId: null, slug: { in: NAV_SLUGS } },
          include: {
            children: {
              orderBy: { position: "asc" },
              select: { id: true, name: true, slug: true },
            },
          },
          orderBy: { position: "asc" },
        }),
        prisma.brand.findMany({
          where: {
            logo: { not: null },
            products: { some: { status: "ACTIVE" } },
          },
          select: { name: true, slug: true, logo: true },
          take: 8,
          orderBy: { name: "asc" },
        }),
      ]);

      const categories = NAV_SLUGS
        .map((slug) => cats.find((c) => c.slug === slug))
        .filter((c): c is NonNullable<typeof c> => c != null)
        .map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          children: c.children,
        }));

      return {
        categories,
        topBrands: topBrands.map((b) => ({
          name: b.name,
          slug: b.slug,
          logo: b.logo,
        })),
      };
    } catch {
      return { categories: [], topBrands: [] };
    }
  },
  ["nav-data"],
  { revalidate: 300, tags: ["nav-categories", "brand"] }
);

const getGA4Id = unstable_cache(
  async () => {
    try {
      return await getSetting("ga4_measurement_id");
    } catch {
      return null;
    }
  },
  ["ga4-id"],
  { revalidate: 300, tags: ["settings"] }
);

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [{ categories, topBrands }, ga4Id] = await Promise.all([
    getNavData(),
    getGA4Id(),
  ]);

  return (
    <CartProvider>
      {ga4Id && <GoogleAnalytics measurementId={ga4Id} />}
      <Header categories={categories} topBrands={topBrands} />
      <main className="flex-1 min-w-0">{children}</main>
      <Footer />
      <CookieConsent />
    </CartProvider>
  );
}

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/lib/cart";
import { CookieConsent } from "@/components/CookieConsent";
import { prisma } from "@/lib/db";
import type { NavCategory } from "@/components/MegaMenu";

export const dynamic = "force-dynamic";

const NAV_SLUGS = ["muzi", "zeny", "deti"];

async function getNavCategories(): Promise<NavCategory[]> {
  try {
    const cats = await prisma.category.findMany({
      where: { parentId: null, slug: { in: NAV_SLUGS } },
      include: {
        children: {
          orderBy: { position: "asc" },
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { position: "asc" },
    });
    // Sort by NAV_SLUGS order
    return NAV_SLUGS
      .map((slug) => cats.find((c) => c.slug === slug))
      .filter((c): c is NonNullable<typeof c> => c != null)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        children: c.children,
      }));
  } catch {
    return [];
  }
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const categories = await getNavCategories();

  return (
    <CartProvider>
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieConsent />
    </CartProvider>
  );
}

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AccountNav } from "@/components/AccountNav";
import { ProductCard } from "@/components/ProductCard";

export const metadata: Metadata = {
  title: "Oblíbené produkty",
};

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/prihlaseni?redirect=/ucet/oblibene");

  const items = await prisma.wishlist.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          brand: true,
          categories: { include: { category: true } },
          variants: {
            where: { active: true },
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });

  const products = items
    .map((i) => i.product)
    .filter((p) => p.status === "ACTIVE");

  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <Breadcrumbs
        items={[
          { label: "Můj účet", href: "/ucet" },
          { label: "Oblíbené" },
        ]}
      />

      <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-8">
        Oblíbené produkty
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        <AccountNav />

        <div>
          {products.length === 0 ? (
            <div className="text-center py-16">
              <svg
                className="w-16 h-16 text-line mx-auto mb-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <p className="text-[16px] font-bold text-navy mb-2">
                Zatím nemáte žádné oblíbené produkty
              </p>
              <p className="text-[14px] text-muted mb-6">
                Procházejte náš sortiment a klikněte na srdíčko u produktu,
                který se vám líbí.
              </p>
              <a
                href="/"
                className="inline-flex h-[44px] px-8 items-center justify-center bg-navy text-white text-[13px] font-extrabold uppercase tracking-[0.1em] rounded-[var(--radius-pill)] hover:bg-navy/90 transition-colors"
              >
                Prohlédnout produkty
              </a>
            </div>
          ) : (
            <>
              <p className="text-[14px] text-muted mb-6">
                {products.length}{" "}
                {products.length === 1
                  ? "produkt"
                  : products.length < 5
                    ? "produkty"
                    : "produktů"}{" "}
                v oblíbených
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

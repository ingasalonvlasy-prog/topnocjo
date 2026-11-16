"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice, getMinPrice, getComparePrice } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { WishlistButton } from "./WishlistButton";

const categoryPastels: Record<string, string> = {
  "bezecke-boty": "bg-mint",
  "beh": "bg-mint",
  "kopacky": "bg-mint",
  "volejbalova-obuv": "bg-mint",
  "cyklo-helmy": "bg-sky",
  "hory-a-outdoor": "bg-sky",
  "zima": "bg-sky",
  "obleceni": "bg-peach",
  "doplnky": "bg-lilac",
};

interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    name: string;
    photos: string;
    productType?: string | null;
    brand: { name: string };
    categories: { category: { slug: string; name: string } }[];
    variants: { id: string; price: number; comparePrice: number | null; ownStock: number; supplierStock: number; size?: string | null; title: string }[];
    avgRating?: number;
    reviewCount?: number;
  };
  badge?: "BESTSELLER" | "NOVINKA" | null;
}

export function ProductCard({ product, badge }: ProductCardProps) {
  const [showSizes, setShowSizes] = useState(false);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  const photos: string[] = JSON.parse(product.photos || "[]");
  const photo = photos[0] || "https://placehold.co/400x500/f3f5f6/667085?text=Qsport";
  const price = getMinPrice(product.variants);
  const comparePrice = getComparePrice(product.variants);
  const stock = product.variants.reduce((sum, v) => sum + v.ownStock + v.supplierStock, 0);
  const discount = comparePrice && comparePrice > price
    ? Math.round(((comparePrice - price) / comparePrice) * 100)
    : null;

  const categorySlug = product.categories[0]?.category?.slug || "";
  const categoryName = product.categories[0]?.category?.name || "";
  const pastelBg = categoryPastels[categorySlug] || "bg-wash";

  const inStockVariants = product.variants.filter(v => (v.ownStock + v.supplierStock) > 0);
  const hasOwnStock = product.variants.some(v => v.ownStock > 0);
  const hasSupplierStock = !hasOwnStock && product.variants.some(v => v.supplierStock > 0);
  const availableSizes = inStockVariants
    .filter(v => v.size)
    .map(v => v.size!);

  const brandLabel = product.brand.name.toUpperCase();
  const typeLabel = (product.productType || categoryName).toUpperCase();
  const cardLabel = typeLabel ? `${brandLabel} / ${typeLabel}` : brandLabel;

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (inStockVariants.length === 1) {
      doAddToCart(inStockVariants[0]);
    } else {
      setShowSizes(true);
    }
  }

  function doAddToCart(variant: typeof product.variants[0]) {
    addItem({
      variantId: variant.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      variantTitle: variant.title,
      price: variant.price,
      comparePrice: variant.comparePrice || undefined,
      photo,
    });
    setShowSizes(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleSizeClick(e: React.MouseEvent, variant: typeof product.variants[0]) {
    e.preventDefault();
    e.stopPropagation();
    doAddToCart(variant);
  }

  function handleCloseSizes(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShowSizes(false);
  }

  return (
    <Link
      href={`/produkt/${product.slug}`}
      className="group block bg-white rounded-[10px] overflow-hidden transition-all duration-200 hover:shadow-[0_8px_24px_rgba(11,23,39,0.08)] hover:-translate-y-1"
    >
      {/* Image — 4:5 aspect ratio on pastel */}
      <div className={`relative aspect-[4/5] ${pastelBg} rounded-[10px] overflow-hidden`}>
        <Image
          src={photo}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-6"
          style={{ mixBlendMode: "multiply" }}
        />
        {/* Second photo on hover */}
        {photos[1] && (
          <Image
            src={photos[1]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ mixBlendMode: "multiply" }}
          />
        )}
        {/* Wishlist heart — top-right, always visible on mobile */}
        <div className="absolute top-2 right-2 z-10 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          <WishlistButton productId={product.id} size="sm" className="bg-white/80 backdrop-blur-sm shadow-sm" />
        </div>

        {/* Badges — stacked top-left */}
        {(badge || discount) && (
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {badge && (
              <span className="bg-lime text-navy text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[var(--radius-pill)]">
                {badge}
              </span>
            )}
            {discount && (
              <span className="bg-sale text-white text-[10px] font-extrabold uppercase tracking-[0.06em] px-2.5 py-1 rounded-[var(--radius-pill)]">
                -{discount}&nbsp;%
              </span>
            )}
          </div>
        )}

        {/* Size picker overlay */}
        {showSizes && (
          <div className="absolute inset-0 bg-white/95 z-20 flex flex-col p-3" onClick={handleCloseSizes}>
            <div className="text-[11px] font-bold text-navy uppercase tracking-[0.08em] mb-2">Vyber velikost</div>
            <div className="flex flex-wrap gap-1.5 flex-1 content-start" onClick={(e) => e.stopPropagation()}>
              {product.variants.map((v) => {
                const inStock = (v.ownStock + v.supplierStock) > 0;
                return (
                  <button
                    key={v.id}
                    disabled={!inStock}
                    onClick={(e) => inStock && handleSizeClick(e, v)}
                    className={`h-[30px] min-w-[40px] px-2 text-[12px] font-bold rounded-[6px] transition-colors cursor-pointer ${
                      inStock
                        ? "bg-navy text-white hover:bg-navy/80"
                        : "bg-wash text-muted/40 line-through cursor-not-allowed"
                    }`}
                  >
                    {v.size || v.title}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleCloseSizes}
              className="text-[11px] text-muted font-bold mt-2 hover:text-navy transition-colors cursor-pointer"
            >
              Zavřít
            </button>
          </div>
        )}

        {/* Added feedback */}
        {added && (
          <div className="absolute inset-0 bg-white/90 z-20 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-600">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[14px] font-extrabold text-navy">Přidáno</span>
            </div>
          </div>
        )}

        {/* Quick-add button — always visible on mobile, hover on desktop */}
        {stock > 0 && !showSizes && !added && (
          <div className="absolute bottom-3 left-3 right-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 translate-y-0 lg:translate-y-2 lg:group-hover:translate-y-0 transition-all duration-200 z-10">
            <button
              className="w-full h-[36px] bg-navy text-white text-[11px] font-extrabold uppercase tracking-[0.08em] rounded-[var(--radius-pill)] hover:bg-navy/90 transition-colors cursor-pointer"
              onClick={handleQuickAdd}
            >
              Přidat do košíku
            </button>
          </div>
        )}
        {/* Out of stock */}
        {stock === 0 && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-navy text-white text-[10px] font-extrabold uppercase tracking-[0.08em] px-3 py-1.5 rounded-[var(--radius-pill)]">Vyprodáno</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="pt-3 pb-1 px-1">
        <div className="text-[11px] text-muted font-bold uppercase tracking-[0.08em] mb-0.5 truncate">
          {cardLabel}
        </div>
        <h3 className="text-[15px] font-bold text-ink leading-snug mb-1.5 line-clamp-1">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          {discount ? (
            <>
              <span className="text-[16px] font-extrabold text-sale">{formatPrice(price)}</span>
              <span className="text-[13px] text-muted line-through">{formatPrice(comparePrice!)}</span>
            </>
          ) : (
            <span className="text-[16px] font-extrabold text-ink">{formatPrice(price)}</span>
          )}
        </div>
        {(product.reviewCount ?? 0) > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-amber-500 text-[12px]">{"★".repeat(Math.round(product.avgRating ?? 0))}</span>
            <span className="text-[11px] text-muted">({product.reviewCount})</span>
          </div>
        )}
        {hasOwnStock && (
          <span className="text-[11px] font-bold text-green-600">Skladem</span>
        )}
        {hasSupplierStock && (
          <span className="text-[11px] font-bold text-amber-600">Na objednávku</span>
        )}
        {availableSizes.length > 0 && (
          <div className="text-[11px] text-muted mt-1.5 truncate">
            {availableSizes.slice(0, 6).join(" · ")}{availableSizes.length > 6 ? " ..." : ""}
          </div>
        )}
      </div>
    </Link>
  );
}

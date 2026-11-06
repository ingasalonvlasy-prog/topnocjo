import Link from "next/link";
import Image from "next/image";
import { formatPrice, getMinPrice, getComparePrice } from "@/lib/products";

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
    slug: string;
    name: string;
    photos: string;
    productType?: string | null;
    brand: { name: string };
    categories: { category: { slug: string; name: string } }[];
    variants: { price: number; comparePrice: number | null; stock: number }[];
  };
  badge?: "BESTSELLER" | "NOVINKA" | null;
}

export function ProductCard({ product, badge }: ProductCardProps) {
  const photos: string[] = JSON.parse(product.photos || "[]");
  const photo = photos[0] || "https://placehold.co/400x500/f3f5f6/667085?text=Qsport";
  const price = getMinPrice(product.variants);
  const comparePrice = getComparePrice(product.variants);
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const discount = comparePrice && comparePrice > price
    ? Math.round(((comparePrice - price) / comparePrice) * 100)
    : null;

  const categorySlug = product.categories[0]?.category?.slug || "";
  const categoryName = product.categories[0]?.category?.name || "";
  const pastelBg = categoryPastels[categorySlug] || "bg-wash";

  // Build label like "ON / NEPROMOKAVÉ BOTY"
  const brandLabel = product.brand.name.toUpperCase();
  const typeLabel = (product.productType || categoryName).toUpperCase();
  const cardLabel = typeLabel ? `${brandLabel} / ${typeLabel}` : brandLabel;

  return (
    <Link
      href={`/produkt/${product.slug}`}
      className="group block bg-white rounded-[10px] overflow-hidden transition-all duration-200 hover:shadow-[0_8px_24px_rgba(11,23,39,0.08)]"
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
        {/* Badges — stacked top-left */}
        {(badge || discount) && (
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
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
        {/* Out of stock */}
        {totalStock === 0 && (
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
      </div>
    </Link>
  );
}

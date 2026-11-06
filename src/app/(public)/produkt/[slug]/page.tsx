import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getProductBySlug, getRelatedProducts, formatPrice, getMinPrice, getComparePrice } from "@/lib/products";
import { ProductTabs } from "@/components/ProductTabs";
import { AddToCartButton } from "@/components/AddToCartButton";

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produkt nenalezen" };

  const photos: string[] = JSON.parse(product.photos || "[]");

  return {
    title: product.seoTitle || `${product.name} | Qsport.cz`,
    description: product.seoDescription || product.description || `${product.name} – koupit na Qsport.cz`,
    openGraph: {
      title: product.seoTitle || product.name,
      description: product.seoDescription || product.description || `${product.name} – koupit na Qsport.cz`,
      images: photos[0] ? [{ url: photos[0], width: 800, height: 1000 }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const photos: string[] = JSON.parse(product.photos || "[]");
  const mainPhoto = photos[0] || "https://placehold.co/800x1000/f3f5f6/667085?text=Qsport";
  const price = getMinPrice(product.variants);
  const comparePrice = getComparePrice(product.variants);
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const category = product.categories[0]?.category;
  const discount = comparePrice && comparePrice > price
    ? Math.round(((comparePrice - price) / comparePrice) * 100)
    : null;

  const categorySlug = category?.slug || "";
  const pastelBg = categoryPastels[categorySlug] || "bg-wash";

  const categoryIds = product.categories.map((c) => c.categoryId);
  const relatedProducts = await getRelatedProducts(product.id, product.brandId, categoryIds, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: photos,
    brand: { "@type": "Brand", name: product.brand.name },
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      name: v.title,
      price: v.price,
      priceCurrency: "CZK",
      availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      sku: v.sku,
    })),
  };

  // Breadcrumb trail: "Domů / Běh / Nepromokavé boty / Product Name"
  const brandName = product.brand.name.toUpperCase();
  const categoryName = category?.name?.toUpperCase() || "";
  const productType = product.productType?.toUpperCase() || "";

  return (
    <>
      {/* Breadcrumbs */}
      <div className="max-w-[var(--container)] mx-auto px-6 pt-4 pb-3">
        <nav className="text-[13px] text-muted">
          <ol className="flex flex-wrap items-center gap-1">
            <li><Link href="/" className="hover:text-navy transition-colors">Domů</Link></li>
            {category && (
              <li className="flex items-center gap-1">
                <span className="text-line mx-1">/</span>
                <Link href={`/kategorie/${category.slug}`} className="hover:text-navy transition-colors">{category.name}</Link>
              </li>
            )}
            {product.productType && (
              <li className="flex items-center gap-1">
                <span className="text-line mx-1">/</span>
                <span className="text-muted">{product.productType}</span>
              </li>
            )}
            <li className="flex items-center gap-1">
              <span className="text-line mx-1">/</span>
              <span className="text-ink font-medium">{product.name}</span>
            </li>
          </ol>
        </nav>
      </div>

      {/* Product detail — 2 columns */}
      <div className="max-w-[var(--container)] mx-auto px-6 pb-14 grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-10">
        {/* Left: Gallery */}
        <div>
          {/* Main image — full width, pastel bg */}
          <div className={`${pastelBg} rounded-[10px] aspect-[4/5] relative overflow-hidden mb-3`}>
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
              <span className="bg-lime text-navy text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[var(--radius-pill)]">
                Bestseller
              </span>
              {discount && (
                <span className="bg-sale text-white text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[var(--radius-pill)]">
                  −{discount}&nbsp;%
                </span>
              )}
            </div>
            <Image
              src={mainPhoto}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain p-10"
              style={{ mixBlendMode: "multiply" }}
              priority
            />
          </div>
          {/* Thumbnails row below */}
          <div className="flex gap-2">
            {photos.length > 0 ? (
              photos.slice(0, 4).map((photo, i) => (
                <div
                  key={i}
                  className={`w-[80px] h-[80px] rounded-[8px] overflow-hidden border-2 transition-all cursor-pointer ${
                    i === 0 ? "border-navy" : "border-line hover:border-muted"
                  }`}
                >
                  <Image
                    src={photo}
                    alt={`${product.name} – ${i + 1}`}
                    width={80}
                    height={80}
                    className="w-full h-full object-contain p-1"
                    style={{ mixBlendMode: "multiply", backgroundColor: "var(--wash)" }}
                  />
                </div>
              ))
            ) : (
              <div className="w-[80px] h-[80px] rounded-[8px] bg-wash border-2 border-navy" />
            )}
          </div>
        </div>

        {/* Right: Product info */}
        <div className="md:pt-2">
          {/* Brand / Category / Type breadcrumb */}
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3">
            <span className="text-blue">{brandName}</span>
            {categoryName && <span className="text-blue"> / {categoryName}</span>}
            {productType && <span className="text-blue"> / {productType}</span>}
          </div>

          {/* Product name */}
          <h1 className="text-[28px] md:text-[40px] font-extrabold tracking-[-0.04em] text-navy leading-tight mb-3">{product.name}</h1>

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-[30px] font-extrabold text-navy tracking-[-0.02em]">{formatPrice(price)}</span>
            <span className="text-[14px] text-muted font-medium">vč. DPH</span>
          </div>
          {comparePrice && comparePrice > price && (
            <div className="flex items-baseline gap-2 -mt-3 mb-5">
              <span className="text-[14px] text-muted line-through">{formatPrice(comparePrice)}</span>
              <span className="text-[13px] text-sale font-bold">−{discount}&nbsp;%</span>
            </div>
          )}

          {/* Description excerpt */}
          {product.description && (
            <p className="text-[14px] text-muted font-medium leading-relaxed mb-6 max-w-[460px]">
              {product.description.slice(0, 160)}{product.description.length > 160 ? "…" : ""}
            </p>
          )}

          {/* Sizes — chips with "Tabulka velikostí" link */}
          {product.variants.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-bold text-ink">Vyber si velikost (EU)</span>
                <button className="text-[13px] text-blue font-medium hover:underline">Tabulka velikostí</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <span
                    key={v.id}
                    className={`min-w-[52px] h-[44px] flex items-center justify-center text-[14px] font-bold rounded-[8px] border transition-all px-3 ${
                      v.stock > 0
                        ? "border-line bg-white text-ink hover:border-navy hover:bg-navy hover:text-white cursor-pointer"
                        : "border-line text-line bg-white cursor-not-allowed"
                    }`}
                  >
                    {v.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA row: navy pill button + heart icon */}
          <div className="flex gap-2 mb-6">
            <AddToCartButton />
            <button
              className="w-[52px] h-[52px] border border-line rounded-[var(--radius-pill)] flex items-center justify-center text-muted hover:border-navy hover:text-navy transition-all cursor-pointer"
              aria-label="Oblíbené"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>

          {/* Trust lines with colored dots + separators */}
          <div className="space-y-0 border-t border-line">
            <div className="flex items-center gap-3 py-3.5 border-b border-line">
              <span className="w-[10px] h-[10px] rounded-full bg-[#34D399] shrink-0" />
              <span className="text-[14px] font-medium text-ink">
                {totalStock > 0 ? "Skladem – odešleme do 2–5 dnů" : "Vyprodáno"}
              </span>
            </div>
            <div className="flex items-center gap-3 py-3.5 border-b border-line">
              <span className="w-[10px] h-[10px] rounded-full bg-blue shrink-0" />
              <span className="text-[14px] font-medium text-ink">Doprava od 49 Kč · nákup bez registrace</span>
            </div>
            <div className="flex items-center gap-3 py-3.5 border-b border-line">
              <span className="w-[10px] h-[10px] rounded-full bg-lime shrink-0" />
              <span className="text-[14px] font-medium text-ink">Vrácení zboží do 14 dní</span>
            </div>
          </div>

          {/* Metafield boxes — only show when we have real metafield data */}
        </div>
      </div>

      {/* Tabs section — interactive */}
      <ProductTabs
        description={product.description}
        bodyHtml={product.bodyHtml}
        brand={product.brand.name}
        productType={product.productType}
        sku={product.variants[0]?.sku || null}
        relatedProducts={relatedProducts}
      />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}

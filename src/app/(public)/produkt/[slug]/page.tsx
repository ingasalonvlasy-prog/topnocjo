import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, getRelatedProducts, formatPrice, getMinPrice, getComparePrice } from "@/lib/products";
import { ProductTabs } from "@/components/ProductTabs";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductActions } from "@/components/ProductActions";
import { ProductCard } from "@/components/ProductCard";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { TrackProductView } from "@/components/TrackProductView";
import { getAvailability } from "@/lib/stock";
import { buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { ReviewSummary } from "@/components/ReviewSection";
import { ShareButtons } from "@/components/ShareButtons";
import { prisma } from "@/lib/db";

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
  const price = getMinPrice(product.variants);
  const comparePrice = getComparePrice(product.variants);
  const totalStock = product.variants.reduce((sum, v) => sum + v.ownStock + v.supplierStock, 0);
  const bestAvailability = product.variants.some(v => v.ownStock > 0)
    ? "in_stock"
    : product.variants.some(v => v.supplierStock > 0)
      ? "on_order"
      : "out_of_stock";
  const category = product.categories[0]?.category;
  const discount = comparePrice && comparePrice > price
    ? Math.round(((comparePrice - price) / comparePrice) * 100)
    : null;

  const categorySlug = category?.slug || "";
  const pastelBg = categoryPastels[categorySlug] || "bg-wash";

  const categoryIds = product.categories.map((c) => c.categoryId);
  const [relatedProducts, reviewStats] = await Promise.all([
    getRelatedProducts(product.id, product.brandId, categoryIds, 4),
    prisma.productReview.aggregate({
      where: { productId: product.id, approved: true },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  const reviewCount = reviewStats._count;
  const avgRating = reviewStats._avg.rating || 0;

  const jsonLd = buildProductJsonLd({
    name: product.name,
    description: product.description,
    slug: product.slug,
    photos,
    brandName: product.brand.name,
    variants: product.variants.map((v) => ({
      title: v.title,
      price: v.price,
      sku: v.sku,
      availability: getAvailability(v),
    })),
    reviewCount,
    avgRating,
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    ...(category ? [{ name: category.name, url: `/kategorie/${category.slug}` }] : []),
    ...(product.productType ? [{ name: product.productType }] : []),
    { name: product.name },
  ]);

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
        <ProductGallery
          photos={photos}
          productName={product.name}
          pastelBg={pastelBg}
          discount={discount}
          badge={null}
        />

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

          {/* Review summary */}
          <ReviewSummary avgRating={avgRating} count={reviewCount} />

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

          {/* Variant selection + Add to cart */}
          <ProductActions
            variants={product.variants.map((v) => ({
              id: v.id,
              title: v.title,
              size: v.size,
              price: v.price,
              comparePrice: v.comparePrice,
              ownStock: v.ownStock,
              supplierStock: v.supplierStock,
            }))}
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              photo: photos[0] || "",
            }}
          />

          {/* Trust lines with colored dots + separators */}
          <div className="space-y-0 border-t border-line">
            <div className="flex items-center gap-3 py-3.5 border-b border-line">
              <span className={`w-[10px] h-[10px] rounded-full shrink-0 ${bestAvailability === "in_stock" ? "bg-[#34D399]" : bestAvailability === "on_order" ? "bg-amber-400" : "bg-red-400"}`} />
              <span className="text-[14px] font-medium text-ink">
                {bestAvailability === "in_stock"
                  ? "Skladem – expedice 1–3 pracovní dny"
                  : bestAvailability === "on_order"
                    ? "Na objednávku – expedice 3–7 pracovních dnů"
                    : "Vyprodáno"}
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

          {/* Social sharing */}
          <ShareButtons
            url={`https://qsport.cz/produkt/${product.slug}`}
            name={product.name}
          />

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
        variants={product.variants.map(v => ({ size: v.size, color: v.color, weight: v.weight, title: v.title }))}
        tags={product.tags}
        productId={product.id}
        reviewCount={reviewCount}
      />

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="max-w-[var(--container)] mx-auto px-6 pb-14">
          <h2 className="text-[20px] font-extrabold text-navy tracking-[-0.02em] mb-5">
            Mohlo by se vám líbit
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp.id} product={rp} />
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      <RecentlyViewed currentProductId={product.id} />

      {/* Track this view */}
      <TrackProductView productId={product.id} />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  );
}

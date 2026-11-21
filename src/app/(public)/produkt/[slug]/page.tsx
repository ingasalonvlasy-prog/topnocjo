import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, getRelatedProducts, formatPrice, getMinPrice, getComparePrice } from "@/lib/products";
import { ProductTabs } from "@/components/ProductTabs";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductActions } from "@/components/ProductActions";
import { MobileStickyBar } from "@/components/MobileStickyBar";
import { ProductCard } from "@/components/ProductCard";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { TrackProductView } from "@/components/TrackProductView";
import { getAvailability } from "@/lib/stock";
import { buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { ReviewSummary } from "@/components/ReviewSection";
import { ShareButtons } from "@/components/ShareButtons";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { cleanTitle } from "@/lib/seo";

const getCachedProduct = unstable_cache(
  async (slug: string) => getProductBySlug(slug),
  ["product-detail"],
  { revalidate: 300, tags: ["product"] }
);

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
  const product = await getCachedProduct(slug);
  if (!product) return { title: "Produkt nenalezen" };

  const photos: string[] = JSON.parse(product.photos || "[]");

  const title = cleanTitle(product.seoTitle || product.name);
  return {
    title,
    description: product.seoDescription || product.description || `${product.name} – koupit na Qsport.cz`,
    openGraph: {
      title,
      description: product.seoDescription || product.description || `${product.name} – koupit na Qsport.cz`,
      images: photos[0] ? [{ url: photos[0], width: 800, height: 1000 }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getCachedProduct(slug);
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
    <div className="pb-24 md:pb-0">
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
      <div className="max-w-[var(--container)] mx-auto px-6 pb-14 md:pb-14 grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-10">
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
              <span className={`w-[10px] h-[10px] rounded-full shrink-0 ${(bestAvailability === "in_stock" || bestAvailability === "on_order") ? "bg-[#34D399]" : "bg-red-400"}`} />
              <span className="text-[14px] font-medium text-ink">
                {(bestAvailability === "in_stock" || bestAvailability === "on_order")
                  ? "Skladem – expedice 1–3 pracovní dny"
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

      {/* Feature highlights strip */}
      {(() => {
        const highlights: { label: string; value: string; icon: React.ReactNode }[] = [];
        highlights.push({
          label: "Značka",
          value: product.brand.name,
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" /></svg>,
        });
        if (product.productType) {
          highlights.push({
            label: "Typ",
            value: product.productType,
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" /></svg>,
          });
        }
        const hlSizes = [...new Set(product.variants.filter(v => v.size).map(v => v.size!))];
        if (hlSizes.length > 1) {
          highlights.push({
            label: "Velikosti",
            value: `${hlSizes[0]} – ${hlSizes[hlSizes.length - 1]}`,
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-3L16.5 18m0 0L12 13.5m4.5 4.5V4.5" /></svg>,
          });
        }
        const hlWeight = product.variants[0]?.weight;
        if (hlWeight) {
          highlights.push({
            label: "Hmotnost",
            value: `${hlWeight} g`,
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971ZM5.25 4.97 7.87 15.696c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" /></svg>,
          });
        }
        highlights.push({
          label: "Dostupnost",
          value: (bestAvailability === "in_stock" || bestAvailability === "on_order") ? "Skladem" : "Vyprodáno",
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-1.036-.84-1.875-1.875-1.875h-.375a2.625 2.625 0 0 0-2.625-2.625H6.75a2.625 2.625 0 0 0-2.625 2.625v7.5" /></svg>,
        });

        return (
          <section className="max-w-[var(--container)] mx-auto px-6 pb-8">
            <div className={`grid grid-cols-2 ${highlights.length >= 4 ? "md:grid-cols-4" : highlights.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-3`}>
              {highlights.map((h) => (
                <div key={h.label} className="flex items-start gap-3 p-4 bg-wash rounded-[10px]">
                  <span className="w-9 h-9 rounded-full bg-navy/5 flex items-center justify-center text-navy shrink-0">
                    {h.icon}
                  </span>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted block">{h.label}</span>
                    <span className="text-[14px] font-bold text-ink">{h.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

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
        category={category?.name || null}
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
      <TrackProductView
        productId={product.id}
        ga4Item={{
          item_id: product.id,
          item_name: product.name,
          item_brand: product.brand.name,
          item_category: category?.name,
          price: price / 100,
        }}
        value={price / 100}
      />

      {/* Mobile sticky CTA bar */}
      <MobileStickyBar
        price={price}
        discount={discount}
        productId={product.id}
        productSlug={product.slug}
        productName={product.name}
        photo={photos[0] || ""}
        variants={product.variants.map(v => ({
          id: v.id,
          title: v.title,
          price: v.price,
          comparePrice: v.comparePrice,
          ownStock: v.ownStock,
          supplierStock: v.supplierStock,
        }))}
      />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
  );
}

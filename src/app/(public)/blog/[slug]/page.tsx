import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBlogPostBySlug, parseSportTags, parseSources, parseRelatedProducts, formatBlogDate } from "@/lib/blog";
import { SECTION_LABELS, SECTION_COLORS, SECTION_SLUGS, SPORT_TAGS, type BlogSection } from "@/lib/blog-constants";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { sanitizeHtml } from "@/lib/sanitize";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: "Článek nenalezen" };
  return {
    title: `${post.title} | Qsport.cz`,
    description: post.metaDescription || post.excerpt || `${post.title} – blog Qsport.cz`,
    openGraph: {
      title: post.title,
      description: post.metaDescription || post.excerpt || `${post.title} – blog Qsport.cz`,
      ...(post.coverImage ? { images: [post.coverImage] } : {}),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const section = post.section as BlogSection;
  const sectionLabel = SECTION_LABELS[section] || post.section;
  const sectionSlug = SECTION_SLUGS[section] || "";
  const colors = SECTION_COLORS[section] || { bg: "bg-wash", text: "text-navy" };
  const sportTagSlugs = parseSportTags(post.sportTags);
  const sources = parseSources(post.sources);
  const relatedSlugs = parseRelatedProducts(post.relatedProducts);

  // Fetch related products if any
  const relatedProducts = relatedSlugs.length > 0
    ? await prisma.product.findMany({
        where: { slug: { in: relatedSlugs }, status: "ACTIVE" },
        include: {
          variants: { where: { active: true }, orderBy: { position: "asc" }, take: 1 },
        },
      })
    : [];

  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <Breadcrumbs items={[
        { label: "Blog", href: "/blog" },
        { label: sectionLabel, href: `/blog?sekce=${sectionSlug}` },
        { label: post.title },
      ]} />

      <article className="max-w-[780px]">
        {/* Section badge */}
        <span className={`inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-wide rounded-full mb-4 ${colors.bg} ${colors.text}`}>
          {sectionLabel}
          {sportTagSlugs.length > 0 && (() => {
            const firstTag = SPORT_TAGS.find((t) => t.slug === sportTagSlugs[0]);
            return firstTag ? ` · ${firstTag.label}` : "";
          })()}
        </span>

        {/* Cover image */}
        {post.coverImage && (
          <div className="mb-6 rounded-[10px] overflow-hidden">
            <Image
              src={post.coverImage}
              alt={post.title}
              width={780}
              height={400}
              className="w-full max-h-[400px] object-cover"
            />
          </div>
        )}

        {/* Event info banner */}
        {section === "KALENDAR_AKCI" && (post.eventDate || post.eventLocation) && (
          <div className="flex items-center gap-3 p-4 bg-lime/20 rounded-[10px] mb-6">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-navy shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <div className="text-[14px] font-medium text-navy">
              {post.eventDate && formatBlogDate(post.eventDate)}
              {post.eventDate && post.eventLocation && " · "}
              {post.eventLocation}
            </div>
          </div>
        )}

        {/* Title */}
        <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-4">
          {post.title}
        </h1>

        {/* Meta line */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <span className="text-[13px] text-muted">
            {post.publishedAt && formatBlogDate(post.publishedAt)}
            {post.author && ` · ${post.author}`}
          </span>
          {sportTagSlugs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sportTagSlugs.map((slug) => {
                const tag = SPORT_TAGS.find((t) => t.slug === slug);
                return tag ? (
                  <Link
                    key={slug}
                    href={`/blog?sport=${slug}`}
                    className="text-[11px] bg-wash rounded-[var(--radius-pill)] px-2.5 py-0.5 text-muted font-bold hover:bg-line transition-colors"
                  >
                    {tag.label}
                  </Link>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <div
          className="overflow-hidden [&_h2]:text-[22px] [&_h2]:font-extrabold [&_h2]:text-navy [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-[18px] [&_h3]:font-bold [&_h3]:text-navy [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-[16px] [&_p]:text-ink [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_li]:text-[16px] [&_li]:text-ink [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_a]:text-blue [&_a]:hover:underline [&_strong]:font-bold [&_img]:rounded-[var(--radius-card)] [&_img]:my-4 [&_img]:max-w-full [&_img]:h-auto [&_table]:block [&_table]:overflow-x-auto [&_blockquote]:border-l-4 [&_blockquote]:border-lime [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
        />

        {/* Related products — "Co na to z Qsportu" */}
        {relatedProducts.length > 0 && (
          <div className="mt-10 p-6 bg-wash rounded-[10px]">
            <h3 className="text-[16px] font-bold text-navy mb-4">Co na to z Qsportu</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {relatedProducts.map((product) => {
                const photos: string[] = JSON.parse(product.photos || "[]");
                const minPrice = product.variants[0]?.price;
                return (
                  <Link key={product.id} href={`/produkt/${product.slug}`} className="group block">
                    <div className="aspect-square bg-white rounded-[8px] overflow-hidden mb-2 p-2">
                      {photos[0] ? (
                        <Image
                          src={photos[0]}
                          alt={product.name}
                          width={200}
                          height={200}
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-line text-[11px]">IMG</div>
                      )}
                    </div>
                    <p className="text-[13px] font-medium text-ink group-hover:text-navy transition-colors line-clamp-2">
                      {product.name}
                    </p>
                    {minPrice != null && (
                      <p className="text-[13px] font-bold text-navy mt-0.5">{formatPrice(minPrice)}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && (
          <div className="mt-8 pt-6 border-t border-line">
            <h3 className="text-[14px] font-bold text-muted uppercase tracking-wide mb-3">Zdroje</h3>
            <ul className="space-y-1">
              {sources.map((source, i) => (
                <li key={i} className="text-[14px]">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue hover:underline"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-line">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-[13px] font-bold text-navy hover:text-blue transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Zpět na blog
          </Link>
        </div>
      </article>

      {/* JSON-LD: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd([
          { name: "Blog", url: "/blog" },
          { name: sectionLabel, url: `/blog?sekce=${sectionSlug}` },
          { name: post.title },
        ])) }}
      />
    </div>
  );
}

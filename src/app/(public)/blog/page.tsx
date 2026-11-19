import Link from "next/link";
import type { Metadata } from "next";
import { getBlogPosts } from "@/lib/blog";
import { SECTION_LABELS, SECTION_SLUGS, SLUG_TO_SECTION, SPORT_TAGS, type BlogSection } from "@/lib/blog-constants";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Pagination } from "@/components/Pagination";
import { BlogCard } from "@/components/BlogCard";

export const metadata: Metadata = {
  title: "Blog | Qsport.cz",
  description: "Články o běhu, outdooru a sportovním vybavení. Tipy, recenze a novinky ze světa sportu.",
  openGraph: {
    title: "Blog | Qsport.cz",
    description: "Články o běhu, outdooru a sportovním vybavení.",
  },
};

const sectionTabs = [
  { slug: "", label: "Vše" },
  ...Object.entries(SECTION_SLUGS).map(([key, slug]) => ({
    slug,
    label: SECTION_LABELS[key as BlogSection],
  })),
];

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Number(sp.strana) || 1;
  const sectionSlug = (sp.sekce as string) || "";
  const sportSlug = (sp.sport as string) || "";

  const section = sectionSlug ? SLUG_TO_SECTION[sectionSlug] : undefined;
  const sportTag = sportSlug && SPORT_TAGS.some((t) => t.slug === sportSlug)
    ? (sportSlug as (typeof SPORT_TAGS)[number]["slug"])
    : undefined;

  const result = await getBlogPosts({ page, section, sportTag });

  function buildUrl(params: { sekce?: string; sport?: string }) {
    const parts: string[] = [];
    if (params.sekce) parts.push(`sekce=${params.sekce}`);
    if (params.sport) parts.push(`sport=${params.sport}`);
    return parts.length > 0 ? `/blog?${parts.join("&")}` : "/blog";
  }

  return (
    <div className="max-w-[var(--container)] mx-auto px-6 py-8">
      <Breadcrumbs items={[{ label: "Blog" }]} />

      <h1 className="text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy mb-6">
        Blog
      </h1>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {sectionTabs.map((tab) => {
          const isActive = tab.slug === sectionSlug;
          return (
            <Link
              key={tab.slug}
              href={buildUrl({ sekce: tab.slug || undefined, sport: sportSlug || undefined })}
              className={`px-4 py-2 text-[13px] font-bold rounded-[var(--radius-pill)] transition-colors ${
                isActive
                  ? "bg-navy text-white"
                  : "bg-wash text-ink hover:bg-line"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Sport tag pills */}
      <div className="flex flex-wrap gap-1.5 mb-8">
        {SPORT_TAGS.map((tag) => {
          const isActive = tag.slug === sportSlug;
          return (
            <Link
              key={tag.slug}
              href={buildUrl({
                sekce: sectionSlug || undefined,
                sport: isActive ? undefined : tag.slug,
              })}
              className={`px-3 py-2 text-[12px] font-bold rounded-[var(--radius-pill)] transition-colors ${
                isActive
                  ? "bg-navy text-white"
                  : "bg-wash text-muted hover:bg-line hover:text-ink"
              }`}
            >
              {tag.label}
            </Link>
          );
        })}
      </div>

      {result.items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {result.items.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-[16px] font-bold text-ink mb-2">Žádné články v této kategorii.</p>
          <p className="text-[13px] text-muted">
            Zkus jinou sekci nebo se podívej na{" "}
            <Link href="/blog" className="text-blue hover:underline">všechny články</Link>.
          </p>
        </div>
      )}

      <Pagination
        currentPage={result.page}
        totalPages={result.totalPages}
        baseUrl={buildUrl({ sekce: sectionSlug || undefined, sport: sportSlug || undefined })}
      />
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { formatBlogDate, parseSportTags } from "@/lib/blog";
import { SECTION_LABELS, SECTION_COLORS, SPORT_TAGS, type BlogSection } from "@/lib/blog-constants";

interface BlogCardProps {
  post: {
    slug: string;
    title: string;
    excerpt: string | null;
    coverImage: string | null;
    author: string;
    publishedAt: Date | null;
    section: string;
    sportTags: string;
  };
}

export function BlogCard({ post }: BlogCardProps) {
  const section = post.section as BlogSection;
  const sectionLabel = SECTION_LABELS[section] || post.section;
  const colors = SECTION_COLORS[section] || { bg: "bg-wash", text: "text-navy" };
  const sportTagSlugs = parseSportTags(post.sportTags);
  const sportTagLabels = sportTagSlugs
    .map((slug) => SPORT_TAGS.find((t) => t.slug === slug)?.label)
    .filter(Boolean);

  const badgeText = sportTagLabels.length > 0
    ? `${sectionLabel} · ${sportTagLabels[0]}`
    : sectionLabel;

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="aspect-[16/10] rounded-[10px] overflow-hidden mb-3 bg-wash relative">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            width={400}
            height={250}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-line">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
        )}
        <span className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full ${colors.bg} ${colors.text}`}>
          {badgeText}
        </span>
      </div>

      <p className="text-[12px] text-muted mb-1">
        {post.publishedAt ? formatBlogDate(post.publishedAt) : ""}
      </p>
      <h3 className="text-[16px] font-bold text-ink group-hover:text-navy transition-colors line-clamp-2">
        {post.title}
      </h3>
      {post.excerpt && (
        <p className="text-[13px] text-muted mt-1 line-clamp-2">{post.excerpt}</p>
      )}
    </Link>
  );
}

import { prisma } from "./db";
import type { BlogSection, SportTagSlug } from "./blog-constants";

interface GetBlogPostsParams {
  page?: number;
  perPage?: number;
  section?: BlogSection;
  sportTag?: SportTagSlug;
}

export async function getBlogPosts(params: GetBlogPostsParams = {}) {
  const { page = 1, perPage = 12, section, sportTag } = params;

  const where: Record<string, unknown> = { published: true };
  if (section) {
    where.section = section;
  }

  // Fetch all matching (need JS-side sport tag filter since SQLite has no JSON ops)
  const [allItems, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
    }),
    prisma.blogPost.count({ where }),
  ]);

  let filtered = allItems;
  if (sportTag) {
    filtered = allItems.filter((post) => {
      const tags: string[] = JSON.parse(post.sportTags || "[]");
      return tags.includes(sportTag);
    });
  }

  const filteredTotal = filtered.length;
  const items = filtered.slice((page - 1) * perPage, page * perPage);

  return {
    items,
    total: sportTag ? filteredTotal : total,
    page,
    totalPages: Math.ceil((sportTag ? filteredTotal : total) / perPage) || 1,
  };
}

export async function getBlogPostBySlug(slug: string) {
  return prisma.blogPost.findUnique({ where: { slug, published: true } });
}

export async function getLatestBlogPosts(limit = 3) {
  return prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export async function getBlogPostsBySection(section: BlogSection, limit = 10) {
  return prisma.blogPost.findMany({
    where: { published: true, section },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

/** Parse legacy tags JSON field */
export function parseTags(tags: string): string[] {
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

/** Parse sportTags JSON field */
export function parseSportTags(sportTags: string): string[] {
  try {
    return JSON.parse(sportTags);
  } catch {
    return [];
  }
}

/** Parse sources JSON field */
export function parseSources(sources: string): Array<{ title: string; url: string }> {
  try {
    return JSON.parse(sources);
  } catch {
    return [];
  }
}

/** Parse relatedProducts JSON field */
export function parseRelatedProducts(relatedProducts: string): string[] {
  try {
    return JSON.parse(relatedProducts);
  } catch {
    return [];
  }
}

/** Format date in Czech locale */
export function formatBlogDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

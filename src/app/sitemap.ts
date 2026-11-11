import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SECTION_SLUGS } from "@/lib/blog-constants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://qsport.cz";

  const [products, categories, brands, blogPosts] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      select: { slug: true, updatedAt: true },
    }),
    prisma.brand.findMany({
      where: { products: { some: { status: "ACTIVE" } } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/znacky`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/kontakt`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/o-nas`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/obchodni-podminky`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/akce`, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/bazar`, changeFrequency: "daily", priority: 0.6 },
    { url: `${baseUrl}/doprava-a-platba`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/reklamace`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/vraceni-zbozi`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${baseUrl}/kategorie/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const brandPages: MetadataRoute.Sitemap = brands.map((b) => ({
    url: `${baseUrl}/znacky/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/produkt/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${baseUrl}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  const sectionPages: MetadataRoute.Sitemap = Object.values(SECTION_SLUGS).map((slug) => ({
    url: `${baseUrl}/blog?sekce=${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [
    ...staticPages,
    ...categoryPages,
    ...brandPages,
    ...productPages,
    ...blogPages,
    ...sectionPages,
  ];
}

# Plan: TASK-023 Blog Section

**Status:** Ready for implementation
**Priority:** Medium
**Depends on:** Nothing (standalone feature)

---

## 1. Prisma Model — `prisma/schema.prisma` (EDIT)

Add `BlogPost` model at the end of the file:

```prisma
model BlogPost {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  excerpt     String?
  content     String   // HTML content
  coverImage  String?
  author      String   @default("Qsport.cz")
  tags        String   @default("[]") // JSON array of strings
  published   Boolean  @default(false)
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([published, publishedAt])
  @@map("blog_posts")
}
```

After adding, run: `npx prisma db push`

---

## 2. Blog Lib — `src/lib/blog.ts` (CREATE)

Data access functions + helpers. Follow patterns from `src/lib/products.ts`.

```typescript
import { prisma } from "./db";

export async function getBlogPosts(page = 1, perPage = 12) {
  const where = { published: true };
  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.blogPost.count({ where }),
  ]);
  return { items, total, page, totalPages: Math.ceil(total / perPage) || 1 };
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

/** Parse JSON tags field into string array */
export function parseTags(tags: string): string[] {
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

/** Format date in Czech locale: "12. listopadu 2026" */
export function formatBlogDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
```

---

## 3. Blog List Page — `src/app/(public)/blog/page.tsx` (CREATE)

**URL:** `/blog`
**Pagination param:** `?strana=2` (consistent with category pages)

Key implementation notes:
- Use existing `<Breadcrumbs>` component from `src/components/Breadcrumbs.tsx`
  - Items: `[{ label: "Blog" }]` (no href = current page)
- Use existing `<Pagination>` component from `src/components/Pagination.tsx`
  - `baseUrl="/blog"`, uses `strana` query param (already built in)
- Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`

**Article card design** (follow brand brief styling):
- Cover image: `aspect-[16/9]`, `rounded-[var(--radius-card)]`, `object-cover`
  - If no cover image: show wash-colored placeholder with blog icon
- Title: `text-[18px] font-bold text-navy`, `hover:text-blue`, `line-clamp-2`
- Excerpt: `text-[14px] text-muted`, `line-clamp-3`
- Date + author: `text-[12px] text-muted`
- Tags: small pills — `text-[11px] bg-wash rounded-[var(--radius-pill)] px-2.5 py-0.5 text-muted font-bold`

**Empty state:** "Zatím tu žádné články nejsou. Mrkni na naše produkty." with link to homepage.

**Metadata:**
```typescript
export const metadata: Metadata = {
  title: "Blog | Qsport.cz",
  description: "Články o běhu, outdooru a sportovním vybavení. Tipy, recenze a novinky ze světa sportu.",
  openGraph: {
    title: "Blog | Qsport.cz",
    description: "Články o běhu, outdooru a sportovním vybavení.",
  },
};
```

---

## 4. Blog Detail Page — `src/app/(public)/blog/[slug]/page.tsx` (CREATE)

**URL:** `/blog/jak-vybrat-bezecke-boty`

Key implementation notes:
- Use `<Breadcrumbs>` component: `[{ label: "Blog", href: "/blog" }, { label: post.title }]`
- Cover image: `w-full max-h-[400px] object-cover rounded-[10px]`
- H1: standard heading style — `text-[26px] lg:text-[36px] font-extrabold tracking-[-0.04em] text-navy`
- Meta line: date + author + tags (same pill style as list)
- Content: custom prose styling (NO `@tailwindcss/typography` dependency):
  ```
  [&_h2]:text-[22px] [&_h2]:font-extrabold [&_h2]:text-navy [&_h2]:mt-8 [&_h2]:mb-3
  [&_h3]:text-[18px] [&_h3]:font-bold [&_h3]:text-navy [&_h3]:mt-6 [&_h3]:mb-2
  [&_p]:text-[16px] [&_p]:text-ink [&_p]:leading-relaxed [&_p]:mb-4
  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul_li]:text-[16px] [&_ul_li]:text-ink [&_ul_li]:mb-1
  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4
  [&_a]:text-blue [&_a]:hover:underline
  [&_strong]:font-bold
  [&_img]:rounded-[var(--radius-card)] [&_img]:my-4
  [&_blockquote]:border-l-4 [&_blockquote]:border-lime [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted
  ```
- `notFound()` if post not found
- Max content width: `max-w-[780px]` (consistent with `o-nas` page)

**Dynamic metadata via `generateMetadata`:**
```typescript
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: "Článek nenalezen" };
  return {
    title: `${post.title} | Qsport.cz`,
    description: post.excerpt || `${post.title} – blog Qsport.cz`,
    openGraph: {
      title: post.title,
      description: post.excerpt || `${post.title} – blog Qsport.cz`,
      ...(post.coverImage ? { images: [post.coverImage] } : {}),
    },
  };
}
```

---

## 5. Seed Data — `prisma/seed.ts` (EDIT)

Add 3 sample blog posts at the end of the existing `main()` function (before the closing `console.log`). Content should be relevant to the sport niche.

**Sample posts:**

1. **"Jak vybrat běžecké boty v roce 2026"**
   - slug: `jak-vybrat-bezecke-boty-2026`
   - tags: `["běh", "boty", "průvodce"]`
   - Excerpt: Průvodce výběrem běžeckých bot — od pronace po povrch.
   - Content: HTML with h2 sections (Pronace, Povrch, Velikost, Značky)

2. **"5 tipů na podzimní trail running"**
   - slug: `5-tipu-na-podzimni-trail-running`
   - tags: `["běh", "trail", "tipy"]`
   - Excerpt: Podzim je ideální pro traily. Tady je 5 rad, jak na to.

3. **"POC helmy: Proč na bezpečnosti nešetřit"**
   - slug: `poc-helmy-proc-na-bezpecnosti-nesetrit`
   - tags: `["helmy", "POC", "bezpečnost"]`
   - Excerpt: Recenze cyklo helem POC — technologie, certifikace, zkušenosti.

All posts: `published: true`, `publishedAt: new Date()`, `author: "Qsport.cz"`.
Content should be realistic HTML (4-5 paragraphs with h2 headings, no lorem ipsum).

---

## 6. Sitemap Integration — `src/app/sitemap.ts` (EDIT)

Add blog posts to the existing sitemap. Currently the file fetches products and categories — add a third parallel query:

```typescript
const [products, categories, blogPosts] = await Promise.all([
  // ... existing queries ...
  prisma.blogPost.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  }),
]);

const blogPages: MetadataRoute.Sitemap = blogPosts.map((p) => ({
  url: `${baseUrl}/blog/${p.slug}`,
  lastModified: p.updatedAt,
  changeFrequency: "weekly" as const,
  priority: 0.5,
}));

// Add blog index
const blogIndex = { url: `${baseUrl}/blog`, changeFrequency: "weekly" as const, priority: 0.6 };

return [...staticPages, blogIndex, ...categoryPages, ...productPages, ...blogPages];
```

---

## 7. Footer Link — `src/components/Footer.tsx` (EDIT)

Add "Blog" link in the "O nás" column (after "Značky", before "Obchodní podmínky"):

```tsx
<li><Link href="/blog" className="text-[13px] text-white/70 hover:text-white transition-colors">Blog</Link></li>
```

---

## 8. Homepage Blog Teaser (OPTIONAL — can be separate task)

Add a "Z blogu" section on the homepage between the "Proč Qsport" section (#6) and the "Instagram" section (#7). Shows latest 3 posts in a 3-column grid with small cards (image + title + date). This is a nice-to-have and can be done as a follow-up.

If included:
- Section heading style: consistent with other homepage sections
- `text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1` + `h2 text-[32px]`
- Title: "Ze světa sportu."
- Grid: `grid grid-cols-1 sm:grid-cols-3 gap-4`
- Cards: cover image `aspect-[16/9]`, title `text-[15px] font-bold`, date `text-[12px] text-muted`
- "Zobrazit vše" pill button linking to `/blog`

---

## Admin Blog Management (LATER / Separate task)

Not in scope. Blog posts are created via:
- `npx prisma studio` (GUI)
- Seed script
- Future admin CRUD (separate task)

---

## File Summary

| # | File | Action | Priority |
|---|------|--------|----------|
| 1 | `prisma/schema.prisma` | EDIT — add BlogPost model | Must |
| 2 | `src/lib/blog.ts` | CREATE — data access + helpers | Must |
| 3 | `src/app/(public)/blog/page.tsx` | CREATE — blog list page | Must |
| 4 | `src/app/(public)/blog/[slug]/page.tsx` | CREATE — blog detail page | Must |
| 5 | `prisma/seed.ts` | EDIT — add 3 sample blog posts | Must |
| 6 | `src/app/sitemap.ts` | EDIT — add blog URLs | Must |
| 7 | `src/components/Footer.tsx` | EDIT — add Blog link | Must |
| 8 | `src/app/(public)/page.tsx` | EDIT — add blog teaser section | Optional |

**Post-implementation:** Run `npx prisma db push && npm run seed`

---

## Implementation Notes

- **Use existing components:** `<Breadcrumbs>` and `<Pagination>` are already built and used across the project. Do NOT inline breadcrumbs or pagination.
- **Pagination uses `strana` param** (Czech), consistent with category pages.
- **No new dependencies:** Custom prose styling instead of `@tailwindcss/typography`.
- **`dangerouslySetInnerHTML`:** Content is admin-authored (seed/Prisma Studio), not user-generated. Acceptable for now; sanitization can be added when admin CRUD is built.
- **Image handling:** Use `next/image` with width/height for cover images. If `coverImage` is null, render a wash-colored placeholder with the blog section icon.
- **Date formatting:** Use `cs-CZ` locale via `toLocaleDateString` (no external lib needed).
- **Brand consistency:** All text styling (sizes, weights, colors) follows `qsport-brand-brief.md`. Tykání in all copy.
- **`params` in Next.js 16:** The `params` prop is a Promise — always `await params` before using (see pattern in `kategorie/[slug]/page.tsx`).

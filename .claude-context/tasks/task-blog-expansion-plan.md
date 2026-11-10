# Plan: Rozšíření blog systému Qsport.cz

**Status:** Ready for implementation  
**Priority:** High  
**Date:** 2026-11-08  
**Zdroj:** Uživatelův dokument "Blog Qsport.cz – systém a manuál pro AI"  
**Grafické šablony:** `.claude-context/blog-templates/` (6 PNG vzorů)

---

## Uživatelův blog koncept (shrnutí)

### 5 obsahových sekcí:
1. **NOVINKY** — zprávy ze světa sportu + nové produkty v sortimentu
2. **TIPY A NÁVODY** — praktické rady (jak vybrat, jak se obléct, jak běhat...)
3. **KAM VYRAZIT** — místa, trasy, střediska (s lokací)
4. **TESTY A SROVNÁNÍ** — recenze, porovnání produktů (VS.)
5. **KALENDÁŘ AKCÍ** — sportovní události s datem konání

### 9 sport rubrik (cross-cutting tags):
1. Běh
2. Trail running
3. Lyže a snowboard
4. Běžky
5. Cyklistika
6. Outdoor a turistika
7. Oblečení a vrstvy
8. Helmy a ochrana
9. Doplňky a příslušenství

### Grafické šablony cover images (1 per sekce + 1 pro sortiment novinku):
| # | Soubor | Sekce | Vizuál |
|---|--------|-------|--------|
| 1 | `1-novinky-zpravy.png` | Novinky (zprávy) | Navy bg, datum vpravo nahoře, lime badge "NOVINKY · [rubrika]", produkt vpravo, footer QSPORT.CZ/BLOG |
| 2 | `2-novinky-sortiment.png` | Novinky (sortiment) | Mint/light bg, lime badge "NOVINKA V QSPORTU", produkt vpravo, cena "Skladem za X Kč" |
| 3 | `3-tipy-navody.png` | Tipy a návody | Mint bg, lime badge "TIPY A NÁVODY · [rubrika]", velká číslice bg, produkt vpravo |
| 4 | `4-kam-vyrazit.png` | Kam vyrazit | Blue bg (#3157FF), lime badge "KAM VYRAZIT", pin ikona + lokace, horské siluety, produkt vpravo |
| 5 | `5-testy-srovnani.png` | Testy a srovnání | Bílý bg, lime badge "TESTY A SROVNÁNÍ · [rubrika]", dva produkty vedle sebe + "VS." badge |
| 6 | `6-kalendar-akci.png` | Kalendář akcí | Lime bg (#CEFF2F), lime badge "KALENDÁŘ AKCÍ · [rubrika]", kalendářový widget (měsíc+den+den v týdnu), lokace+datum |

---

## Current State

### BlogPost Prisma model:
```prisma
model BlogPost {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  excerpt     String?
  content     String   // HTML content
  coverImage  String?
  author      String   @default("Qsport.cz")
  tags        String   @default("[]")  // JSON array of strings
  published   Boolean  @default(false)
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Existing pages:
- **Public:** `/blog` (list + pagination), `/blog/[slug]` (detail)
- **Admin:** `/admin/blog` (list + toggle + delete), `/admin/blog/novy` (create form), `/admin/blog/[id]` (edit form)
- **Lib:** `src/lib/blog.ts` — getBlogPosts, getBlogPostBySlug, getLatestBlogPosts, parseTags, formatBlogDate

### What's MISSING for expanded blog:
- Section field (which of the 5 sections the post belongs to)
- Sport tags (which of the 9 rubrics apply — multi-select)
- Meta description (SEO)
- Sources (JSON — links/references used in article)
- Related product slugs (for "Co na to" product box in article)
- Event date + location (for Kalendář akcí)
- Frontend filtering by section and sport tags
- Blog teaser on homepage
- Section-aware admin form (dropdown, checkboxes)

---

## Implementation Plan

### Phase 1: Prisma Schema Expansion

#### 1.1 Expand BlogPost model

```prisma
model BlogPost {
  id              String   @id @default(cuid())
  title           String
  slug            String   @unique
  excerpt         String?
  content         String                             // HTML content
  coverImage      String?
  author          String   @default("Qsport.cz")
  tags            String   @default("[]")            // JSON — legacy general tags
  published       Boolean  @default(false)
  publishedAt     DateTime?

  // NEW FIELDS
  section         String   @default("NOVINKY")       // "NOVINKY" | "TIPY_NAVODY" | "KAM_VYRAZIT" | "TESTY_SROVNANI" | "KALENDAR_AKCI"
  sportTags       String   @default("[]")            // JSON — ["beh", "trail-running", "lyze-a-snowboard", ...]
  metaDescription String?                             // SEO meta description (140-155 chars)
  sources         String   @default("[]")            // JSON — [{ "title": "...", "url": "..." }]
  relatedProducts String   @default("[]")            // JSON — ["product-slug-1", "product-slug-2"] for "Co na to" box
  eventDate       DateTime?                           // For KALENDAR_AKCI — date of event
  eventLocation   String?                             // For KALENDAR_AKCI — "Krkonoše · Špindlerův Mlýn"

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([published, publishedAt])
  @@index([section])
  @@map("blog_posts")
}
```

**Notes:**
- SQLite doesn't have enums → `section` is a String with application-level validation
- `sportTags` is JSON string (same pattern as existing `tags`)
- `relatedProducts` stores product slugs (not IDs) — allows easy URL linking
- `eventDate` + `eventLocation` only used for KALENDAR_AKCI section
- Existing `tags` field kept for backward compatibility (can be used for free-form tags alongside structured `sportTags`)

#### 1.2 Constants — `src/lib/blog-constants.ts` (CREATE)

```typescript
/** Blog section enum values */
export const BLOG_SECTIONS = {
  NOVINKY: "NOVINKY",
  TIPY_NAVODY: "TIPY_NAVODY",
  KAM_VYRAZIT: "KAM_VYRAZIT",
  TESTY_SROVNANI: "TESTY_SROVNANI",
  KALENDAR_AKCI: "KALENDAR_AKCI",
} as const;

export type BlogSection = (typeof BLOG_SECTIONS)[keyof typeof BLOG_SECTIONS];

/** Czech labels for sections (frontend display) */
export const SECTION_LABELS: Record<BlogSection, string> = {
  NOVINKY: "Novinky",
  TIPY_NAVODY: "Tipy a návody",
  KAM_VYRAZIT: "Kam vyrazit",
  TESTY_SROVNANI: "Testy a srovnání",
  KALENDAR_AKCI: "Kalendář akcí",
};

/** URL slugs for section filtering */
export const SECTION_SLUGS: Record<BlogSection, string> = {
  NOVINKY: "novinky",
  TIPY_NAVODY: "tipy-a-navody",
  KAM_VYRAZIT: "kam-vyrazit",
  TESTY_SROVNANI: "testy-a-srovnani",
  KALENDAR_AKCI: "kalendar-akci",
};

/** Reverse lookup: slug → section */
export const SLUG_TO_SECTION: Record<string, BlogSection> = Object.fromEntries(
  Object.entries(SECTION_SLUGS).map(([k, v]) => [v, k as BlogSection])
) as Record<string, BlogSection>;

/** Section colors for cover image templates */
export const SECTION_COLORS: Record<BlogSection, { bg: string; text: string }> = {
  NOVINKY: { bg: "bg-navy", text: "text-white" },
  TIPY_NAVODY: { bg: "bg-mint", text: "text-navy" },
  KAM_VYRAZIT: { bg: "bg-blue", text: "text-white" },
  TESTY_SROVNANI: { bg: "bg-wash", text: "text-navy" },
  KALENDAR_AKCI: { bg: "bg-lime", text: "text-navy" },
};

/** 9 sport rubrics */
export const SPORT_TAGS = [
  { slug: "beh", label: "Běh" },
  { slug: "trail-running", label: "Trail running" },
  { slug: "lyze-a-snowboard", label: "Lyže a snowboard" },
  { slug: "bezky", label: "Běžky" },
  { slug: "cyklistika", label: "Cyklistika" },
  { slug: "outdoor-a-turistika", label: "Outdoor a turistika" },
  { slug: "obleceni-a-vrstvy", label: "Oblečení a vrstvy" },
  { slug: "helmy-a-ochrana", label: "Helmy a ochrana" },
  { slug: "doplnky-a-prislusenstvi", label: "Doplňky a příslušenství" },
] as const;

export type SportTagSlug = (typeof SPORT_TAGS)[number]["slug"];
```

---

### Phase 2: Blog Library Expansion

#### 2.1 Update `src/lib/blog.ts` (EDIT)

Add filtering support:

```typescript
import { SLUG_TO_SECTION, type BlogSection, type SportTagSlug } from "./blog-constants";

interface GetBlogPostsParams {
  page?: number;
  perPage?: number;
  section?: BlogSection;
  sportTag?: SportTagSlug;
}

export async function getBlogPosts(params: GetBlogPostsParams = {}) {
  const { page = 1, perPage = 12, section, sportTag } = params;

  // Build where clause
  const where: Record<string, unknown> = { published: true };
  if (section) {
    where.section = section;
  }

  // Fetch all matching posts (need JS-side sport tag filter since SQLite has no JSON ops)
  const [allItems, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
    }),
    prisma.blogPost.count({ where }),
  ]);

  // Filter by sport tag in JS (SQLite limitation)
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
```

Keep existing `getBlogPostBySlug`, `getLatestBlogPosts`, `parseTags`, `formatBlogDate` unchanged.

---

### Phase 3: Admin Blog CRUD Expansion

#### 3.1 Admin Blog List — `src/app/(admin)/admin/blog/page.tsx` (EDIT)

Add section column + section filter:

**New columns in table:**
- Sekce (colored badge matching section)
- Sport rubriky (tag chips)

**New filter bar above table:**
- Section dropdown: Všechny / Novinky / Tipy a návody / Kam vyrazit / Testy a srovnání / Kalendář akcí

#### 3.2 Admin Blog Create — `src/app/(admin)/admin/blog/novy/page.tsx` (EDIT)

Add new fields to form:

```
┌──────────────────────────────────────────────────────────────────┐
│  [Existing fields: Název, Slug, Perex, Obsah, Cover Image,      │
│   Autor, Tagy, Publikováno]                                      │
│                                                                  │
│  NEW FIELDS:                                                     │
│                                                                  │
│  Sekce:  [▼ Novinky                          ]                   │
│          (dropdown: 5 options)                                    │
│                                                                  │
│  Sport rubriky:                                                  │
│  ☑ Běh  ☐ Trail running  ☑ Lyže a snowboard                    │
│  ☐ Běžky  ☐ Cyklistika  ☐ Outdoor a turistika                  │
│  ☐ Oblečení a vrstvy  ☐ Helmy a ochrana  ☐ Doplňky             │
│  (checkboxes — multi-select)                                     │
│                                                                  │
│  Meta description (SEO):                                         │
│  [__________________________________] (140-155 znaků)            │
│                                                                  │
│  Zdroje (JSON):                                                  │
│  [{"title":"...","url":"..."}]                                   │
│  (textarea, JSON format)                                         │
│                                                                  │
│  Související produkty (slugy):                                   │
│  [on-cloudmonster, poc-obex-mips]                                │
│  (comma-separated product slugs)                                 │
│                                                                  │
│  --- Pouze pro Kalendář akcí: ---                                │
│  Datum akce:  [2027-02-14]                                       │
│  Místo akce:  [Krkonoše · Špindlerův Mlýn]                      │
└──────────────────────────────────────────────────────────────────┘
```

**Server action `createPost`:** extend to save section, sportTags (JSON from checkboxes), metaDescription, sources, relatedProducts, eventDate, eventLocation.

#### 3.3 Admin Blog Edit — `src/app/(admin)/admin/blog/[id]/page.tsx` (EDIT)

Same new fields as create form, pre-filled with existing data. Section dropdown, sport tag checkboxes, etc.

**Conditional display:** eventDate + eventLocation fields only visible when section === "KALENDAR_AKCI". Use client component wrapper or just show/hide with CSS/JS.

---

### Phase 4: Frontend Blog Expansion

#### 4.1 Blog List Page — `src/app/(public)/blog/page.tsx` (EDIT)

Add section tabs + sport tag filter:

```
Breadcrumbs: Domů / Blog

Blog
─────────────────────────────────────────────────────────
[Vše] [Novinky] [Tipy a návody] [Kam vyrazit] [Testy a srovnání] [Kalendář akcí]
─────────────────────────────────────────────────────────

Sport:  Běh · Trail running · Lyže · Běžky · Cyklistika · Outdoor · Oblečení · Helmy · Doplňky

┌─────────┐ ┌─────────┐ ┌─────────┐
│ Card 1  │ │ Card 2  │ │ Card 3  │
│         │ │         │ │         │
└─────────┘ └─────────┘ └─────────┘

[Pagination]
```

**URL structure:**
- `/blog` — all posts
- `/blog?sekce=novinky` — filtered by section
- `/blog?sekce=novinky&sport=beh` — filtered by section + sport tag
- `/blog?sport=trail-running` — filtered by sport tag only

**Section tabs:**
- Horizontal row of pill buttons
- Active tab: `bg-navy text-white`
- Inactive: `bg-wash text-ink hover:bg-line`
- "Vše" tab always first (no filter)

**Sport tag pills:**
- Below section tabs
- Smaller pills: `text-[11px] bg-wash rounded-[var(--radius-pill)] px-2.5 py-0.5`
- Active: `bg-navy text-white`
- Clicking toggles filter

**Blog card updates:**
- Show section badge (colored, top-left of cover image, like product badges)
- Show sport tag chips below title
- Section badge colors match `SECTION_COLORS`

#### 4.2 Blog Detail Page — `src/app/(public)/blog/[slug]/page.tsx` (EDIT)

Add:

1. **Section badge** above title (colored pill: "TIPY A NÁVODY · BĚH")
2. **Sport tags** as clickable chips (link to `/blog?sport=beh`)
3. **Meta description** → SEO metadata
4. **Sources section** at bottom of article (if sources exist):
   ```
   ── Zdroje ──
   • [Source title](url)
   • [Source title](url)
   ```
5. **"Co na to" product box** (if relatedProducts exist):
   ```
   ┌──────────────────────────────────────────┐
   │  Co na to z Qsportu                      │
   │  ┌─────┐ ┌─────┐ ┌─────┐               │
   │  │prod1│ │prod2│ │prod3│               │
   │  └─────┘ └─────┘ └─────┘               │
   └──────────────────────────────────────────┘
   ```
   Fetch products by slugs from `relatedProducts` field, display as mini ProductCards.

6. **Event info banner** (if KALENDAR_AKCI):
   ```
   ┌──────────────────────────────────────────┐
   │  📅 14. února 2027 · Krkonoše, Špindl    │
   └──────────────────────────────────────────┘
   ```

7. **Breadcrumbs** updated: `Domů / Blog / [Section name] / [Title]`

#### 4.3 Blog Card Component — `src/components/BlogCard.tsx` (CREATE)

Extract blog card into reusable component (currently inline in blog list page). Needed for:
- Blog list page
- Homepage teaser
- Potential sidebar widgets

```typescript
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
    tags: string;
  };
}

export function BlogCard({ post }: BlogCardProps) {
  // Section badge, cover image, sport tag chips, title, excerpt, date
}
```

---

### Phase 5: Homepage Blog Teaser

#### 5.1 Add blog section to homepage — `src/app/(public)/page.tsx` (EDIT)

Insert between "Proč Qsport" (section 6) and "Instagram" (section 7):

```tsx
{/* 6.5 Blog — "Co nového na blogu." */}
<section className="max-w-[var(--container)] mx-auto px-6 pb-14">
  <div className="flex justify-between items-end mb-6">
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1">Blog</div>
      <h2 className="text-[28px] lg:text-[36px] font-extrabold tracking-[-0.04em]">Co nového na blogu.</h2>
    </div>
    <Link
      href="/blog"
      className="hidden sm:inline-flex items-center h-10 border border-ink text-ink text-[11px] font-extrabold uppercase tracking-[0.12em] px-5 rounded-[var(--radius-pill)] hover:bg-ink hover:text-white transition-all"
    >
      Všechny články
    </Link>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {latestPosts.map((post) => (
      <BlogCard key={post.id} post={post} />
    ))}
  </div>
</section>
```

Add `getLatestBlogPosts(3)` to the parallel fetch at top of `HomePage`.

---

### Phase 6: Seed Data Update

#### 6.1 Update `prisma/seed.ts` (EDIT)

Update existing blog seed posts with new fields:

```typescript
await prisma.blogPost.createMany({
  data: [
    {
      title: "Skipasy 2026/27: kolik letos zaplatíš na horách",
      slug: "skipasy-2026-27-kolik-letos-zaplatis",
      excerpt: "Přehled cen skipasů v Česku i zahraničí na sezónu 2026/27.",
      content: "<h2>...</h2><p>...</p>",
      coverImage: null,
      author: "Qsport.cz",
      tags: JSON.stringify(["lyže", "skipasy"]),
      section: "NOVINKY",
      sportTags: JSON.stringify(["lyze-a-snowboard"]),
      metaDescription: "Přehled cen skipasů v Česku, Rakousku a Itálii na sezónu 2026/27. Ceny ověřené k listopadu 2026.",
      sources: JSON.stringify([]),
      relatedProducts: JSON.stringify([]),
      published: true,
      publishedAt: new Date("2026-11-07"),
    },
    {
      title: "Jak se obléct na svah: 5 věcí, na kterých záleží",
      slug: "jak-se-oblect-na-svah",
      excerpt: "Vrstvení na hory není věda. Tady je 5 pravidel, co fungují.",
      content: "<h2>...</h2><p>...</p>",
      coverImage: null,
      author: "Qsport.cz",
      tags: JSON.stringify(["lyže", "oblečení"]),
      section: "TIPY_NAVODY",
      sportTags: JSON.stringify(["lyze-a-snowboard", "obleceni-a-vrstvy"]),
      metaDescription: "Jak se správně obléct na lyže a snowboard. 5 zásad vrstvení, které ti ušetří peníze i komfort.",
      sources: JSON.stringify([]),
      relatedProducts: JSON.stringify([]),
      published: true,
      publishedAt: new Date("2026-11-05"),
    },
    {
      title: "Cloudmonster, nebo Cloudsurfer? Který na každý den",
      slug: "cloudmonster-vs-cloudsurfer",
      excerpt: "Dva nejprodávanější modely On ve srovnání. Který je pro tebe?",
      content: "<h2>...</h2><p>...</p>",
      coverImage: null,
      author: "Qsport.cz",
      tags: JSON.stringify(["běh", "On"]),
      section: "TESTY_SROVNANI",
      sportTags: JSON.stringify(["beh"]),
      metaDescription: "On Cloudmonster vs Cloudsurfer – porovnání dvou nejprodávanějších běžeckých bot On. Odpružení, váha, povrch, cena.",
      sources: JSON.stringify([]),
      relatedProducts: JSON.stringify(["on-cloudmonster", "on-cloudsurfer"]),
      published: true,
      publishedAt: new Date("2026-11-03"),
    },
  ],
});
```

---

### Phase 7: SEO + Sitemap

#### 7.1 Blog detail metadata — `src/app/(public)/blog/[slug]/page.tsx` (EDIT)

Use `metaDescription` field if available:

```typescript
export async function generateMetadata({ params }) {
  const post = await getBlogPostBySlug(slug);
  return {
    title: `${post.title} | Blog | Qsport.cz`,
    description: post.metaDescription || post.excerpt || `${post.title} – blog Qsport.cz`,
    openGraph: {
      title: post.title,
      description: post.metaDescription || post.excerpt,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}
```

#### 7.2 Sitemap — `src/app/sitemap.ts` (EDIT, already includes blog)

Add section pages as additional sitemap entries:
```typescript
// Section landing pages
...Object.values(SECTION_SLUGS).map((slug) => ({
  url: `${baseUrl}/blog?sekce=${slug}`,
  lastModified: now,
  changeFrequency: "weekly" as const,
  priority: 0.6,
})),
```

---

## File Summary

| File | Action | Phase |
|------|--------|-------|
| `prisma/schema.prisma` | EDIT (expand BlogPost) | 1 |
| `src/lib/blog-constants.ts` | CREATE | 1 |
| `src/lib/blog.ts` | EDIT (add filtering, parsers) | 2 |
| `src/app/(admin)/admin/blog/page.tsx` | EDIT (section column, filter) | 3 |
| `src/app/(admin)/admin/blog/novy/page.tsx` | EDIT (new form fields) | 3 |
| `src/app/(admin)/admin/blog/[id]/page.tsx` | EDIT (new form fields) | 3 |
| `src/components/BlogCard.tsx` | CREATE | 4 |
| `src/app/(public)/blog/page.tsx` | EDIT (section tabs, sport filter) | 4 |
| `src/app/(public)/blog/[slug]/page.tsx` | EDIT (section badge, sources, products, event) | 4 |
| `src/app/(public)/page.tsx` | EDIT (blog teaser section) | 5 |
| `prisma/seed.ts` | EDIT (expanded blog seeds) | 6 |
| `src/app/sitemap.ts` | EDIT (section URLs) | 7 |

## Migration Notes

- Run `npx prisma db push` after schema changes (SQLite, dev only)
- New fields have defaults → existing data won't break
- `section` defaults to "NOVINKY" → existing posts become Novinky
- `sportTags`, `sources`, `relatedProducts` default to "[]" → safe

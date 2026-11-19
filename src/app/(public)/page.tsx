import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { getLatestBlogPosts } from "@/lib/blog";
import { BlogCard } from "@/components/BlogCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/structured-data";
import { getInstagramPosts } from "@/lib/instagram";
import { InstagramGrid } from "@/components/InstagramGrid";

const categoryPastels: Record<string, string> = {
  "muzi": "bg-sky",
  "zeny": "bg-peach",
  "deti": "bg-mint",
  "beh": "bg-mint",
  "zima": "bg-sky",
  "hory-a-outdoor": "bg-sky",
  "obleceni": "bg-peach",
  "doplnky": "bg-lilac",
  "bazar": "bg-wash",
};


export default async function HomePage() {
  const [brands, bestsellers, blogPosts, instagramPosts, pocProducts, genderCategories] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        photos: { contains: "shopify" },
        variants: {
          some: {
            active: true,
            OR: [{ ownStock: { gt: 0 } }, { supplierStock: { gt: 0 } }],
          },
        },
      },
      include: {
        variants: { where: { active: true }, orderBy: { position: "asc" } },
        brand: true,
        categories: { include: { category: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 60,
    }),
    getLatestBlogPosts(3),
    getInstagramPosts(6),
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        photos: { contains: "shopify" },
        brand: { slug: "poc" },
      },
      include: {
        variants: { where: { active: true }, orderBy: { position: "asc" } },
        brand: true,
        categories: { include: { category: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.category.findMany({
      where: { slug: { in: ["muzi", "zeny", "deti"] } },
      include: { children: { select: { id: true } } },
    }),
  ]);

  // Build gender category counts (parent + all children) and fetch card images
  const genderData: Record<string, { count: number; photo: string | null }> = {};
  await Promise.all(
    genderCategories.map(async (gc) => {
      const allIds = [gc.id, ...gc.children.map((c) => c.id)];
      const [count, sample] = await Promise.all([
        prisma.product.count({
          where: {
            status: "ACTIVE",
            photos: { not: "[]" },
            categories: { some: { categoryId: { in: allIds } } },
          },
        }),
        prisma.product.findFirst({
          where: {
            status: "ACTIVE",
            photos: { contains: "shopify" },
            categories: { some: { categoryId: { in: allIds } } },
          },
          select: { photos: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      let photo: string | null = null;
      if (sample) {
        try {
          const photos = JSON.parse(sample.photos);
          if (photos.length > 0) photo = photos[0];
        } catch {}
      }
      genderData[gc.slug] = { count, photo };
    })
  );

  return (
    <div>
      {/* 1. Hero — search-first */}
      <section className="bg-navy text-white">
        <div className="max-w-[var(--container)] mx-auto px-6 py-10 lg:py-20 text-center">
          <h1 className="text-[32px] lg:text-[48px] font-extrabold tracking-[-0.04em] mb-2">
            Výkon bez{" "}
            <span className="relative inline-block">
              kompromisů.
              <span className="absolute bottom-[2px] left-0 w-full h-[5px] bg-lime rounded-full" />
            </span>
          </h1>
          <p className="text-[15px] text-white/50 font-medium mb-8">
            Sportovní vybavení od značek On, POC, Maloja, Alpina a Mizuno
          </p>
          <SearchAutocomplete variant="hero" placeholder="Hledej značku, produkt nebo kategorii..." />
          <div className="flex flex-nowrap overflow-x-auto sm:flex-wrap justify-center gap-2 mt-6 pb-2 sm:pb-0 scrollbar-hide">
            {["Běžecké boty", "POC helmy", "Maloja bundy", "Trailové boty", "Zimní bundy", "Doplňky"].map((q) => (
              <Link
                key={q}
                href={`/hledat?q=${encodeURIComponent(q)}`}
                className="shrink-0 px-4 py-2 rounded-full border border-white/20 text-white/70 text-[13px] font-medium hover:bg-white/10 hover:text-white transition-colors"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Prémiové značky — logo strip */}
      <section className="border-b border-line">
        <div className="max-w-[var(--container)] mx-auto px-6 py-10">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted text-center mb-6">Prémiové značky</div>
          <div className="flex flex-wrap justify-center gap-6 lg:justify-between lg:gap-0">
            {[
              { name: "On", slug: "on", file: "/brands/on.svg", w: 60, h: 24 },
              { name: "POC", slug: "poc", file: "/brands/poc.svg", w: 72, h: 24 },
              { name: "Maloja", slug: "maloja", file: "/brands/maloja.svg", w: 80, h: 24 },
              { name: "Alpina", slug: "alpina", file: "/brands/alpina.svg", w: 84, h: 24 },
              { name: "Mizuno", slug: "mizuno", file: "/brands/mizuno.svg", w: 70, h: 30 },
              { name: "LEKI", slug: "leki", file: "/brands/leki.svg", w: 80, h: 24 },
            ].map((brand) => (
              <Link
                key={brand.slug}
                href={`/znacky/${brand.slug}`}
                className="grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300 py-3"
              >
                <Image
                  src={brand.file}
                  alt={brand.name}
                  width={brand.w}
                  height={brand.h}
                  className="h-[24px] lg:h-[36px] w-auto"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Bestsellery — "Co teď frčí." */}
      <section className="max-w-[var(--container)] mx-auto px-6 pt-14 pb-12">
        <div className="flex justify-between items-center mb-1">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1">Bestsellery měsíce</div>
            <h2 className="text-[32px] lg:text-[40px] font-extrabold tracking-[-0.04em]">Co teď frčí.</h2>
          </div>
          <Link
            href="/hledat"
            className="hidden sm:inline-flex items-center h-10 border border-ink text-ink text-[11px] font-extrabold uppercase tracking-[0.12em] px-5 rounded-[var(--radius-pill)] hover:bg-ink hover:text-white transition-all"
          >
            Zobrazit vše
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {(() => {
            // Seed-based shuffle for variety per day (avoids hydration mismatch)
            const daySeed = Math.floor(Date.now() / 86400000);
            const idHash = (id: string) => id.split('').reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0);
            const shuffled = [...bestsellers].sort((a, b) => {
              const ha = ((idHash(a.id) + daySeed) % 1000) / 1000;
              const hb = ((idHash(b.id) + daySeed) % 1000) / 1000;
              return ha - hb;
            });
            const sorted = shuffled.sort((a, b) => {
              const aOwn = a.variants.some(v => v.ownStock > 0) ? 1 : 0;
              const bOwn = b.variants.some(v => v.ownStock > 0) ? 1 : 0;
              return bOwn - aOwn;
            });
            // Pick 4 from different brands
            const seen = new Set<string>();
            const picks = sorted.filter((p) => {
              if (seen.has(p.brand.slug)) return false;
              seen.add(p.brand.slug);
              return true;
            }).slice(0, 4);
            if (picks.length < 4) {
              for (const p of sorted) {
                if (picks.length >= 4) break;
                if (!picks.includes(p)) picks.push(p);
              }
            }
            return picks.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                badge={i === 0 ? "BESTSELLER" : i === 2 ? "NOVINKA" : null}
              />
            ));
          })()}
        </div>
      </section>

      {/* 4. Nakupovat podle — Muži, Ženy, Děti (AboutYou style) */}
      <section className="max-w-[var(--container)] mx-auto px-6 pb-14">
        <div className="mb-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1">Nakupovat podle</div>
          <h2 className="text-[32px] lg:text-[40px] font-extrabold tracking-[-0.04em]">Pro koho hledáš?</h2>
        </div>

        {/* 3 big gender cards — product photo + gradient overlay */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[
            { slug: "muzi", name: "Muži", bg: "bg-sky", gradient: "from-sky via-sky/70 to-transparent", desc: "Bundy, kalhoty, trička, termoprádlo" },
            { slug: "zeny", name: "Ženy", bg: "bg-peach", gradient: "from-peach via-peach/70 to-transparent", desc: "Bundy, sukně, mikiny, termoprádlo" },
            { slug: "deti", name: "Děti", bg: "bg-mint", gradient: "from-mint via-mint/70 to-transparent", desc: "Bundy, kalhoty, trička, mikiny" },
          ].map((item) => {
            const data = genderData[item.slug];
            return (
              <Link
                key={item.slug}
                href={`/kategorie/${item.slug}`}
                className={`group relative overflow-hidden rounded-[10px] ${item.bg} hover:shadow-[0_8px_24px_rgba(11,23,39,0.08)] hover:-translate-y-1 transition-all`}
              >
                {/* Product photo background */}
                {data?.photo && (
                  <Image
                    src={data.photo}
                    alt={item.name}
                    fill
                    className="object-cover object-center opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                )}
                {/* Gradient overlay for text readability */}
                <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient}`} />
                <div className="aspect-[4/3] p-6 flex flex-col justify-between relative z-10">
                  <div>
                    <h3 className="text-[32px] lg:text-[40px] font-extrabold text-navy tracking-[-0.02em]">{item.name}</h3>
                    <p className="text-[13px] text-navy/50 font-medium mt-1">{item.desc}</p>
                    <p className="text-[12px] font-bold text-navy/30 mt-2">{data?.count || 0} produktů</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-navy/60 group-hover:text-navy transition-colors">Nakupovat</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-navy/60 group-hover:translate-x-1 group-hover:text-navy transition-all">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Sport categories — smaller row below */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { slug: "beh", name: "Běh", bg: "bg-mint" },
            { slug: "zima", name: "Zima", bg: "bg-sky" },
            { slug: "hory-a-outdoor", name: "Outdoor", bg: "bg-sky" },
            { slug: "doplnky", name: "Doplňky", bg: "bg-lilac" },
          ].map((item) => (
            <Link
              key={item.slug}
              href={`/kategorie/${item.slug}`}
              className={`group ${item.bg} rounded-[10px] p-4 min-h-[100px] flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all`}
            >
              <h3 className="text-[18px] font-extrabold text-navy">{item.name}</h3>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-navy/50">Prozkoumat</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-navy/50">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Série / Akce — navy left panel + product cards */}
      <section className="max-w-[var(--container)] mx-auto px-6 pb-14">
        <div className="mb-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1">Série · POC na zimu</div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
          {/* Navy info panel */}
          <div className="bg-navy rounded-[10px] p-6 lg:p-8 flex flex-col justify-between min-h-[220px] lg:min-h-[300px]">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 mb-2">Série · POC na zimu</div>
              <h3 className="text-[28px] lg:text-[32px] font-extrabold text-white tracking-[-0.04em] leading-tight">
                Teplo<br />i v minusech.
              </h3>
              <p className="text-[14px] text-white/50 font-medium mt-3 leading-relaxed">
                Parky, funkční vrstvy a helmy POC. Švédská přesnost, sezónní ceny.
              </p>
            </div>
            <Link
              href="/znacky/poc"
              className="inline-flex items-center self-start h-10 border border-white/30 text-white text-[11px] font-extrabold uppercase tracking-[0.12em] px-5 rounded-[var(--radius-pill)] hover:bg-white/10 transition-all mt-6"
            >
              Vybrat POC
            </Link>
          </div>
          {/* Product cards */}
          <div className="grid grid-cols-2 gap-4">
            {pocProducts.slice(0, 2).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 6. Proč Qsport — navy thin strip, icon left + text right */}
      <section className="bg-navy">
        <div className="max-w-[var(--container)] mx-auto px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                title: "Nákup bez registrace",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-lime">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                ),
              },
              {
                title: "Skladem — expedice do 24h",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-lime">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                ),
              },
              {
                title: "Doprava od 49 Kč",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-lime">
                    <rect x="1" y="3" width="15" height="13" rx="2" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <span className="text-[14px] font-bold text-white">{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Blog — "Ze světa sportu." */}
      {blogPosts.length > 0 && (
        <section className="max-w-[var(--container)] mx-auto px-6 pb-14">
          <div className="flex justify-between items-end mb-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1">Blog</div>
              <h2 className="text-[32px] lg:text-[40px] font-extrabold tracking-[-0.04em]">Ze světa sportu.</h2>
            </div>
            <Link
              href="/blog"
              className="hidden sm:inline-flex items-center h-10 border border-ink text-ink text-[11px] font-extrabold uppercase tracking-[0.12em] px-5 rounded-[var(--radius-pill)] hover:bg-ink hover:text-white transition-all"
            >
              Zobrazit vše
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {blogPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
          <div className="sm:hidden mt-4 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center h-10 border border-ink text-ink text-[11px] font-extrabold uppercase tracking-[0.12em] px-5 rounded-[var(--radius-pill)] hover:bg-ink hover:text-white transition-all"
            >
              Zobrazit vše
            </Link>
          </div>
        </section>
      )}

      {/* 8. Instagram — "Sleduj nás na Instagramu." */}
      <section className="max-w-[var(--container)] mx-auto px-6 pb-14">
        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1">@qsport.cz</div>
            <h2 className="text-[28px] lg:text-[36px] font-extrabold tracking-[-0.04em]">Sleduj nás na Instagramu.</h2>
          </div>
          <a
            href="https://instagram.com/qsport.cz"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center h-10 border border-ink text-ink text-[11px] font-extrabold uppercase tracking-[0.12em] px-5 rounded-[var(--radius-pill)] hover:bg-ink hover:text-white transition-all"
          >
            Sledovat
          </a>
        </div>
        <InstagramGrid posts={instagramPosts} />
        <div className="sm:hidden mt-4 text-center">
          <a
            href="https://instagram.com/qsport.cz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center h-10 border border-ink text-ink text-[11px] font-extrabold uppercase tracking-[0.12em] px-5 rounded-[var(--radius-pill)] hover:bg-ink hover:text-white transition-all"
          >
            Sledovat
          </a>
        </div>
      </section>

      {/* 8. Newsletter — navy pozadí, lime tlačítko */}
      <section className="bg-navy">
        <div className="max-w-[var(--container)] mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-[24px] lg:text-[28px] font-extrabold text-white tracking-[-0.04em]">Novinky a akce jako první.</h3>
            <p className="text-[13px] text-white/50 font-medium mt-1">Žádný spam. Jen to, co stojí za to.</p>
          </div>
          <NewsletterForm />
        </div>
      </section>

      {/* JSON-LD: Organization + WebSite */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebSiteJsonLd()) }}
      />
    </div>
  );
}

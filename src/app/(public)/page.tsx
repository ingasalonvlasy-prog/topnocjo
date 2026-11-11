import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { HeroSearch } from "@/components/HeroSearch";
import { getLatestBlogPosts } from "@/lib/blog";
import { BlogCard } from "@/components/BlogCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/structured-data";
import { getInstagramPosts } from "@/lib/instagram";
import { InstagramGrid } from "@/components/InstagramGrid";

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
  "bazar": "bg-wash",
};

const categoryIcons: Record<string, string> = {
  "beh": "/icons/beh.svg",
  "bezecke-boty": "/icons/beh.svg",
  "hory-a-outdoor": "/icons/outdoor.svg",
  "zima": "/icons/zima.svg",
  "obleceni": "/icons/obleceni.svg",
  "doplnky": "/icons/doplnky.svg",
  "kopacky": "/icons/beh.svg",
  "volejbalova-obuv": "/icons/beh.svg",
  "cyklo-helmy": "/icons/outdoor.svg",
  "bazar": "/icons/beh.svg",
};

// Grid positions for asymmetric category layout (matching mockup)
// Row 1: Běh (large, 2 rows), Zima (1 row), Oblečení (1 row)
// Row 2: (Běh continues), Batohy (1 row), Bazar (1 row)

export default async function HomePage() {
  const [categories, brands, newest, bestsellers, blogPosts, instagramPosts] = await Promise.all([
    prisma.category.findMany({ orderBy: { position: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      include: {
        variants: { where: { active: true }, orderBy: { position: "asc" } },
        brand: true,
        categories: { include: { category: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      include: {
        variants: { where: { active: true }, orderBy: { position: "asc" } },
        brand: true,
        categories: { include: { category: true } },
      },
      orderBy: { reviewCount: "desc" },
      take: 4,
    }),
    getLatestBlogPosts(3),
    getInstagramPosts(6),
  ]);

  return (
    <div>
      {/* 1. Hero — search-first */}
      <section className="bg-navy text-white">
        <div className="max-w-[var(--container)] mx-auto px-6 py-14 lg:py-20 text-center">
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
          <HeroSearch />
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {["Běžecké boty", "POC helmy", "Maloja bundy", "Trailové boty", "Zimní bundy", "Doplňky"].map((q) => (
              <Link
                key={q}
                href={`/hledat?q=${encodeURIComponent(q)}`}
                className="px-4 py-2 rounded-full border border-white/20 text-white/70 text-[13px] font-medium hover:bg-white/10 hover:text-white transition-colors"
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
          <div className="flex justify-between items-center gap-6 lg:gap-0 flex-wrap">
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
                className="grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
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
          {bestsellers.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              badge={i === 0 ? "BESTSELLER" : i === 2 ? "NOVINKA" : null}
            />
          ))}
        </div>
      </section>

      {/* 4. Kategorie — "Venku je tvoje hřiště." — asymmetric grid */}
      <section className="max-w-[var(--container)] mx-auto px-6 pb-14">
        <div className="mb-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1">Kategorie</div>
          <h2 className="text-[32px] lg:text-[40px] font-extrabold tracking-[-0.04em]">Venku je tvoje hřiště.</h2>
        </div>

        {/* Asymmetric grid: Běh (tall left, row-span-2), Hory+Zima (right top), Oblečení+Doplňky (right bottom), Bazar (full width) */}
        {(() => {
          const categoryOrder = ["beh", "hory-a-outdoor", "zima", "obleceni", "doplnky", "bazar"];
          const orderedCategories = categoryOrder
            .map(slug => categories.find(c => c.slug === slug))
            .filter((c): c is NonNullable<typeof c> => c != null);

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] gap-4 mt-6">
              {orderedCategories.map((cat, i) => {
                const bg = categoryPastels[cat.slug] || "bg-wash";
                const icon = categoryIcons[cat.slug] || "/icons/beh.svg";
                const isLarge = i === 0;
                const isFullWidth = cat.slug === "bazar";

                return (
                  <Link
                    key={cat.id}
                    href={`/kategorie/${cat.slug}`}
                    className={`group relative overflow-hidden rounded-[10px] ${bg} ${
                      isLarge ? "sm:col-span-2 lg:col-span-1 lg:row-span-2" : ""
                    } ${isFullWidth ? "sm:col-span-2 lg:col-span-3" : ""}`}
                  >
                    <div className={`${isLarge ? "aspect-square lg:aspect-auto lg:h-full min-h-[280px]" : isFullWidth ? "min-h-[120px]" : "aspect-[3/2] min-h-[160px]"} p-5 flex flex-col justify-between relative`}>
                      <div>
                        <h3 className="text-[22px] lg:text-[28px] font-extrabold text-navy tracking-[-0.02em]">{cat.name}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-navy/60">Nakupovat</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-navy/60">
                            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                          </svg>
                        </div>
                        {cat.slug === "bazar" && (
                          <p className="text-[13px] text-navy/50 font-medium mt-2 max-w-[140px]">
                            Druhá šance pro výbavu.
                          </p>
                        )}
                      </div>
                      {/* Category icon */}
                      <div className={`${isLarge ? "absolute bottom-4 right-4 w-[120px] h-[120px] lg:w-[180px] lg:h-[180px]" : "absolute bottom-2 right-2 w-[80px] h-[80px] lg:w-[100px] lg:h-[100px]"}`}>
                        <Image
                          src={icon}
                          alt={cat.name}
                          fill
                          className="object-contain opacity-30"
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })()}
      </section>

      {/* 5. Série / Akce — navy left panel + product cards */}
      <section className="max-w-[var(--container)] mx-auto px-6 pb-14">
        <div className="mb-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1">Série · POC na zimu</div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
          {/* Navy info panel */}
          <div className="bg-navy rounded-[10px] p-8 flex flex-col justify-between min-h-[300px]">
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
            {newest.slice(0, 2).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 6. Proč Qsport — "Výkon bez kompromisů." with numbered boxes */}
      <section className="max-w-[var(--container)] mx-auto px-6 pb-14">
        <div className="mb-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1">Proč Qsport</div>
          <h2 className="text-[32px] lg:text-[40px] font-extrabold tracking-[-0.04em]">Výkon bez kompromisů.</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { num: "01", title: "Nákup bez registrace" },
            { num: "02", title: "Cena a dostupnost u každého produktu" },
            { num: "03", title: "Doprava a platba předem jasně" },
          ].map((box) => (
            <div key={box.num} className="bg-wash rounded-[10px] p-6 min-h-[160px] flex flex-col justify-between">
              <span className="text-[28px] font-extrabold text-line">{box.num}</span>
              <h3 className="text-[15px] font-bold text-ink mt-4">{box.title}</h3>
            </div>
          ))}
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

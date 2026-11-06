import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { formatPrice, getMinPrice } from "@/lib/products";

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
  const [categories, brands, newest, bestsellers] = await Promise.all([
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
      orderBy: { createdAt: "asc" },
      take: 4,
    }),
  ]);

  return (
    <div>
      {/* 1. Hero — compact navy strip */}
      <section className="bg-navy text-white">
        <div className="max-w-[var(--container)] mx-auto px-6 py-10 lg:py-12 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6">
          <div className="text-center lg:text-left">
            <h1 className="text-[32px] lg:text-[36px] font-extrabold leading-[1.1] tracking-[-0.04em] mb-2">
              Venku je tvoje{" "}
              <span className="relative inline-block">
                hřiště.
                <span className="absolute bottom-0 left-0 w-full h-[5px] bg-lime" style={{ bottom: "3px" }} />
              </span>
            </h1>
            <p className="text-[14px] text-white/60 font-medium max-w-[380px] mx-auto lg:mx-0">
              Sportovní výbava, co drží tempo. On, Mizuno, POC a další.
            </p>
          </div>
          <Link
            href="/hledat"
            className="inline-flex items-center h-11 bg-lime text-navy text-[12px] font-extrabold uppercase tracking-[0.12em] px-8 rounded-[var(--radius-pill)] hover:brightness-110 transition-all shrink-0 w-full lg:w-auto justify-center"
          >
            Nakupovat
          </Link>
        </div>
      </section>

      {/* 2. Prémiové značky — logo strip */}
      <section className="border-b border-line">
        <div className="max-w-[var(--container)] mx-auto px-6 py-8">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted text-center mb-5">Prémiové značky</div>
          <div className="flex justify-between items-center gap-6 lg:gap-0 flex-wrap">
            {["On", "POC", "MALOJA", "alpina", "Mizuno", "LEKI"].map((name) => (
              <span key={name} className="text-[18px] lg:text-[22px] font-extrabold text-[#c8cdd4] tracking-[0.06em] hover:text-muted transition-colors cursor-default" style={{ fontVariantCaps: name === name.toUpperCase() ? "normal" : undefined }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Bestsellery — "Co teď frčí." */}
      <section className="max-w-[var(--container)] mx-auto px-6 pt-14 pb-12">
        <div className="flex justify-between items-end mb-1">
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

        {/* Asymmetric grid: Běh (tall left), Zima+Oblečení (right top), Doplňky+Bazar (right bottom) */}
        {(() => {
          const categoryOrder = ["beh", "zima", "obleceni", "doplnky", "bazar"];
          const orderedCategories = categoryOrder
            .map(slug => categories.find(c => c.slug === slug))
            .filter((c): c is NonNullable<typeof c> => c != null);

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] gap-3 mt-6">
              {orderedCategories.map((cat, i) => {
                const bg = categoryPastels[cat.slug] || "bg-wash";
                const icon = categoryIcons[cat.slug] || "/icons/beh.svg";
                const isLarge = i === 0;

                return (
                  <Link
                    key={cat.id}
                    href={`/kategorie/${cat.slug}`}
                    className={`group relative overflow-hidden rounded-[10px] ${bg} ${
                      isLarge ? "sm:col-span-2 lg:col-span-1 lg:row-span-2" : ""
                    }`}
                  >
                    <div className={`${isLarge ? "aspect-square lg:aspect-auto lg:h-full min-h-[280px]" : "aspect-[3/2] min-h-[160px]"} p-5 flex flex-col justify-between relative`}>
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
            <div key={box.num} className="bg-wash rounded-[10px] p-6 min-h-[140px] flex flex-col justify-between">
              <span className="text-[28px] font-extrabold text-line">{box.num}</span>
              <h3 className="text-[15px] font-bold text-ink mt-4">{box.title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Instagram — "Sleduj nás na Instagramu." */}
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
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square bg-wash rounded-[10px] flex items-center justify-center text-line text-[12px] font-bold">
              IG
            </div>
          ))}
        </div>
      </section>

      {/* 8. Newsletter — navy pozadí, lime tlačítko */}
      <section className="bg-navy">
        <div className="max-w-[var(--container)] mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-[24px] lg:text-[28px] font-extrabold text-white tracking-[-0.04em]">Novinky a akce jako první.</h3>
            <p className="text-[13px] text-white/50 font-medium mt-1">Žádný spam. Jen to, co stojí za to.</p>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <input
              type="email"
              placeholder="tvuj@email.cz"
              className="flex-1 sm:w-[260px] py-3 px-4 rounded-[var(--radius-field)] border border-white/15 bg-white/5 text-white text-[14px] font-medium outline-none placeholder:text-white/30 focus:border-lime/40"
            />
            <button className="bg-lime text-navy px-6 py-3 rounded-[var(--radius-pill)] text-[12px] font-extrabold uppercase tracking-[0.12em] hover:brightness-110 transition-all shrink-0">
              Přihlásit
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

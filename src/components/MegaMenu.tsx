"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef } from "react";
import { usePathname } from "next/navigation";

export interface NavCategory {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
}

export interface NavBrand {
  name: string;
  slug: string;
  logo: string | null;
}

/** Section config for gender mega menus */
interface MenuSection {
  title: string;
  links: { label: string; slug: string }[];
}

export const GENDER_SECTIONS: Record<string, MenuSection[]> = {
  muzi: [
    {
      title: "Oblečení",
      links: [
        { label: "Bundy", slug: "panske-bundy" },
        { label: "Kabáty a vesty", slug: "panske-kabaty-a-vesty" },
        { label: "Kalhoty", slug: "panske-kalhoty" },
        { label: "Kraťasy", slug: "panske-kratasy" },
        { label: "Mikiny", slug: "panske-mikiny" },
        { label: "Trička a košile", slug: "panske-tricka" },
        { label: "Termoprádlo", slug: "panske-termopradlo" },
      ],
    },
    {
      title: "Boty",
      links: [
        { label: "Běžecké boty", slug: "beh" },
        { label: "Zimní boty", slug: "zimni-boty" },
        { label: "Trekkové boty", slug: "hory-a-outdoor" },
        { label: "Halová obuv", slug: "halova-obuv" },
        { label: "Kopačky", slug: "ragbyove-kopacky" },
      ],
    },
    {
      title: "Sport",
      links: [
        { label: "Běh", slug: "beh" },
        { label: "Lyžování", slug: "zima" },
        { label: "Outdoor", slug: "hory-a-outdoor" },
        { label: "Fitness", slug: "sporty-fitness-a-trenink" },
      ],
    },
    {
      title: "Doplňky",
      links: [
        { label: "Brýle", slug: "sportovni-bryle" },
        { label: "Chrániče", slug: "sportovni-chranice" },
        { label: "Batohy a tašky", slug: "lyzarske-batohy-a-tasky" },
      ],
    },
  ],
  zeny: [
    {
      title: "Oblečení",
      links: [
        { label: "Bundy", slug: "damske-bundy" },
        { label: "Kabáty a vesty", slug: "damske-kabaty-a-vesty" },
        { label: "Kalhoty", slug: "damske-kalhoty" },
        { label: "Kraťasy", slug: "damske-kratasy" },
        { label: "Mikiny", slug: "damske-mikiny" },
        { label: "Trička a košile", slug: "damske-tricka" },
        { label: "Sukně a šaty", slug: "damske-sukne-a-saty" },
        { label: "Termoprádlo", slug: "damske-termopradlo" },
        { label: "Plavky a prádlo", slug: "damske-plavky-a-pradlo" },
      ],
    },
    {
      title: "Boty",
      links: [
        { label: "Běžecké boty", slug: "beh" },
        { label: "Zimní boty", slug: "zimni-boty" },
        { label: "Trekkové boty", slug: "hory-a-outdoor" },
      ],
    },
    {
      title: "Sport",
      links: [
        { label: "Běh", slug: "beh" },
        { label: "Lyžování", slug: "zima" },
        { label: "Outdoor", slug: "hory-a-outdoor" },
        { label: "Fitness", slug: "sporty-fitness-a-trenink" },
      ],
    },
    {
      title: "Doplňky",
      links: [
        { label: "Brýle", slug: "sportovni-bryle" },
        { label: "Chrániče", slug: "sportovni-chranice" },
        { label: "Batohy a tašky", slug: "lyzarske-batohy-a-tasky" },
      ],
    },
  ],
  deti: [
    {
      title: "Oblečení",
      links: [
        { label: "Bundy", slug: "detske-bundy" },
        { label: "Kabáty a vesty", slug: "detske-kabaty-a-vesty" },
        { label: "Kalhoty", slug: "detske-kalhoty" },
        { label: "Kraťasy a sukně", slug: "detske-kratasy-a-sukne" },
        { label: "Mikiny", slug: "detske-mikiny" },
        { label: "Trička", slug: "detske-tricka" },
        { label: "Termoprádlo", slug: "detske-termopradlo" },
      ],
    },
    {
      title: "Boty",
      links: [
        { label: "Běžecké boty", slug: "beh" },
        { label: "Zimní boty", slug: "zimni-boty" },
      ],
    },
    {
      title: "Sport",
      links: [
        { label: "Lyžování", slug: "zima" },
        { label: "Outdoor", slug: "hory-a-outdoor" },
      ],
    },
    {
      title: "Doplňky",
      links: [
        { label: "Brýle", slug: "sportovni-bryle" },
        { label: "Chrániče", slug: "sportovni-chranice" },
      ],
    },
  ],
};

const GENDER_SLUGS = new Set(["muzi", "zeny", "deti"]);

/* ─── Desktop: Gender mega dropdown with TOP ZNAČKY ─── */

interface DesktopGenderDropdownProps {
  category: NavCategory;
  topBrands: NavBrand[];
  onClose: () => void;
}

export function DesktopGenderDropdown({ category, topBrands, onClose }: DesktopGenderDropdownProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sections = GENDER_SECTIONS[category.slug] ?? [];

  return (
    <div
      className="static"
      onMouseEnter={() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setOpen(true);
      }}
      onMouseLeave={() => {
        timerRef.current = setTimeout(() => setOpen(false), 150);
      }}
    >
      <Link
        href={`/kategorie/${category.slug}`}
        className={`px-4 py-2 text-[14px] font-bold transition-colors ${
          open ? "text-navy" : "text-ink hover:text-navy"
        }`}
        onClick={() => { setOpen(false); onClose(); }}
      >
        {category.name}
      </Link>

      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 bg-white border-t border-line shadow-xl"
          onMouseEnter={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
          }}
          onMouseLeave={() => {
            timerRef.current = setTimeout(() => setOpen(false), 150);
          }}
        >
          <div className="max-w-[var(--container)] mx-auto px-6 py-6">
            <Link
              href={`/kategorie/${category.slug}`}
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-navy mb-5 hover:text-blue transition-colors"
              onClick={() => { setOpen(false); onClose(); }}
            >
              Vše pro {category.name.toLowerCase()}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>

            <div className={`grid gap-8 ${topBrands.length > 0 ? "grid-cols-5" : "grid-cols-4"}`}>
              {sections.map((section) => (
                <div key={section.title}>
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted mb-3">
                    {section.title}
                  </h4>
                  <ul className="space-y-2">
                    {section.links.map((link) => (
                      <li key={link.slug + link.label}>
                        <Link
                          href={`/kategorie/${link.slug}`}
                          className="text-[13px] text-ink hover:text-navy font-medium transition-colors block"
                          onClick={() => { setOpen(false); onClose(); }}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {topBrands.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted mb-3">
                    Top značky
                  </h4>
                  <ul className="space-y-3">
                    {topBrands.map((brand) => (
                      <li key={brand.slug}>
                        <Link
                          href={`/znacky/${brand.slug}`}
                          className="flex items-center gap-2.5 group"
                          onClick={() => { setOpen(false); onClose(); }}
                        >
                          {brand.logo ? (
                            <Image
                              src={brand.logo}
                              alt={brand.name}
                              width={40}
                              height={20}
                              className="object-contain w-[40px] h-[20px] mix-blend-multiply"
                            />
                          ) : (
                            <span className="w-[40px] h-[20px] bg-wash rounded flex items-center justify-center text-[9px] font-bold text-muted">
                              {brand.name.slice(0, 3).toUpperCase()}
                            </span>
                          )}
                          <span className="text-[12px] text-ink group-hover:text-navy transition-colors">
                            {brand.name}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Desktop: Category pill dropdown (hover on Oblečení/Boty/Sport/Doplňky) ─── */

interface CategoryPillDropdownProps {
  section: MenuSection;
  genderSlug: string;
  genderName: string;
  onClose: () => void;
}

export function CategoryPillDropdown({ section, genderSlug, genderName, onClose }: CategoryPillDropdownProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div
      className="static"
      onMouseEnter={() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setOpen(true);
      }}
      onMouseLeave={() => {
        timerRef.current = setTimeout(() => setOpen(false), 150);
      }}
    >
      <button
        className={`px-3 py-1.5 text-[13px] font-medium rounded-full transition-colors ${
          open ? "bg-navy text-white" : "text-ink hover:text-navy hover:bg-wash"
        }`}
      >
        {section.title}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 bg-white border-t border-line shadow-lg"
          style={{ minWidth: 320, width: "max-content", maxWidth: 480 }}
          onMouseEnter={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
          }}
          onMouseLeave={() => {
            timerRef.current = setTimeout(() => setOpen(false), 150);
          }}
        >
          <div className="px-6 py-5">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted mb-3">
              {section.title} pro {genderName.toLowerCase()}
            </h4>
            <div className="flex gap-6">
              {(() => {
                const COLS = 2;
                const perCol = Math.ceil(section.links.length / COLS);
                const columns: typeof section.links[] = [];
                for (let i = 0; i < COLS; i++) {
                  const slice = section.links.slice(i * perCol, (i + 1) * perCol);
                  if (slice.length) columns.push(slice);
                }
                return columns.map((col, ci) => (
                  <ul key={ci} className="space-y-2 min-w-[120px]">
                    {col.map((link) => (
                      <li key={link.slug + link.label}>
                        <Link
                          href={`/kategorie/${link.slug}`}
                          className="text-[13px] text-ink hover:text-navy font-medium transition-colors block"
                          onClick={() => { setOpen(false); onClose(); }}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ));
              })()}
            </div>
            <Link
              href={`/kategorie/${genderSlug}`}
              className="inline-flex items-center gap-1 mt-4 text-[12px] font-bold text-navy hover:text-blue transition-colors"
              onClick={() => { setOpen(false); onClose(); }}
            >
              Vše {section.title.toLowerCase()} pro {genderName.toLowerCase()}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Mobile: Tab-based gender menu + section accordions ─── */

interface MobileMenuContentProps {
  categories: NavCategory[];
  topBrands: NavBrand[];
  onClose: () => void;
}

export function MobileMenuContent({ categories, topBrands, onClose }: MobileMenuContentProps) {
  const pathname = usePathname();

  // Detect active gender from URL
  const genderCategories = categories.filter((c) => GENDER_SLUGS.has(c.slug));
  const urlGender = genderCategories.find((c) =>
    pathname.startsWith(`/kategorie/${c.slug}`)
  );
  const [activeGender, setActiveGender] = useState(urlGender?.slug ?? genderCategories[0]?.slug ?? "muzi");

  const sections = GENDER_SECTIONS[activeGender] ?? [];
  const activeCategory = genderCategories.find((c) => c.slug === activeGender);

  return (
    <>
      {/* Gender tabs */}
      <div className="flex border-b border-line mb-2">
        {genderCategories.map((cat) => (
          <button
            key={cat.slug}
            className={`flex-1 py-3 text-[14px] font-bold text-center transition-colors ${
              activeGender === cat.slug
                ? "text-navy border-b-2 border-navy"
                : "text-muted"
            }`}
            onClick={() => setActiveGender(cat.slug)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* "Vše pro ..." link */}
      {activeCategory && (
        <Link
          href={`/kategorie/${activeCategory.slug}`}
          className="flex items-center gap-1.5 py-3 text-[14px] font-bold text-navy"
          onClick={onClose}
        >
          Vše pro {activeCategory.name.toLowerCase()}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </Link>
      )}

      {/* Section accordions */}
      {sections.map((section) => (
        <MobileSectionAccordion key={section.title} section={section} onClose={onClose} />
      ))}

      {/* Top brands */}
      {topBrands.length > 0 && (
        <div className="mt-4 pt-4 border-t border-wash">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-3">
            Top značky
          </div>
          <div className="grid grid-cols-3 gap-3">
            {topBrands.map((brand) => (
              <Link
                key={brand.slug}
                href={`/znacky/${brand.slug}`}
                className="flex flex-col items-center gap-1.5 py-2 group"
                onClick={onClose}
              >
                {brand.logo ? (
                  <Image
                    src={brand.logo}
                    alt={brand.name}
                    width={48}
                    height={24}
                    className="object-contain w-[48px] h-[24px] mix-blend-multiply"
                  />
                ) : (
                  <span className="w-[48px] h-[24px] bg-wash rounded flex items-center justify-center text-[9px] font-bold text-muted">
                    {brand.name.slice(0, 3).toUpperCase()}
                  </span>
                )}
                <span className="text-[11px] text-ink group-hover:text-navy text-center">
                  {brand.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function MobileSectionAccordion({ section, onClose }: { section: MenuSection; onClose: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-wash">
      <button
        className="w-full flex items-center justify-between py-3 text-[15px] font-medium text-ink"
        onClick={() => setOpen(!open)}
      >
        {section.title}
        <svg
          className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="pb-3 pl-2 space-y-0">
          {section.links.map((link) => (
            <Link
              key={link.slug + link.label}
              href={`/kategorie/${link.slug}`}
              className="block py-2.5 text-[14px] text-ink"
              onClick={onClose}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Legacy exports for backward compatibility (desktop non-gender dropdown) ─── */

interface MegaMenuItemProps {
  category: NavCategory;
  onClose: () => void;
}

/** Desktop: single nav item that opens a dropdown panel on hover (non-gender categories) */
export function MegaMenuItem({ category, onClose }: MegaMenuItemProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (category.children.length === 0) {
    return (
      <Link
        href={`/kategorie/${category.slug}`}
        className="px-3 py-1.5 text-[14px] font-medium text-ink hover:text-navy transition-colors"
        onClick={onClose}
      >
        {category.name}
      </Link>
    );
  }

  return (
    <div
      className="static"
      onMouseEnter={() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setOpen(true);
      }}
      onMouseLeave={() => {
        timerRef.current = setTimeout(() => setOpen(false), 150);
      }}
    >
      <button
        className={`px-3 py-1.5 text-[14px] font-medium transition-colors flex items-center gap-1 ${
          open ? "text-navy" : "text-ink hover:text-navy"
        }`}
      >
        {category.name}
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 bg-white border border-line shadow-lg rounded-b-md pt-4 pb-5 px-5"
          style={{ minWidth: 280, width: "max-content", maxWidth: 560 }}
        >
          <Link
            href={`/kategorie/${category.slug}`}
            className="block text-[13px] font-bold text-navy mb-3 uppercase tracking-wide hover:text-blue transition-colors"
            onClick={() => { setOpen(false); onClose(); }}
          >
            Vše v {category.name}
          </Link>

          <div className="flex gap-6">
            {(() => {
              const COLS = 4;
              const perCol = Math.ceil(category.children.length / COLS);
              const columns: typeof category.children[] = [];
              for (let i = 0; i < COLS; i++) {
                const slice = category.children.slice(i * perCol, (i + 1) * perCol);
                if (slice.length) columns.push(slice);
              }
              return columns.map((col, ci) => (
                <ul key={ci} className="space-y-1.5 min-w-[120px]">
                  {col.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={`/kategorie/${child.slug}`}
                        className="text-[13px] text-ink hover:text-navy transition-colors block"
                        onClick={() => { setOpen(false); onClose(); }}
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

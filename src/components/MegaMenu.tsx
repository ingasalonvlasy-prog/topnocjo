"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { usePathname } from "next/navigation";

export interface NavCategory {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
}

/** Section config for gender mega menus (AboutYou style) */
interface MenuSection {
  title: string;
  links: { label: string; slug: string }[];
}

const GENDER_SECTIONS: Record<string, MenuSection[]> = {
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

interface MegaMenuItemProps {
  category: NavCategory;
  onClose: () => void;
}

/** Desktop: single nav item that opens a dropdown panel on hover */
export function MegaMenuItem({ category, onClose }: MegaMenuItemProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGender = GENDER_SLUGS.has(category.slug);

  // No children and not a gender category → plain link
  if (category.children.length === 0 && !isGender) {
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

  const sections = isGender ? GENDER_SECTIONS[category.slug] : null;

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

      {open && sections && (
        /* Full-width AboutYou-style dropdown for gender categories */
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
            {/* "Vše" link */}
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

            {/* Section columns */}
            <div className="grid grid-cols-4 gap-8">
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
            </div>
          </div>
        </div>
      )}

      {/* Regular dropdown for non-gender categories with children */}
      {open && !sections && category.children.length > 0 && (
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

/** Mobile: accordion item showing subcategories */
interface MobileMenuItemProps {
  category: NavCategory;
  onClose: () => void;
}

export function MobileMenuItem({ category, onClose }: MobileMenuItemProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isGender = GENDER_SLUGS.has(category.slug);
  const sections = isGender ? GENDER_SECTIONS[category.slug] : null;
  const isActive = pathname.startsWith(`/kategorie/${category.slug}`);

  if (category.children.length === 0 && !isGender) {
    return (
      <Link
        href={`/kategorie/${category.slug}`}
        className={`block px-0 py-3 text-[15px] font-medium border-b border-wash ${isActive ? "text-navy font-bold" : "text-ink"}`}
        onClick={onClose}
      >
        {category.name}
      </Link>
    );
  }

  return (
    <div className="border-b border-wash">
      <button
        className={`w-full flex items-center justify-between py-3 text-[15px] font-medium ${isActive ? "text-navy font-bold" : "text-ink"}`}
        onClick={() => setOpen(!open)}
      >
        {category.name}
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

      {open && sections && (
        <div className="pb-3 pl-1 space-y-4">
          <Link
            href={`/kategorie/${category.slug}`}
            className="block py-2.5 text-[14px] font-semibold text-navy"
            onClick={onClose}
          >
            Vše pro {category.name.toLowerCase()}
          </Link>
          {sections.map((section) => (
            <div key={section.title}>
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-1.5 pl-2">
                {section.title}
              </div>
              {section.links.map((link) => (
                <Link
                  key={link.slug + link.label}
                  href={`/kategorie/${link.slug}`}
                  className="block py-2.5 pl-2 text-[14px] text-ink"
                  onClick={onClose}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}

      {open && !sections && category.children.length > 0 && (
        <div className="pb-2 pl-3 space-y-0">
          <Link
            href={`/kategorie/${category.slug}`}
            className="block py-2.5 text-[14px] font-semibold text-navy"
            onClick={onClose}
          >
            Vše v {category.name}
          </Link>
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/kategorie/${child.slug}`}
              className="block py-3 text-[14px] text-ink border-t border-wash/50"
              onClick={onClose}
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

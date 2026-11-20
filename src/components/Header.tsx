"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { useCart } from "@/lib/cart";
import {
  DesktopGenderDropdown,
  CategoryPillDropdown,
  MobileMenuContent,
  GENDER_SECTIONS,
  type NavCategory,
  type NavBrand,
} from "./MegaMenu";

const GENDER_SLUGS = ["muzi", "zeny", "deti"] as const;

const staticLinks = [
  { href: "/znacky", label: "Značky" },
  { href: "/bazar", label: "Bazar" },
  { href: "/akce", label: "Akce", isAccent: true },
];

interface HeaderProps {
  categories?: NavCategory[];
  topBrands?: NavBrand[];
}

export function Header({ categories = [], topBrands = [] }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { itemCount } = useCart();
  const pathname = usePathname();
  const isHomepage = pathname === "/";

  // Detect active gender from URL
  const genderCategories = categories.filter((c) => GENDER_SLUGS.includes(c.slug as typeof GENDER_SLUGS[number]));
  const urlGender = genderCategories.find((c) => pathname.startsWith(`/kategorie/${c.slug}`));
  const [hoveredGender, setHoveredGender] = useState<string | null>(null);
  const activeGender = hoveredGender ?? urlGender?.slug ?? null;
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const activeSections = activeGender ? GENDER_SECTIONS[activeGender] ?? [] : [];
  const activeGenderCat = activeGender ? genderCategories.find((c) => c.slug === activeGender) : null;

  return (
    <>
      {/* Top info bar — navy, hidden on mobile */}
      <div className="hidden sm:block bg-navy text-white text-[11px] sm:text-[12px] font-medium tracking-wide" style={{ height: 32 }}>
        <div className="max-w-[var(--container)] mx-auto px-6 h-full flex items-center justify-center">
          <div className="flex items-center">
            <span>Nákup bez registrace</span>
            <span className="inline-block w-[5px] h-[5px] rounded-full bg-lime mx-3" />
            <span className="hidden sm:inline">Doprava od 49&nbsp;Kč</span>
            <span className="hidden sm:inline-block w-[5px] h-[5px] rounded-full bg-lime mx-3" />
            <span className="font-bold tracking-[0.12em]">BAZAR</span>
          </div>
        </div>
      </div>

      {/* Main header — sticky */}
      <header className="sticky top-0 z-50 bg-white border-b border-line">
        {/* Row 1: Logo + Search + Icons */}
        <div className="max-w-[var(--container)] mx-auto px-6">
          {/* Desktop Row 1 */}
          <div className="hidden lg:flex items-center gap-6 h-[60px]">
            <Link href="/" className="shrink-0">
              <Image
                src="/qsport-logo-web.svg"
                alt="QSPORT.cz"
                width={120}
                height={33}
                className="h-[24px] w-auto"
                priority
              />
            </Link>

            {/* Search — always visible on desktop */}
            {!isHomepage && (
              <div className="flex-1 max-w-[480px]">
                <SearchAutocomplete placeholder="Hledej značku nebo produkt..." />
              </div>
            )}
            {isHomepage && <div className="flex-1" />}

            {/* Icons */}
            <div className="flex items-center gap-2">
              <Link href="/ucet" className="w-10 h-10 flex items-center justify-center text-ink hover:text-navy transition-colors" aria-label="Můj účet">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </Link>
              <Link href="/kosik" className="relative w-10 h-10 flex items-center justify-center text-ink hover:text-navy transition-colors" aria-label="Košík">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-lime text-navy text-[11px] font-extrabold rounded-full flex items-center justify-center">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile header — hamburger left, logo center, search+account+cart right */}
          <div className="flex lg:hidden items-center justify-between h-[56px] relative">
            <button
              className="w-11 h-11 flex items-center justify-center text-ink"
              onClick={() => { setMenuOpen(!menuOpen); setMobileSearchOpen(false); }}
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>

            <Link href="/" className="absolute left-1/2 -translate-x-1/2">
              <Image
                src="/qsport-logo-web.svg"
                alt="QSPORT.cz"
                width={120}
                height={33}
                className="h-[20px] w-auto"
                priority
              />
            </Link>

            <div className="flex items-center gap-0">
              <button
                className="w-10 h-10 flex items-center justify-center text-ink"
                onClick={() => { setMobileSearchOpen(!mobileSearchOpen); setMenuOpen(false); }}
                aria-label="Hledat"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  {mobileSearchOpen ? (
                    <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  ) : (
                    <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>
                  )}
                </svg>
              </button>
              <Link href="/ucet" className="w-10 h-10 flex items-center justify-center text-ink" aria-label="Můj účet">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </Link>
              <Link href="/kosik" className="relative w-10 h-10 flex items-center justify-center text-ink" aria-label="Košík">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-lime text-navy text-[11px] font-extrabold rounded-full flex items-center justify-center">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile search — toggled via search icon */}
          {mobileSearchOpen && (
            <div className="lg:hidden pb-3">
              <SearchAutocomplete placeholder="Hledej značku nebo produkt..." />
            </div>
          )}
        </div>

        {/* Desktop Row 2: Gender tabs | Category pills | Static links */}
        <div className="hidden lg:block border-t border-line/50 bg-gray-50/50 relative">
          <div className="max-w-[var(--container)] mx-auto px-6 flex items-center h-[40px] gap-1">
            {/* Gender tabs */}
            <div className="flex items-center gap-0 mr-4">
              {genderCategories.map((cat) => (
                <div
                  key={cat.slug}
                  className="relative"
                  onMouseEnter={() => {
                    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                    setHoveredGender(cat.slug);
                  }}
                  onMouseLeave={() => {
                    hoverTimerRef.current = setTimeout(() => setHoveredGender(null), 150);
                  }}
                >
                  <DesktopGenderDropdown
                    category={cat}
                    topBrands={topBrands}
                    onClose={() => setHoveredGender(null)}
                  />
                </div>
              ))}
            </div>

            {/* Separator */}
            <div className="w-px h-5 bg-line mx-2" />

            {/* Category pills — contextual to active gender */}
            {activeGender && activeSections.length > 0 && (
              <div className="flex items-center gap-1 mr-auto">
                {activeSections.map((section) => (
                  <CategoryPillDropdown
                    key={section.title}
                    section={section}
                    genderSlug={activeGender}
                    genderName={activeGenderCat?.name ?? ""}
                    onClose={() => {}}
                  />
                ))}
              </div>
            )}

            {/* Fallback spacer when no gender is active */}
            {!activeGender && <div className="mr-auto" />}

            {/* Static links */}
            <div className="flex items-center gap-1 ml-4">
              {staticLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    link.isAccent
                      ? "text-sale font-bold"
                      : "text-ink hover:text-navy"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu — full-screen overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 lg:hidden transition-opacity duration-200 ${
          menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
      />
      <nav
        className={`fixed left-0 right-0 bottom-0 z-50 bg-white lg:hidden overflow-y-auto overscroll-contain transition-transform duration-200 ease-out ${
          menuOpen ? "translate-y-0" : "-translate-y-full pointer-events-none"
        }`}
        style={{ top: 56 }}
      >
        <div className="px-6 py-2">
          <MobileMenuContent
            categories={categories}
            topBrands={topBrands}
            onClose={() => setMenuOpen(false)}
          />

          {/* Static links */}
          <div className="mt-4 pt-2 border-t border-wash">
            {staticLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block py-3 text-[15px] font-medium border-b border-wash/50 last:border-0 ${
                  link.isAccent
                    ? "text-sale font-bold"
                    : "text-ink"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/ucet"
              className="block py-3 text-[15px] font-medium text-ink border-t border-wash"
              onClick={() => setMenuOpen(false)}
            >
              Můj účet
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}

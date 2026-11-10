"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { useCart } from "@/lib/cart";

const navLinks = [
  { href: "/kategorie/beh", label: "Běh" },
  { href: "/kategorie/hory-a-outdoor", label: "Hory a outdoor" },
  { href: "/kategorie/zima", label: "Zima" },
  { href: "/kategorie/obleceni", label: "Oblečení" },
  { href: "/kategorie/doplnky", label: "Doplňky" },
  { href: "/znacky", label: "Značky" },
  { href: "/bazar", label: "Bazar" },
  { href: "/akce", label: "Akce", isAccent: true },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { itemCount } = useCart();

  return (
    <>
      {/* Top info bar — navy, centered text with lime dots */}
      <div className="bg-navy text-white text-[12px] font-medium tracking-wide" style={{ height: 32 }}>
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

      {/* Main header — white */}
      <header className="sticky top-0 z-50 bg-white border-b border-line">
        <div className="max-w-[var(--container)] mx-auto px-6">
          {/* Desktop header */}
          <div className="hidden lg:flex items-center gap-6 h-[60px]">
            {/* Logo SVG */}
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

            {/* Desktop nav */}
            <nav className="flex items-center gap-1 flex-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-[14px] font-medium transition-colors ${
                    link.isAccent
                      ? "text-sale"
                      : "text-ink hover:text-navy"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Header icons — search, user, cart */}
            <div className="flex items-center gap-2">
              <button
                className="w-10 h-10 flex items-center justify-center text-ink hover:text-navy transition-colors"
                aria-label="Hledat"
                onClick={() => setSearchOpen(!searchOpen)}
              >
                {searchOpen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                )}
              </button>
              <Link href="/ucet" className="hidden lg:flex w-10 h-10 items-center justify-center text-ink hover:text-navy transition-colors" aria-label="Můj účet">
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

          {/* Mobile header — hamburger left, logo center, cart right */}
          <div className="flex lg:hidden items-center justify-between h-[52px] relative">
            <button
              className="w-10 h-10 flex items-center justify-center text-ink"
              onClick={() => setMenuOpen(!menuOpen)}
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

            <div className="flex items-center gap-1">
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

          {/* Desktop search — toggled */}
          {searchOpen && (
            <div className="hidden lg:block pb-3">
              <SearchAutocomplete placeholder="Hledej značku nebo produkt..." />
            </div>
          )}

          {/* Mobile search — always visible */}
          <div className="lg:hidden pb-3">
            <SearchAutocomplete placeholder="Hledej značku nebo produkt..." />
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="lg:hidden border-t border-line bg-white">
            <div className="max-w-[var(--container)] mx-auto px-6 py-3 space-y-0">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-0 py-3 text-[15px] font-medium border-b border-wash last:border-0 ${
                    link.isAccent
                      ? "text-sale font-bold"
                      : "text-ink"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}

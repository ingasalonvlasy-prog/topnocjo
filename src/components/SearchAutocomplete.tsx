"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { trackSearch } from "@/lib/analytics";

const RECENT_KEY = "qsport_recent_searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  try {
    const recent = getRecentSearches().filter((s) => s !== query);
    recent.unshift(query);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

function clearRecentSearches() {
  try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
}

interface SearchResult {
  products: { id: string; name: string; slug: string; brand: string; photo: string | null; price: number; comparePrice: number | null; inStock?: boolean; onOrder?: boolean }[];
  brands: { id: string; name: string; slug: string }[];
  categories: { id: string; name: string; slug: string }[];
}

function formatPrice(amount: number): string {
  const czk = Math.round(amount / 100);
  const formatted = new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(czk);
  return `${formatted}\u00A0Kč`;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-lime/40 text-inherit rounded-[2px] px-[1px]">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

const popularSuggestions = [
  { label: "On boty", href: "/znacky/on" },
  { label: "POC helmy", href: "/znacky/poc" },
  { label: "Maloja", href: "/znacky/maloja" },
  { label: "Běžecké boty", href: "/kategorie/beh" },
  { label: "Zimní vybavení", href: "/kategorie/zima" },
  { label: "Oblečení", href: "/kategorie/obleceni" },
];

export function SearchAutocomplete({
  placeholder = "Hledat produkty...",
  variant = "default",
}: {
  placeholder?: string;
  variant?: "default" | "hero";
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const totalResults = results
    ? results.products.length + results.brands.length + results.categories.length
    : 0;

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data: SearchResult = await res.json();
      setResults(data);
      setIsOpen(true);
      setActiveIndex(-1);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) {
      setShowRecent(false);
    } else {
      const recent = getRecentSearches();
      setRecentSearches(recent);
      if (recent.length > 0) setShowRecent(true);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(val.trim()), 300);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      saveRecentSearch(q);
      trackSearch(q);
      setIsOpen(false);
      setShowRecent(false);
      router.push(`/hledat?q=${encodeURIComponent(q)}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || !results) return;

    // Build flat list of navigable items
    const items: { type: "product" | "brand" | "category"; slug: string }[] = [];
    results.products.forEach((p) => items.push({ type: "product", slug: p.slug }));
    results.brands.forEach((b) => items.push({ type: "brand", slug: b.slug }));
    results.categories.forEach((c) => items.push({ type: "category", slug: c.slug }));

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < items.length) {
      e.preventDefault();
      const item = items[activeIndex];
      if (query.trim()) saveRecentSearch(query.trim());
      setIsOpen(false);
      setShowRecent(false);
      if (item.type === "product") router.push(`/produkt/${item.slug}`);
      else if (item.type === "brand") router.push(`/znacky/${item.slug}`);
      else router.push(`/kategorie/${item.slug}`);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setShowRecent(false);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowRecent(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  let flatIndex = 0;

  const isHero = variant === "hero";

  return (
    <div ref={containerRef} className={`relative ${isHero ? "max-w-[640px] mx-auto" : ""}`}>
      <form onSubmit={handleSubmit} className="relative">
        <svg
          className={`absolute ${isHero ? "left-5 text-white/40" : "left-3 text-muted"} top-1/2 -translate-y-1/2`}
          width={isHero ? 22 : 18}
          height={isHero ? 22 : 18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results && totalResults > 0) {
              setIsOpen(true);
            } else if (!query.trim()) {
              const recent = getRecentSearches();
              setRecentSearches(recent);
              if (recent.length > 0) setShowRecent(true);
            }
          }}
          placeholder={placeholder}
          className={
            isHero
              ? "w-full h-14 lg:h-16 pl-14 pr-5 text-[16px] lg:text-[18px] font-medium rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-lime focus:bg-white/15 focus:shadow-[0_0_0_4px_rgba(206,255,47,0.15)] transition-all"
              : "w-full py-2.5 pl-10 pr-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-wash focus:bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all"
          }
          autoComplete="off"
        />
        {loading && (
          <div className={`absolute ${isHero ? "right-5" : "right-3"} top-1/2 -translate-y-1/2`}>
            <div className={`${isHero ? "w-5 h-5 border-2 border-white/20 border-t-lime" : "w-4 h-4 border-2 border-line border-t-navy"} rounded-full animate-spin`} />
          </div>
        )}
      </form>

      {/* Dropdown */}
      {isOpen && results && totalResults > 0 && (
        <div className={`absolute top-full left-0 right-0 ${isHero ? "mt-2 rounded-[12px] shadow-2xl" : "mt-1 rounded-[var(--radius-card)] shadow-lg"} bg-white border border-line z-[60] overflow-hidden max-h-[420px] overflow-y-auto text-ink`}>
          {/* Products */}
          {results.products.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                Produkty
              </div>
              {results.products.map((product) => {
                const idx = flatIndex++;
                return (
                  <Link
                    key={product.id}
                    href={`/produkt/${product.slug}`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                      idx === activeIndex ? "bg-wash" : "hover:bg-wash"
                    }`}
                  >
                    <div className="w-[44px] h-[44px] rounded-[6px] bg-wash shrink-0 overflow-hidden flex items-center justify-center">
                      {product.photo ? (
                        <Image
                          src={product.photo}
                          alt={product.name}
                          width={44}
                          height={44}
                          className="w-full h-full object-contain p-0.5 mix-blend-multiply"
                        />
                      ) : (
                        <svg className="text-line" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="m21 15-5-5L5 21" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-ink truncate">
                        <Highlight text={product.name} query={query.trim()} />
                      </div>
                      <div className="text-[11px] text-muted font-medium">
                        <Highlight text={product.brand} query={query.trim()} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[13px] font-extrabold text-navy">{formatPrice(product.price)}</div>
                      {product.comparePrice && product.comparePrice > product.price && (
                        <div className="text-[11px] text-muted line-through">{formatPrice(product.comparePrice)}</div>
                      )}
                      {(product.inStock || product.onOrder) && (
                        <div className="text-[10px] font-bold text-green-600">Skladem</div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Brands */}
          {results.brands.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted border-t border-wash">
                Značky
              </div>
              {results.brands.map((brand) => {
                const idx = flatIndex++;
                return (
                  <Link
                    key={brand.id}
                    href={`/znacky/${brand.slug}`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                      idx === activeIndex ? "bg-wash" : "hover:bg-wash"
                    }`}
                  >
                    <div className="w-[44px] h-[44px] rounded-[6px] bg-wash shrink-0 flex items-center justify-center">
                      <span className="text-[16px] font-extrabold text-navy">{brand.name[0]}</span>
                    </div>
                    <span className="text-[13px] font-bold text-ink">
                      <Highlight text={brand.name} query={query.trim()} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Categories */}
          {results.categories.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted border-t border-wash">
                Kategorie
              </div>
              {results.categories.map((cat) => {
                const idx = flatIndex++;
                return (
                  <Link
                    key={cat.id}
                    href={`/kategorie/${cat.slug}`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                      idx === activeIndex ? "bg-wash" : "hover:bg-wash"
                    }`}
                  >
                    <div className="w-[44px] h-[44px] rounded-[6px] bg-wash shrink-0 flex items-center justify-center">
                      <svg className="text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>
                    <span className="text-[13px] font-bold text-ink">
                      <Highlight text={cat.name} query={query.trim()} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Show all results link */}
          <Link
            href={`/hledat?q=${encodeURIComponent(query.trim())}`}
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-bold text-blue border-t border-line hover:bg-wash transition-colors"
          >
            Zobrazit vše
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      {/* No results */}
      {isOpen && results && totalResults === 0 && query.trim().length >= 2 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-[var(--radius-card)] shadow-lg z-[60] overflow-hidden">
          <div className="px-4 pt-5 pb-3 text-center">
            <svg className="mx-auto mb-2 text-line" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            <p className="text-[13px] font-bold text-ink mb-1">
              Nic jsme nenašli pro &bdquo;{query.trim()}&ldquo;
            </p>
            <p className="text-[12px] text-muted">Zkus jiný výraz nebo zkontroluj pravopis.</p>
          </div>
          <div className="border-t border-wash px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-2">Oblíbené kategorie</p>
            <div className="flex flex-wrap gap-1.5">
              {popularSuggestions.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center h-[28px] px-3 bg-wash text-[12px] font-bold text-ink rounded-full hover:bg-line transition-colors"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent searches — shown when input is focused and empty */}
      {showRecent && !isOpen && recentSearches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-[var(--radius-card)] shadow-lg z-[60] overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
              Poslední hledání
            </span>
            <button
              type="button"
              onClick={() => {
                clearRecentSearches();
                setRecentSearches([]);
                setShowRecent(false);
              }}
              className="text-[11px] font-medium text-muted hover:text-ink transition-colors"
            >
              Smazat
            </button>
          </div>
          {recentSearches.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setQuery(term);
                setShowRecent(false);
                fetchResults(term);
              }}
              className="flex items-center gap-3 w-full text-left px-4 py-2.5 hover:bg-wash transition-colors"
            >
              <svg className="text-muted shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-[13px] font-medium text-ink">{term}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

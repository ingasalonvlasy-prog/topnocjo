"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

interface SearchResult {
  products: { id: string; name: string; slug: string; brand: string; photo: string | null; price: number; comparePrice: number | null }[];
  brands: { id: string; name: string; slug: string }[];
  categories: { id: string; name: string; slug: string }[];
}

function formatPrice(amount: number): string {
  const formatted = new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted}\u00A0Kč`;
}

export function SearchInput({ placeholder = "Hledat produkty..." }: { placeholder?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
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

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(val.trim()), 300);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      setIsOpen(false);
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
      setIsOpen(false);
      if (item.type === "product") router.push(`/produkt/${item.slug}`);
      else if (item.type === "brand") router.push(`/znacky/${item.slug}`);
      else router.push(`/kategorie/${item.slug}`);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
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

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results && totalResults > 0) setIsOpen(true); }}
          placeholder={placeholder}
          className="w-full py-2.5 pl-10 pr-4 text-[14px] font-medium border border-line rounded-[var(--radius-field)] bg-wash focus:bg-white focus:border-navy focus:shadow-[0_0_0_3px_rgba(11,23,39,0.06)] outline-none transition-all"
          autoComplete="off"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-line border-t-navy rounded-full animate-spin" />
          </div>
        )}
      </form>

      {/* Dropdown */}
      {isOpen && results && totalResults > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-[var(--radius-card)] shadow-lg z-[60] overflow-hidden max-h-[420px] overflow-y-auto">
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
                          className="w-full h-full object-contain p-0.5"
                          style={{ mixBlendMode: "multiply" }}
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
                      <div className="text-[13px] font-bold text-ink truncate">{product.name}</div>
                      <div className="text-[11px] text-muted font-medium">{product.brand}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[13px] font-extrabold text-navy">{formatPrice(product.price)}</div>
                      {product.comparePrice && product.comparePrice > product.price && (
                        <div className="text-[11px] text-muted line-through">{formatPrice(product.comparePrice)}</div>
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
                    <span className="text-[13px] font-bold text-ink">{brand.name}</span>
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
                    <span className="text-[13px] font-bold text-ink">{cat.name}</span>
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
          <div className="px-4 py-6 text-center">
            <p className="text-[13px] font-bold text-ink mb-1">Nic jsme nenašli</p>
            <p className="text-[12px] text-muted">Zkus jiný výraz nebo zkontroluj pravopis.</p>
          </div>
        </div>
      )}
    </div>
  );
}

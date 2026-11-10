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

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  return (
    <div ref={containerRef} className="relative max-w-[640px] mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <svg
          className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40"
          width="22"
          height="22"
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
          onFocus={() => {
            if (results && totalResults > 0) setIsOpen(true);
          }}
          placeholder="Hledej značku, produkt nebo kategorii..."
          className="w-full h-14 lg:h-16 pl-14 pr-5 text-[16px] lg:text-[18px] font-medium rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-lime focus:bg-white/15 focus:shadow-[0_0_0_4px_rgba(206,255,47,0.15)] transition-all"
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-white/20 border-t-lime rounded-full animate-spin" />
          </div>
        )}
      </form>

      {/* Dropdown results */}
      {isOpen && results && totalResults > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-line rounded-[12px] shadow-2xl z-[60] overflow-hidden max-h-[400px] overflow-y-auto text-left">
          {results.products.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                Produkty
              </div>
              {results.products.slice(0, 5).map((product) => (
                <Link
                  key={product.id}
                  href={`/produkt/${product.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-wash transition-colors"
                >
                  <div className="w-[44px] h-[44px] rounded-[6px] bg-wash shrink-0 overflow-hidden flex items-center justify-center">
                    {product.photo ? (
                      <Image src={product.photo} alt={product.name} width={44} height={44} className="w-full h-full object-contain p-0.5" style={{ mixBlendMode: "multiply" }} />
                    ) : (
                      <svg className="text-line" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-ink truncate">{product.name}</div>
                    <div className="text-[11px] text-muted font-medium">{product.brand}</div>
                  </div>
                  <div className="text-[13px] font-extrabold text-navy shrink-0">{formatPrice(product.price)}</div>
                </Link>
              ))}
            </div>
          )}
          {results.brands.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted border-t border-wash">Značky</div>
              {results.brands.map((brand) => (
                <Link key={brand.id} href={`/znacky/${brand.slug}`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-wash transition-colors">
                  <div className="w-[44px] h-[44px] rounded-[6px] bg-wash shrink-0 flex items-center justify-center">
                    <span className="text-[16px] font-extrabold text-navy">{brand.name[0]}</span>
                  </div>
                  <span className="text-[13px] font-bold text-ink">{brand.name}</span>
                </Link>
              ))}
            </div>
          )}
          {results.categories.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted border-t border-wash">Kategorie</div>
              {results.categories.map((cat) => (
                <Link key={cat.id} href={`/kategorie/${cat.slug}`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-wash transition-colors">
                  <span className="text-[13px] font-bold text-ink">{cat.name}</span>
                </Link>
              ))}
            </div>
          )}
          <Link
            href={`/hledat?q=${encodeURIComponent(query.trim())}`}
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-bold text-blue border-t border-line hover:bg-wash transition-colors"
          >
            Zobrazit vše →
          </Link>
        </div>
      )}

      {/* No results */}
      {isOpen && results && totalResults === 0 && query.trim().length >= 2 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-line rounded-[12px] shadow-2xl z-[60] overflow-hidden text-left">
          <div className="px-4 py-5 text-center">
            <p className="text-[13px] font-bold text-ink mb-1">Nic jsme nenašli pro &bdquo;{query.trim()}&ldquo;</p>
            <p className="text-[12px] text-muted">Zkus jiný výraz nebo zkontroluj pravopis.</p>
          </div>
        </div>
      )}
    </div>
  );
}

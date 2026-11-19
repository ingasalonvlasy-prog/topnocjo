"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const sortOptions = [
  { value: "", label: "Nejnovější" },
  { value: "price_asc", label: "Nejlevnější" },
  { value: "price_desc", label: "Nejdražší" },
  { value: "name", label: "Název A–Z" },
];

export function SortDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("razeni") || "";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  function handleSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("razeni", value);
    else params.delete("razeni");
    params.delete("strana");
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  const currentLabel = sortOptions.find(o => o.value === current)?.label || "Nejnovější";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-[44px] flex items-center px-2 text-[13px] text-muted hover:text-ink transition-colors cursor-pointer"
      >
        Řadit: <span className="font-bold text-ink">{currentLabel}</span>
        <span className="ml-1">&#9660;</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-line rounded-[8px] shadow-lg py-1 z-20 min-w-[160px]">
          {sortOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleSort(opt.value)}
              className={`w-full text-left px-4 py-3 text-[13px] hover:bg-wash transition-colors ${
                current === opt.value ? "font-bold text-navy" : "text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

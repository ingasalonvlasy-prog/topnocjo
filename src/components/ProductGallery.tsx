"use client";

import { useState } from "react";
import Image from "next/image";

interface ProductGalleryProps {
  photos: string[];
  productName: string;
  pastelBg: string;
  discount: number | null;
  badge?: string | null;
}

export function ProductGallery({ photos, productName, pastelBg, discount, badge }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const mainPhoto = photos[activeIndex] || "";
  const hasPhotos = photos.length > 0;

  return (
    <div>
      {/* Main image */}
      <div className={`${pastelBg} rounded-[10px] aspect-[4/5] relative overflow-hidden mb-3`}>
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
          {badge && (
            <span className="bg-lime text-navy text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[var(--radius-pill)]">
              {badge}
            </span>
          )}
          {discount && (
            <span className="bg-sale text-white text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[var(--radius-pill)]">
              −{discount}&nbsp;%
            </span>
          )}
        </div>
        {hasPhotos ? (
          <Image
            key={activeIndex}
            src={mainPhoto}
            alt={productName}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-10 mix-blend-multiply"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted/40">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-[14px] font-bold mt-3">Foto není k dispozici</span>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {hasPhotos && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {photos.slice(0, 5).map((photo, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`w-[80px] h-[80px] rounded-[8px] overflow-hidden border-2 transition-all cursor-pointer ${
                i === activeIndex ? "border-navy" : "border-line hover:border-muted"
              }`}
            >
              <Image
                src={photo}
                alt={`${productName} – ${i + 1}`}
                width={80}
                height={80}
                className="w-full h-full object-contain p-1 mix-blend-multiply bg-wash"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

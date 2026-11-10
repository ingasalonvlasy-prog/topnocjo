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
  const mainPhoto = photos[activeIndex] || "https://placehold.co/800x1000/f3f5f6/667085?text=Qsport";

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
        <Image
          key={activeIndex}
          src={mainPhoto}
          alt={productName}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain p-10"
          style={{ mixBlendMode: "multiply" }}
          priority
        />
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2">
        {photos.length > 0 ? (
          photos.slice(0, 5).map((photo, i) => (
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
                className="w-full h-full object-contain p-1"
                style={{ mixBlendMode: "multiply", backgroundColor: "var(--wash)" }}
              />
            </button>
          ))
        ) : (
          <div className="w-[80px] h-[80px] rounded-[8px] bg-wash border-2 border-navy" />
        )}
      </div>
    </div>
  );
}

# P1: Hero rotace mezi znackami — Implementation Plan

**Task ID:** #3
**Status:** Ready for implementation
**File:** `src/app/(public)/page.tsx` (server), NEW `src/components/HeroSlider.tsx` (client)

---

## Problem

Current hero is static — always shows the first bestseller product with generic text "Venku je tvoje hriste." The mockup shows a brand-specific hero (e.g. "On do kazdeho pocasi.") and the user explicitly wants rotation between brands.

## Design from Mockup (web-home.png)

- Navy background full-width
- Left side: lime label "NOVA SEZONA · ON WATERPROOF", big headline with lime underline on key words, subtitle text, two CTA buttons (lime "NAKUPOVAT" + outline "VSECHNY ON")
- Right side: product image on pastel bg with BESTSELLER badge + lime price circle
- Auto-rotates between brand-specific slides

## Architecture Decision

Since this is a Server Component page (RSC), the rotation logic must be in a **client component** (`"use client"`). The server page fetches data, the client component handles the slider/animation.

### Approach: Extract `<HeroSlider>` client component

1. Server (`page.tsx`) fetches hero slides data from DB
2. Client (`HeroSlider.tsx`) receives slides as props, handles auto-rotation + manual navigation

## Data Model for Slides

No new DB tables needed. Build slides from existing data:

```typescript
interface HeroSlide {
  // Label above headline
  label: string;           // e.g. "NOVA SEZONA · ON WATERPROOF"
  // Headline (supports line breaks and lime-underlined word)
  headlineLine1: string;   // e.g. "On do"
  headlineLine2: string;   // e.g. "kazdeho pocasi."  (last word gets lime underline)
  // Subtitle
  subtitle: string;        // e.g. "Nepromokave boty na trail i do mesta. Dest? Blato? Pohoda."
  // CTA buttons
  ctaPrimary: { label: string; href: string };   // lime pill
  ctaSecondary: { label: string; href: string };  // outline pill
  // Product card on right
  product: {
    name: string;
    photo: string;
    price: number;
    badge: string;      // "BESTSELLER" / "NOVINKA"
    pastelBg: string;   // "bg-mint" / "bg-sky" / "bg-peach"
  } | null;
}
```

### Generating Slides from DB

For now, hardcode slide configurations per brand (since we don't have a CMS). Later this can be DB-driven.

```typescript
// In page.tsx server code
const heroSlides: HeroSlide[] = [];

// Slide 1: On (boty)
const onProduct = await findFeaturedProduct("on");
if (onProduct) {
  heroSlides.push({
    label: "NOVA SEZONA · ON WATERPROOF",
    headlineLine1: "On do",
    headlineLine2: "kazdeho pocasi.",
    subtitle: "Nepromokave boty na trail i do mesta. Dest? Blato? Pohoda.",
    ctaPrimary: { label: "Nakupovat", href: "/znacky/on" },
    ctaSecondary: { label: "Vsechny On", href: "/znacky/on" },
    product: { ... }
  });
}

// Slide 2: POC (helmy/zima)
// Slide 3: Mizuno (beh)
// Slide 4: Generic "Venku je tvoje hriste."
```

**Better approach:** Define slide configs as a static array, then for each try to find a matching product from the DB. If no product matches, skip that slide or use generic.

## Implementation Steps

### Step 1: Create `src/components/HeroSlider.tsx` (client component)

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/products";

export interface HeroSlide {
  label: string;
  headlineLine1: string;
  headlineLine2: string;
  subtitle: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
  product: {
    name: string;
    photo: string;
    price: number;
    badge: string;
    pastelBg: string;
  } | null;
}

interface HeroSliderProps {
  slides: HeroSlide[];
  interval?: number; // ms, default 6000
}
```

**Key features:**
- Auto-advances every 6 seconds
- Pauses on hover
- Dot indicators at bottom (small circles, active = lime, inactive = white/30)
- Fade/slide transition between slides (CSS transition, opacity + transform)
- On mobile: product card visible below text, full-width CTA at bottom

**Transition approach:**
- Use CSS `transition-opacity duration-500` with absolute positioning
- Active slide: `opacity-100`, others: `opacity-0 pointer-events-none`
- Simple and performant, no external library needed

**Layout per slide:**
```
Desktop: flex-row
  Left (max-w-520):
    - label (lime, 11px uppercase)
    - headline (52px extrabold, line breaks, lime underline on last word of line2)
    - subtitle (15px, white/50)
    - CTA buttons row
  Right (w-380):
    - Product card on pastel bg (4:5 aspect)
    - Badge top-left
    - Price circle bottom-right

Mobile: flex-col
  - label + headline + subtitle
  - Product card (max-w-300, centered)
  - Full-width lime CTA button
```

**Dot navigation:**
```
Bottom-center of hero section
<div className="flex gap-2 justify-center mt-6 lg:mt-0 lg:absolute lg:bottom-6 lg:left-1/2 lg:-translate-x-1/2">
  {slides.map((_, i) => (
    <button
      key={i}
      onClick={() => goToSlide(i)}
      className={`w-2 h-2 rounded-full transition-colors ${
        i === current ? "bg-lime" : "bg-white/30"
      }`}
    />
  ))}
</div>
```

### Step 2: Define slide configurations in `page.tsx`

```typescript
// Static slide configs — brand-specific hero content
const HERO_CONFIGS = [
  {
    brandSlug: "on",
    label: "NOVA SEZONA · ON WATERPROOF",
    headlineLine1: "On do",
    headlineLine2: "kazdeho pocasi.",
    subtitle: "Nepromokave boty na trail i do mesta. Dest? Blato? Pohoda.",
    ctaPrimaryLabel: "Nakupovat",
    ctaSecondaryLabel: "Vsechny On",
    ctaHref: "/znacky/on",
    badge: "BESTSELLER",
    pastelBg: "bg-mint",
  },
  {
    brandSlug: "poc",
    label: "POC · BEZPECNOST NA PRVNIM MISTE",
    headlineLine1: "Teplo",
    headlineLine2: "i v minusech.",
    subtitle: "Helmy, bryle a ochrana od POC. Svedska presnost pro kazdy terren.",
    ctaPrimaryLabel: "Nakupovat",
    ctaSecondaryLabel: "Vsechny POC",
    ctaHref: "/znacky/poc",
    badge: "NOVINKA",
    pastelBg: "bg-sky",
  },
  {
    brandSlug: "mizuno",
    label: "MIZUNO · BEZECKA LEGENDA",
    headlineLine1: "Kazdy kilometr",
    headlineLine2: "se pocita.",
    subtitle: "Japonska technologie pro bezce. Wave Rider, Wave Sky a dalsi.",
    ctaPrimaryLabel: "Nakupovat",
    ctaSecondaryLabel: "Vsechny Mizuno",
    ctaHref: "/znacky/mizuno",
    badge: "BESTSELLER",
    pastelBg: "bg-mint",
  },
];
```

### Step 3: Fetch featured products per brand

```typescript
// In HomePage server function:
const heroSlides: HeroSlide[] = [];

for (const config of HERO_CONFIGS) {
  const product = await prisma.product.findFirst({
    where: {
      status: "ACTIVE",
      brand: { slug: config.brandSlug },
      photos: { not: "[]" },
    },
    include: {
      variants: { where: { active: true }, orderBy: { position: "asc" } },
      brand: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const photos: string[] = product ? JSON.parse(product.photos || "[]") : [];
  
  heroSlides.push({
    label: config.label,
    headlineLine1: config.headlineLine1,
    headlineLine2: config.headlineLine2,
    subtitle: config.subtitle,
    ctaPrimary: { label: config.ctaPrimaryLabel, href: config.ctaHref },
    ctaSecondary: { label: config.ctaSecondaryLabel, href: config.ctaHref },
    product: product && photos[0] ? {
      name: product.name,
      photo: photos[0],
      price: getMinPrice(product.variants),
      badge: config.badge,
      pastelBg: config.pastelBg,
    } : null,
  });
}

// Fallback: if no brand-specific products found, add generic slide
if (heroSlides.length === 0) {
  heroSlides.push({
    label: "QSPORT.CZ",
    headlineLine1: "Venku je tvoje",
    headlineLine2: "hriste.",
    subtitle: "Sportovni vybava, co drzi tempo. On, Mizuno, POC, Husky, Leki a dalsi.",
    ctaPrimary: { label: "Nakupovat", href: "/hledat" },
    ctaSecondary: { label: "Znacky", href: "/znacky" },
    product: null,
  });
}
```

### Step 4: Replace static hero in `page.tsx`

Replace the entire `<section className="bg-navy...">` hero block (lines 70-136) with:

```tsx
<HeroSlider slides={heroSlides} interval={6000} />
```

### Step 5: Import and verify

```typescript
import { HeroSlider } from "@/components/HeroSlider";
```

## Lime Underline Logic

The mockup shows the lime underline on the last phrase of the headline. In the component:

```tsx
// Split headlineLine2 to underline the last word(s)
// If headlineLine2 = "kazdeho pocasi.", underline entire line2
// Simpler: always underline the entire headlineLine2

<h1 className="text-[36px] lg:text-[52px] font-extrabold leading-[1.05] mb-5 tracking-[-0.04em]">
  {slide.headlineLine1}<br />
  <span className="relative inline-block">
    {slide.headlineLine2}
    <span className="absolute bottom-0 left-0 w-full h-[6px] bg-lime" style={{ bottom: "4px" }} />
  </span>
</h1>
```

## Mobile Layout

On mobile (mockup web-mobil.png):
- Label + headline (full-width, lime underline spans full phrase)
- Product card visible (not hidden!) — centered, rounded
- Full-width lime "NAKUPOVAT" CTA button below

```tsx
{/* Mobile layout */}
<div className="lg:hidden">
  {/* Product card */}
  {slide.product && (
    <div className="mx-auto max-w-[300px] mt-4 mb-4">
      <div className={`${slide.product.pastelBg} rounded-[10px] aspect-[4/5] relative overflow-hidden`}>
        <span className="absolute top-3 left-3 bg-lime text-navy text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[var(--radius-pill)] z-10">
          {slide.product.badge}
        </span>
        <Image src={slide.product.photo} alt={slide.product.name} fill className="object-contain p-6" style={{ mixBlendMode: "multiply" }} />
      </div>
    </div>
  )}
  {/* Full-width CTA */}
  <div className="px-6 pb-6">
    <Link href={slide.ctaPrimary.href} className="flex items-center justify-center h-12 bg-lime text-navy text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[10px]">
      {slide.ctaPrimary.label}
    </Link>
  </div>
</div>
```

## Transition Animation

Simple opacity crossfade:

```tsx
{slides.map((slide, i) => (
  <div
    key={i}
    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
      i === current ? "opacity-100 z-10" : "opacity-0 z-0"
    }`}
  >
    {/* slide content */}
  </div>
))}
```

The wrapper needs `relative` + explicit height to contain absolute slides.

**Height approach:** Set min-height based on content, or use a grid with `grid-area: 1/1` for all slides (overlay without absolute):

```tsx
<div className="grid">
  {slides.map((slide, i) => (
    <div
      key={i}
      className={`col-start-1 row-start-1 transition-opacity duration-700 ${
        i === current ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
```

**Grid overlay is cleaner** — the tallest slide sets the height naturally.

## Auto-advance with Pause on Hover

```tsx
const [current, setCurrent] = useState(0);
const [paused, setPaused] = useState(false);

const next = useCallback(() => {
  setCurrent((c) => (c + 1) % slides.length);
}, [slides.length]);

useEffect(() => {
  if (paused || slides.length <= 1) return;
  const timer = setInterval(next, interval);
  return () => clearInterval(timer);
}, [paused, next, interval, slides.length]);
```

## Testing Checklist

- [ ] Hero auto-rotates every 6 seconds
- [ ] Each slide shows correct brand label, headline, subtitle, CTAs
- [ ] Product image on pastel bg with correct badge and price circle
- [ ] Dot indicators update correctly, clicking a dot goes to that slide
- [ ] Pauses on hover (desktop)
- [ ] Mobile: product card visible, full-width CTA
- [ ] Smooth opacity transition between slides
- [ ] Falls back to generic slide if no brand products in DB
- [ ] No hydration errors (client component, data from server)
- [ ] Build passes: `npm run build`

## Estimated Effort

~45-60 minutes

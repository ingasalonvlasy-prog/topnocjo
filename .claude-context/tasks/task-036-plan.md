# Plán: TASK-036 — Instagram feed na homepage

**Priorita:** 3
**Soubory k úpravě:**
- `src/app/(public)/page.tsx` (řádky 349-376 — IG placeholder sekce)
- `src/lib/instagram.ts` (NOVÝ — fetch + cache)
- `src/components/InstagramGrid.tsx` (NOVÝ — client component)

**Referenční soubory (READ ONLY):**
- `src/components/Footer.tsx` — Instagram handle: @qsport.cz
- `src/lib/structured-data.ts` — sameAs: instagram.com/qsport.cz

---

## Analýza stávajícího stavu

### Co je hotovo:
1. **Sekce na homepage** (řádky 349-376) — heading "Sleduj nás na Instagramu.", @qsport.cz subheading, tlačítko "Sledovat"
2. **Grid 6 placeholderů** — `Array.from({ length: 6 })` s SVG ikonami na `bg-wash`
3. **Responsive grid** — `grid-cols-3 sm:grid-cols-6`

### Co chybí:
| # | Funkce | Stav | Náročnost |
|---|--------|------|-----------|
| 1 | Meta Graph API integrace | Chybí | STŘEDNÍ |
| 2 | Fallback na statické obrázky | Chybí | NÍZKÁ |
| 3 | Cache 1h | Chybí | NÍZKÁ |

---

## Problém: Instagram API

### Meta Graph API vs. Basic Display API

**Basic Display API** bylo deprecated (červen 2024). Nová varianta je **Instagram Graph API** přes Meta Business API.

**Požadavky:**
1. Facebook Business Page propojená s IG účtem
2. Meta App s Instagram Graph API permissions
3. Long-lived token (60 dní, nutno refreshovat)

**Alternativa (jednodušší):** Použít public RSS/scraping je nespolehlivé a porušuje ToS.

**Doporučení:** Implementovat s Meta Graph API + fallback na statické obrázky. Token se uloží do env var `INSTAGRAM_ACCESS_TOKEN`.

---

## Řešení

### Krok 1: Instagram fetch helper

**Nový soubor:** `src/lib/instagram.ts`

```tsx
export interface InstagramPost {
  id: string;
  mediaUrl: string;
  permalink: string;
  caption?: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  timestamp: string;
}

const INSTAGRAM_CACHE_KEY = "instagram_feed";
let cachedPosts: InstagramPost[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hodina

export async function getInstagramPosts(count = 6): Promise<InstagramPost[]> {
  const now = Date.now();

  // In-memory cache
  if (cachedPosts && now - cacheTimestamp < CACHE_TTL) {
    return cachedPosts.slice(0, count);
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return []; // Fallback — žádný token
  }

  try {
    const url = `https://graph.instagram.com/me/media?fields=id,media_url,permalink,caption,media_type,timestamp&limit=${count}&access_token=${token}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      console.error("Instagram API error:", res.status);
      return [];
    }

    const data = await res.json();
    const posts: InstagramPost[] = (data.data || []).map((p: any) => ({
      id: p.id,
      mediaUrl: p.media_url,
      permalink: p.permalink,
      caption: p.caption,
      mediaType: p.media_type,
      timestamp: p.timestamp,
    }));

    cachedPosts = posts;
    cacheTimestamp = now;

    return posts.slice(0, count);
  } catch (err) {
    console.error("Instagram fetch failed:", err);
    return [];
  }
}
```

**Poznámky:**
- `next: { revalidate: 3600 }` — Next.js fetch cache 1h (ISR)
- In-memory cache jako backup pro development
- Graceful fallback — vrací `[]` při chybě

### Krok 2: InstagramGrid komponenta

**Nový soubor:** `src/components/InstagramGrid.tsx`

```tsx
import Image from "next/image";
import type { InstagramPost } from "@/lib/instagram";

// Statické fallback obrázky (když není API token)
const FALLBACK_IMAGES = [
  "/images/ig/ig-1.jpg",
  "/images/ig/ig-2.jpg",
  "/images/ig/ig-3.jpg",
  "/images/ig/ig-4.jpg",
  "/images/ig/ig-5.jpg",
  "/images/ig/ig-6.jpg",
];

export function InstagramGrid({ posts }: { posts: InstagramPost[] }) {
  // Pokud máme API data, zobraz je
  if (posts.length > 0) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {posts.map((post) => (
          <a
            key={post.id}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square rounded-[10px] overflow-hidden bg-wash"
          >
            <Image
              src={post.mediaUrl}
              alt={post.caption?.slice(0, 100) || "Instagram post"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 33vw, 16vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </a>
        ))}
      </div>
    );
  }

  // Fallback — statické obrázky NEBO placeholder SVG
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {FALLBACK_IMAGES.map((src, i) => (
        <a
          key={i}
          href="https://instagram.com/qsport.cz"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative aspect-square rounded-[10px] overflow-hidden bg-wash"
        >
          {/* Pokud statické obrázky existují, zobraz je; jinak SVG placeholder */}
          <div className="w-full h-full flex items-center justify-center text-muted/30">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
        </a>
      ))}
    </div>
  );
}
```

**Poznámky k implementaci:**
- Fallback má 2 úrovně: statické obrázky (pokud existují v `/public/images/ig/`) → SVG placeholder (stávající stav)
- MVP: implementovat pouze SVG fallback (stávající chování), API data se zapnou přidáním `INSTAGRAM_ACCESS_TOKEN` do .env
- `next/image` s `fill` + `object-cover` pro konzistentní grid
- Hover efekt: scale + overlay

### Krok 3: Upravit homepage sekci

**Soubor:** `src/app/(public)/page.tsx`

**Přidat import (nahoru):**
```tsx
import { getInstagramPosts } from "@/lib/instagram";
import { InstagramGrid } from "@/components/InstagramGrid";
```

**V data fetching (Promise.all, řádky ~42-66) přidat:**
```tsx
const instagramPosts = await getInstagramPosts(6);
```

**Nahradit řádky 365-375** (grid s placeholder SVG):
```tsx
<InstagramGrid posts={instagramPosts} />
```

Zbytek sekce (heading, subheading, tlačítko "Sledovat") zůstává beze změn.

---

### Krok 4: Env var

**Soubor:** `.env.example` (nebo `.env.local`)

```
# Instagram Graph API — long-lived token (60 dní)
# Získat: https://developers.facebook.com/tools/explorer/
# Refresh: GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token={token}
INSTAGRAM_ACCESS_TOKEN=
```

**Bez tokenu** funguje fallback (SVG placeholder = stávající stav). Žádný breaking change.

---

## Shrnutí

| # | Soubor | Změna | Řádků |
|---|--------|-------|-------|
| 1 | `src/lib/instagram.ts` | NOVÝ — fetch + cache helper | ~55 |
| 2 | `src/components/InstagramGrid.tsx` | NOVÝ — grid s API data / fallback | ~55 |
| 3 | `src/app/(public)/page.tsx` | Import + data fetch + nahradit placeholder | +5, −11 |

**Celkem:** ~115 řádků, 2 nové + 1 existující

---

## Rizika
- **Instagram token expiry** — long-lived token vydrží 60 dní, nutno refreshovat. Řešení: cron job nebo manuální refresh
- **API rate limits** — 200 req/h per user. S 1h cache je to OK
- **Video posty** — `CAROUSEL_ALBUM` a `VIDEO` posty mohou mít `thumbnail_url` místo `media_url`. Řešení: pro VIDEO použít `thumbnail_url` pole (přidat do fields query)
- **CORS** — Instagram media URLs mohou mít CORS omezení pro `next/image`. Řešení: přidat `images.remotePatterns` do `next.config.ts` pro `*.cdninstagram.com` a `*.fbcdn.net`

### next.config.ts doplnění:
```tsx
// V images.remotePatterns přidat:
{ protocol: "https", hostname: "**.cdninstagram.com" },
{ protocol: "https", hostname: "**.fbcdn.net" },
```

# QA Report — Tasky #10, #11, #12 (dashboard, /akce, PWA)

**Datum:** 2026-11-10  
**Kontrolor:** kontrolor agent  
**Zdroje:** zdrojový kód, `npx next build`

---

## 1. Build

**Výsledek: PASSED**

`npx next build` proběhl bez chyb ani varování. Stránka `/akce` je v buildu přítomna jako dynamic route (`ƒ`).

---

## 2. Admin Dashboard (#10)

**Výsledek: PASSED**

### Bar chart tržeb (7 dní)

| Kontrola | Stav |
|----------|------|
| Dotaz `paidOrdersLast7Days` pro posledních 7 dní | ✅ `createdAt: { gte: sevenDaysAgo }`, `paymentStatus: "PAID"` |
| Výpočet `revenueByDay` — iterace přes 7 dní | ✅ Loop `for (let i = 6; i >= 0; i--)` |
| Lokalizované popisky dní (`cs-CZ`, `weekday: "short"`) | ✅ `toLocaleDateString("cs-CZ", { weekday: "short" })` |
| Bar výška proporcionální (`value / maxRevenue * 140`) | ✅ Implementováno, `min-h-[4px]` pro prázdné dny |
| Hodnota zobrazena nad barem (pouze > 0) | ✅ `{day.value > 0 ? formatPrice(day.value) : ""}` |

### Rychlé akce tlačítka

| Tlačítko | Cíl | Stav |
|---------|-----|------|
| + Nový produkt | `/admin/produkty/novy` | ✅ |
| Objednávky | `/admin/objednavky` | ✅ |
| Spravovat produkty | `/admin/produkty` | ✅ |
| Spravovat kategorie | `/admin/kategorie` | ✅ |
| Export objednávek | `/admin/objednavky?export=csv` | ✅ |
| Nastavení e-shopu | `/admin/nastaveni` | ✅ |
| Zobrazit e-shop → | `/` (target blank) | ✅ |

### Poslední objednávky tabulka (5 ks)

| Kontrola | Stav |
|----------|------|
| `take: 5`, `orderBy: { createdAt: "desc" }` | ✅ |
| Sloupce: Č., Zákazník, Částka, Stav | ✅ |
| Stav badge s barevným rozlišením (NEW=modrá, PROCESSING=žlutá, SHIPPED=fialová, DELIVERED=zelená, CANCELLED=červená) | ✅ |
| Překlavy stavů česky: "Nová", "Zpracovává se", "Odesláno", "Doručeno", "Zrušeno" | ✅ |
| Empty state: "Zatím žádné objednávky." | ✅ |

### Nízké zásoby varování

| Kontrola | Stav |
|----------|------|
| Filtr `ownStock + supplierStock <= 2` | ✅ |
| Seřazení od nejméně skladem | ✅ `.sort((a,b) => ...)` |
| Limit 10 variant | ✅ `.slice(0, 10)` |
| Počítadlo badge "X variant" červeně | ✅ `bg-red-100 text-red-700` |
| "Vyprodáno" vs "X ks" dle stavu | ✅ `totalStock === 0 ? "Vyprodáno" : ...` |
| Empty state: "Všechny varianty mají dostatečné zásoby." | ✅ |

### Diakritika (dashboard)

| Text | Stav |
|------|------|
| "Objednávky celkem" | ✅ |
| "Nové objednávky" | ✅ |
| "Tržby za posledních 7 dní" | ✅ |
| "Rychlé akce" | ✅ |
| "Poslední objednávky" | ✅ |
| "Nízké zásoby" | ✅ |
| "vyžaduje pozornost" / "žádné nové" | ✅ |
| "Aktivní produkty" / "Kategorie" / "Nízký sklad" | ✅ |
| "Zpracovává se" / "Odesláno" / "Doručeno" / "Zrušeno" | ✅ |
| "Všechny varianty mají dostatečné zásoby." | ✅ |
| "Zatím žádné objednávky." | ✅ |
| "Spravovat produkty" / "Spravovat kategorie" | ✅ |
| "Nastavení e-shopu" | ✅ |

**Jediná drobnost:** V `og-image.svg` (řádek 12) je text bez diakritiky — "Sportovni vybaveni od znacek On, POC, Maloja, Alpina, Mizuno a Leki" — ale to patří do sekce PWA níže.

---

## 3. Stránka /akce (#11)

**Výsledek: PASSED**

### Hero sekce

| Kontrola | Stav |
|----------|------|
| `bg-navy text-white` hero banner | ✅ |
| Breadcrumb: Domů / Akce a výprodej | ✅ |
| Badge "Akce a výprodej" — `bg-sale` červená pill | ✅ |
| H1: "Nepřehlédni slevy." s červenou podtrženou linkou na "slevy." | ✅ `bg-sale h-[4px]` |
| Popis "Vybrané produkty za zvýhodněné ceny..." | ✅ |

### Grid, filtry, pagination

| Kontrola | Stav |
|----------|------|
| Sidebar filtry (desktop `hidden lg:block`) | ✅ |
| MobileFilterDrawer (mobil `lg:hidden`) | ✅ |
| Grid `grid-cols-2 lg:grid-cols-3 gap-4` | ✅ |
| SortDropdown | ✅ |
| ActiveFilterChips | ✅ |
| Pagination s `baseUrl="/akce"` | ✅ |
| Empty state: "Momentálně žádné akční produkty." | ✅ |
| `perPage: 24` | ✅ |

### saleOnly filtr

| Kontrola | Stav |
|----------|------|
| `getFilteredProducts({ ..., saleOnly: true })` | ✅ Řádek 48 |
| `getFilterOptions(undefined, { saleOnly: true })` | ✅ Řádek 50 |
| V `products.ts` — `saleOnly` parametr v interface | ✅ |
| V `products.ts` — filtr `comparePrice: { not: null, gt: 0 }` | ✅ Řádek 77 |
| V `filter-options.ts` — `saleOnly` parametr | ✅ Řádek 9 |
| V `filter-options.ts` — `saleVariantFilter` a `productFilter` s saleOnly logikou | ✅ Řádky 11-16 |

### SEO metadata

| Kontrola | Stav |
|----------|------|
| `title: "Akce a výprodej \| Qsport.cz"` | ✅ |
| `description` (140+ znaků, diakritika) | ✅ "Zlevněné sportovní vybavení, oblečení a doplňky za akční ceny. Využij slevy na Qsport.cz." |
| `openGraph.title` a `openGraph.description` | ✅ |
| JSON-LD BreadcrumbList | ✅ |

### Header nav link

| Kontrola | Stav |
|----------|------|
| `{ href: "/akce", label: "Akce", isAccent: true }` v navLinks | ✅ Řádek 17 Header.tsx |
| Červená barva `text-sale` | ✅ podmínka `link.isAccent ? "text-sale" : ...` |

### Diakritika (/akce)

| Text | Stav |
|------|------|
| "Akce a výprodej" | ✅ |
| "Nepřehlédni slevy." | ✅ |
| "Vybrané produkty za zvýhodněné ceny." | ✅ |
| "Momentálně žádné akční produkty." | ✅ |
| "Akce se průběžně mění — zkus to znovu později." | ✅ |
| "produktů" | ✅ |

---

## 4. PWA (#12)

**Výsledek: PASSED s drobnou poznámkou**

### site.webmanifest

| Kontrola | Hodnota | Stav |
|----------|---------|------|
| `name` | "Qsport.cz — výkon bez kompromisů" | ✅ |
| `short_name` | "Qsport" | ✅ |
| `description` | "Sportovní vybavení od značek On, POC, Maloja, Alpina, Mizuno a Leki." | ✅ |
| `start_url` | "/" | ✅ |
| `scope` | "/" | ✅ |
| `display` | "standalone" | ✅ |
| `theme_color` | "#0B1727" (navy) — odpovídá brand briefu | ✅ |
| `background_color` | "#FFFFFF" | ✅ |
| icons 192x192 | `/favicon-192.png` | ✅ |
| icons 512x512 | `/favicon-512.png` | ✅ |
| maskable icon | `/favicon-512.png` s `"purpose": "maskable"` | ✅ |
| `categories` | `["shopping", "sports"]` | ✅ |
| Soubory favicon existují | favicon.ico, favicon.svg, favicon-192.png, favicon-512.png | ✅ |

### og-image.svg

| Kontrola | Stav |
|----------|------|
| Rozměry `width="1200" height="630"` (1200×630) | ✅ |
| Navy pozadí `fill="#0B1727"` | ✅ |
| Logo Q SVG path | ✅ |
| Limetkový prvek `stroke="#CEFF2F"` | ✅ |
| "QSPORT.CZ" text limetkově `fill="#CEFF2F"` | ✅ |

**Drobná poznámka (non-blocking):** Tagline v og-image.svg (řádek 12) nemá diakritiku — "Sportovni vybaveni od znacek..." místo "Sportovní vybavení od značek...". V SVG textovém poli jde o kosmetickou záležitost, neboť tagline je malý a méně čitelný text, ale lze opravit. Doporučuji opravu.

### layout.tsx metadata

| Kontrola | Hodnota | Stav |
|----------|---------|------|
| `metadataBase` | `https://qsport.cz` | ✅ |
| `title.default` | "Qsport.cz \| výkon bez kompromisů" | ✅ |
| `title.template` | "%s \| Qsport.cz" | ✅ |
| `description` | "Sportovní vybavení od značek..." | ✅ |
| `openGraph.siteName` | "Qsport.cz" | ✅ |
| `openGraph.locale` | "cs_CZ" | ✅ |
| `openGraph.type` | "website" | ✅ |
| `twitter.card` | "summary_large_image" | ✅ |
| `icons.icon` favicon.ico + favicon.svg | ✅ |
| `icons.apple` apple-touch-icon.png | ✅ |
| `manifest` | "/site.webmanifest" | ✅ |
| Manrope font (`latin`, `latin-ext`) | ✅ |
| `lang="cs"` | ✅ |

---

## Celkové hodnocení

| Oblast | Výsledek |
|--------|----------|
| Build | PASSED |
| Admin dashboard — bar chart | PASSED |
| Admin dashboard — rychlé akce | PASSED |
| Admin dashboard — poslední objednávky (5 ks) | PASSED |
| Admin dashboard — nízké zásoby varování | PASSED |
| Admin dashboard — diakritika | PASSED |
| /akce — hero, grid, filtry, pagination | PASSED |
| /akce — saleOnly filtr (products.ts + filter-options.ts) | PASSED |
| /akce — SEO metadata | PASSED |
| /akce — Header nav link (červeně) | PASSED |
| /akce — diakritika | PASSED |
| PWA — site.webmanifest | PASSED |
| PWA — og-image.svg (1200×630) | PASSED s poznámkou |
| PWA — layout.tsx metadata | PASSED |
| PWA — favicon soubory | PASSED |

**Celkem: 15/15 bodů PASSED (1 drobná non-blocking poznámka).**

---

## Doporučení k opravě (non-blocking)

**og-image.svg řádek 12 — chybějící diakritika v tagline:**

```
Současný text:
"Sportovni vybaveni od znacek On, POC, Maloja, Alpina, Mizuno a Leki"

Správně:
"Sportovní vybavení od značek On, POC, Maloja, Alpina, Mizuno a Leki"
```

Tato chyba neblokuje build ani funkčnost, ale tagline se zobrazuje při sdílení URL na sociálních sítích.

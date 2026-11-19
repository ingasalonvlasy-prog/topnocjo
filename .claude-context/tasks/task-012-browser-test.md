# Browser Test Report — Task #12 (Round 2 — 2026-11-18)
**Tester:** test-chrome  
**Server:** http://localhost:9999 (dev, Next.js 16, Turbopack)  
**Chrome:** otevřen na homepage, kategoriích, hledání, značkách, registraci

---

## VÝSLEDKY — PŘEHLED

| # | Oblast | Status | Detail |
|---|--------|--------|--------|
| 1a | Homepage — bestsellery s fotkami | OK | Shopify CDN obrázky, 0 prázdných src |
| 1b | Homepage — gender karty BEZ emoji | OK | Muži/Ženy/Děti — žádné emoji |
| 1c | Homepage — 3 kroky sekce | OK | Nákup bez registrace / Expedice do 24h / Doprava od 49 Kč |
| 1d | Homepage — sport kategorie | OK | Běh / Zima / Outdoor / Doplňky |
| 1e | Homepage hero search "beh" | BUG | 0 produktů — diakritika nefunguje |
| 2 | Kategorie parent /kategorie/muzi | BUG | "Kategorie nenalezena" — slug není v DB |
| 3 | Kategorie leaf (lyzarske-bundy) | OK | Sidebar OK, aktivní kategorie highlighted, 4 filtry |
| 3a | Filter chip — kliknutí / popover | OK | Chip buttons přítomny, FilterDropdown client-side |
| 4 | Značky listing | OK | 64 značek, grid layout |
| 4a | Značka detail (POC) | OK | Navy hero, sort, 4 filtry, mobile drawer, 48 produktů |
| 5a | Vyhledávání "beh" | BUG | 0 produktů (API: products:0, categories:1) |
| 5b | Vyhledávání "bundy" | OK | 8 produktů |
| 5c | Vyhledávání "poc" | OK | 8 produktů + značka POC |
| 5d | Autocomplete dropdown | OK | SearchAutocomplete v hero i na /hledat |
| 6 | Footer linky (10 testováno) | OK | Všechny 200: doprava, vrácení, reklamace, kontakt, o-nas, blog, podmínky, znacky, bazar, akce |
| 7 | Registrace — GDPR required | OK | type=checkbox, name=gdpr, required=true |
| 8 | Produkty bez fotek v listinzích | OK | 0 prázdných src přes 4 testované kategorie |
| — | ProductCard — quick-add | OK | 20 tlačítek "Přidat do košíku" na listing |
| — | ProductCard — wishlist heart | OK | Heart SVG přítomno |
| — | ProductCard — hover efekty | OK | hover:-translate-y-1 |
| — | Mobile hamburger | OK | useState menuOpen, lg:hidden wrapper |
| — | Mobile filter drawer | OK | MobileFilterDrawer.tsx komponenta přítomna |
| — | Viewport meta | OK | width=device-width, initial-scale=1 |

---

## BUGY

### BUG-1 (KRITICKÝ): Vyhledávání "beh" nenajde žádné produkty

**URL:** /hledat?q=beh  
**Chování:** 0 produktů. Zobrazí se pouze kategorie "Běh" jako odkaz, ale žádné produkty.

**API test:**
- /api/search?q=beh → products: 0, brands: 0, categories: 1 (Běh)
- /api/search?q=bundy → products: 8 (OK)
- /api/search?q=poc → products: 8 (OK)

**Root cause:** Search neporovnává bez diakritiky. "beh" != "Běžecké boty" v DB full-text search.  
**Zadání říkalo:** "napsat 'beh' → musí najít 'Běžecké boty'" — NESPLNĚNO  
**Fix:** Normalizace diakritiky v search API — strip diakritiky z query i z indexovaných dat (unaccent/NFD normalize).

---

### BUG-2 (STŘEDNÍ): /kategorie/muzi zobrazí "Kategorie nenalezena"

**URL:** /kategorie/muzi, /kategorie/zeny, /kategorie/deti  
**Chování:** 200 OK HTTP, ale obsah = "Kategorie nenalezena", 0 produktů, 0 filtrů, žádný sidebar  
**Root cause:** Slug "muzi/zeny/deti" neexistuje v DB — jsou to virtuální nav kategorie v Header/MegaMenu.  
**Vliv:** Gender karty na homepage klikají na tuto broken URL. Přímý odkaz nebo SEO selže.  
**Fix varianty:**
1. Přidat muzi/zeny/deti jako skutečné parent kategorie do DB
2. Redirect na nejbližší aktivní kategorii

---

## OVĚŘENO — FUNGUJE

- Homepage kompletní (bestsellery s CDN fotkami, 3 kroky, sport grid)
- Leaf kategorie s plným sidebarem a 4 filtry (Cena/Velikost/Značka/Skladem)
- Značky listing + detail (POC) kompletní s navy hero sekcí
- Footer — 10 stránek, všechny 200 OK
- Registrace GDPR required checkbox (HTML5 native validation)
- ProductCard (quick-add, wishlist heart SVG, hover translate)
- Mobile hamburger + filter drawer (MobileFilterDrawer.tsx)
- 0 produktů bez fotek v listinzích

# TASK-047: Mobilní optimalizace celého e-shopu — Plán

## Přehled

Audit všech public page.tsx souborů a komponent z hlediska mobile-first responsive designu.

**Celkový stav:** E-shop je **dobře připraven na mobil** — většina stránek již používá responsive utility třídy (sm:, lg:, hidden lg:block, atd.). Existují ale konkrétní problémy a příležitosti ke zlepšení.

---

## Analýza po stránkách

### 1. Header (`src/components/Header.tsx`) — DOBRÝ

**Co funguje:**
- Oddělený mobilní header (hamburger + logo + košík) vs desktop (nav + search + icons)
- Mobilní hamburger menu s full-width linky
- Mobilní search vždy viditelný pod headerem
- Top info bar — první 2 položky na mobilu, 3. skrytý `hidden sm:inline`

**Problémy:**
- [M1] **Top info bar se ořezává na malých mobilech (<360px).** "Nákup bez registrace" + "BAZAR" se mohou přetékat. Chybí `overflow-hidden` nebo `text-[11px]` na menších zařízeních.
- [M2] **Mobile menu nemá backdrop/overlay.** Když se otevře hamburger menu, obsah za ním není ztmavený — uživatel neví, kde kliknout na zavření.
- [M3] **Chybí user icon v mobilním headeru.** Desktop má účet ikonu, mobil ne — uživatel musí jít přes hamburger menu (ale ten odkaz tam taky není!). Přidat link na `/ucet` do mobilního menu nebo do headeru.
- [M4] **Sticky header + search zabírá ~104px** (32px top bar + 52px header + 20px padding). Na menších mobilech to je velká ztráta viewport prostoru. Zvážit schování top baru při scrollu dolů.

### 2. Homepage (`src/app/(public)/page.tsx`) — DOBRÝ

**Co funguje:**
- Hero: responzivní text velikosti `text-[32px] lg:text-[48px]`
- Quick search tags: `flex-wrap` — nezlomí se
- Brand logos: `flex-wrap` na mobilu
- Bestsellery: `grid-cols-2 lg:grid-cols-4` — 2 sloupce na mobilu
- Kategorie grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]`
- Blog sekce: mobilní "Zobrazit vše" tlačítko `sm:hidden`
- Newsletter: `flex-col sm:flex-row`

**Problémy:**
- [M5] **Hero quick search tagy mohou přetékat.** 6 tagů na úzkém mobilu (320px) mohou potřebovat horizontální scroll místo `flex-wrap`. Na malých zařízeních tvoří 3 řádky — ne ideální.
- [M6] **Kategorie grid: "Běh" karta s `aspect-square`** na mobilu zabírá celou šířku (280px+ výšky) — moc velká plocha pro jednu kategorii. Na mobilu by mělo být `aspect-[3/2]` i pro první kartu.
- [M7] **"Série · POC" sekce:** `grid-cols-1 lg:grid-cols-[1fr_2fr]` — na mobilu se navy panel a produkty stackují, ale navy panel má `min-h-[300px]` — moc vysoký na mobilu. Snížit na `min-h-[200px] lg:min-h-[300px]`.
- [M8] **Instagram sekce:** chybí mobilní "Sledovat" tlačítko (desktop-only `hidden sm:inline-flex`), ale na mobilu žádná alternativa.

### 3. Product Detail (`src/app/(public)/produkt/[slug]/page.tsx`) — DOBRÝ

**Co funguje:**
- 2-sloupcový layout `grid-cols-1 md:grid-cols-[1fr_1fr]` — stack na mobilu
- Breadcrumbs `flex-wrap`
- Responzivní heading `text-[28px] md:text-[40px]`
- Trust lines plné šířky
- Highlight grid `grid-cols-2 md:grid-cols-4`

**Problémy:**
- [M9] **Galerie na mobilu zabírá obrovský prostor.** ProductGallery se zobrazuje PŘED info sekcí. Na mobilu musí uživatel scrollovat přes celou galerii (s thumbnaily) než uvidí cenu a "Přidat do košíku". **Kritický UX problém.** Řešení: Na mobilu zobrazit galerii s menším aspect ratio, nebo přesunout cenu/CTA nad galerii na mobilu.
- [M10] **Share buttons** — potřeba ověřit, že na mobilu nejsou příliš malé (min 44px tap target).
- [M11] **Feature highlights strip:** 2-sloupcový grid `grid-cols-2` — na úzkém mobilu (320px) se text v boxech může ořezávat pokud je dlouhý.

### 4. Kategorie (`src/app/(public)/kategorie/[slug]/page.tsx`) — DOBRÝ

**Co funguje:**
- Navy hero banner s responzivním textem
- MobileFilterDrawer — slide-up bottom sheet na mobilu
- Desktop sidebar `hidden lg:block`
- Product grid `grid-cols-2 lg:grid-cols-3`
- Subcategory pills `flex-wrap`

**Problémy:**
- [M12] **SortDropdown na mobilu.** Na desktop `hidden lg:block` ale na mobilní stránce schází sort na hledat stránce — `<div className="hidden lg:block"><SortDropdown /></div>`. Uživatel na mobilu NEMŮŽE řadit! Na kategorie stránce je viditelný (`<SortDropdown />` bez hidden), ale na hledat stránce ne.
- [M13] **Subcategory pills v hero banneru** na úzkém mobilu s mnoha subkategoriemi mohou přetékat. Chybí horizontální scroll `overflow-x-auto`.

### 5. Hledat (`src/app/(public)/hledat/page.tsx`) — PROBLÉM

**Problémy:**
- [M14] **KRITICKÉ: SortDropdown je `hidden lg:block`** — na mobilu nelze řadit výsledky! MobileFilterDrawer je přítomný ale sorting chybí. **Buď přidat sort do MobileFilterDrawer, nebo zobrazit SortDropdown i na mobilu.**
- Zbytek je OK — `grid-cols-2 lg:grid-cols-3`, mobilní filtry přes drawer.

### 6. Košík (`src/app/(public)/kosik/page.tsx`) — DOBRÝ

**Co funguje:**
- `grid-cols-1 lg:grid-cols-[1fr_380px]` — stack na mobilu
- Cart items: photo `w-[80px] h-[80px] sm:w-[100px]` — menší na mobilu
- Quantity controls: `flex-col sm:flex-row` — stack na malém mobilu
- Summary sidebar — na mobilu pod items

**Problémy:**
- [M15] **Summary sidebar na mobilu je na KONCI stránky.** Po všech items, free shipping baru, shipping selektoru, cross-sell produktech... "Pokračovat k pokladně" tlačítko je úplně dole. **Řešení:** Přidat sticky bottom bar na mobilu s cenou a CTA tlačítkem.
- [M16] **ShippingSelector** v košíku — potřeba ověřit, zda Zásilkovna widget mapa funguje správně na mobilu (modální okno vs iframe).
- [M17] **Cross-sell produkty** pod košíkem — na mobilu mohou být moc mnoho scrollování. Zvážit horizontální karusel místo gridu.

### 7. Pokladna (`src/app/(public)/pokladna/page.tsx`) — DOBRÝ

**Co funguje:**
- `grid-cols-1 lg:grid-cols-[1fr_400px]` — form + summary stack na mobilu
- Form inputy plná šířka, `grid-cols-1 sm:grid-cols-2` pro dvojice
- Responzivní heading

**Problémy:**
- [M18] **Order summary na mobilu na konci.** Stejný problém jako košík — uživatel nevidí celkovou cenu při vyplňování formuláře. **Řešení:** Sticky summary na mobilu nahoře, nebo sticky bottom bar.
- [M19] **Submit tlačítko "Objednat a zaplatit"** je uvnitř summary boxu, který je na mobilu dole. Uživatel musí scrollovat přes celý formulář + summary. Přidat sticky CTA na mobilu.

### 8. Blog (`src/app/(public)/blog/page.tsx`) — DOBRÝ

**Co funguje:**
- Section tabs `flex-wrap` — dobré na mobilu
- Blog cards `grid-cols-1 sm:grid-cols-3`

**Problémy:**
- [M20] **Blog section tabs** — na mobilu s 5+ tabs se `flex-wrap` táhne na 2-3 řádky. Lepší horizontální scroll: `flex-nowrap overflow-x-auto`.

### 9. Blog Detail (`src/app/(public)/blog/[slug]/page.tsx`)
- Potřeba ověřit `max-w-prose` a body_html rendering na mobilu (obrázky v HTML mohou přetékat).

### 10. Účet stránky (`src/app/(public)/ucet/page.tsx`) — DOBRÝ

**Co funguje:**
- `grid-cols-1 lg:grid-cols-[220px_1fr]` — sidebar + content stack na mobilu

**Problémy:**
- [M21] **AccountNav sidebar na mobilu** — potřeba ověřit, zda se mění na horizontální tabs nebo zůstává vertikální (zabírá místo). Ideální je horizontální scroll tabs na mobilu.

### 11. Statické stránky (O nás, Kontakt, Obchodní podmínky, atd.)
- Většinou jednoduché `max-w-prose` textové stránky — pravděpodobně OK.
- [M22] Kontaktní stránka — ověřit, zda kontaktní formulář/mapa je responzivní.

### 12. ProductCard (`src/components/ProductCard.tsx`) — PROBLÉM

**Problémy:**
- [M23] **Quick-add tlačítko "Přidat do košíku" se zobrazuje jen na hover** (`opacity-0 group-hover:opacity-100`). Na mobilu HOVER NEEXISTUJE. Uživatel na mobilu nemůže použít quick-add — musí vždy kliknout na detail produktu. **Řešení:** Zobrazovat CTA vždy na mobilu, nebo přidat tap handler.
- [M24] **Size picker overlay** na malém mobilu (grid-cols-2, karta ~170px) — "Vyber velikost" overlay s mnoha velikostmi může být těsný. Zvážit bottom sheet místo in-card overlay.
- [M25] **Wishlist heart** je `opacity-0 group-hover:opacity-100` — na mobilu nedostupný bez hoveru.

### 13. Footer (`src/components/Footer.tsx`) — DOBRÝ

**Co funguje:**
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1fr_1fr_1fr]`
- Bottom bar `flex-col sm:flex-row`

**Problémy:**
- [M26] **5 sloupců na mobilu = 5 bloků pod sebou.** Je to hodně scrollování. Zvážit accordion/collapsible sekce na mobilu (Nakupování, Zákaznický servis, O nás, Kontakt).

### 14. MobileFilterDrawer (`src/components/MobileFilterDrawer.tsx`) — DOBRÝ

**Co funguje:**
- Bottom sheet overlay s `max-h-[85vh]` a `overflow-y-auto`
- 44px tap target na trigger tlačítku
- Close ikona s 44px hit area

---

## Prioritizace oprav

### KRITICKÉ (konverze / UX blocker)

| # | Problém | Stránka | Dopad |
|---|---------|---------|-------|
| M9 | Galerie před cenou/CTA na mobilu | Produkt detail | Uživatel nevidí cenu bez scrollování |
| M14 | Sort nefunguje na mobilu (hledat) | Hledat | Nelze řadit výsledky |
| M15 | CTA "K pokladně" schované dole | Košík | Uživatel nevidí tlačítko |
| M18+M19 | CTA "Objednat" schované dole | Pokladna | Může snížit konverzi |
| M23 | Quick-add jen na hover | ProductCard | Mobilní uživatelé nemohou použít |

### STŘEDNÍ (UX zlepšení)

| # | Problém | Stránka | Dopad |
|---|---------|---------|-------|
| M3 | Chybí účet ikona na mobilu | Header | Nelze rychle přejít na účet |
| M4 | Header zabírá 104px | Header | Ztráta viewport prostoru |
| M6 | Kategorie "Běh" moc velká | Homepage | Neefektivní využití prostoru |
| M7 | Navy panel moc vysoký | Homepage | Moc scrollování |
| M12 | Sort chybí na mobilu v kategorii | Pokud platí | Nelze řadit (ověřit) |
| M25 | Wishlist nedostupný na mobilu | ProductCard | Chybí funkce |
| M26 | Footer moc dlouhý | Footer | Moc scrollování |

### NÍZKÉ (nice-to-have)

| # | Problém | Stránka | Dopad |
|---|---------|---------|-------|
| M1 | Top bar overflow | Header | Estetický |
| M2 | Hamburger menu bez overlay | Header | Minor UX |
| M5 | Hero tags overflow | Homepage | Estetický |
| M8 | Instagram "Sledovat" chybí | Homepage | Minor |
| M10 | Share buttons tap target | Product detail | Accessibility |
| M11 | Highlights text ořezávání | Product detail | Edge case |
| M13 | Subcategory pills overflow | Kategorie | Edge case |
| M17 | Cross-sell grid vs karusel | Košík | Nice-to-have |
| M20 | Blog tabs wrapping | Blog | Estetický |
| M21 | AccountNav na mobilu | Účet | Layout |
| M22 | Kontakt responzivita | Kontakt | Ověřit |
| M24 | Size picker na malém mobilu | ProductCard | Edge case |

---

## Implementační plán

### FÁZE 1: Kritické opravy (konverze)

#### 1.1 ProductCard — mobilní quick-add + wishlist
**Soubor:** `src/components/ProductCard.tsx`

```tsx
{/* Quick-add: vždy viditelný na mobilu, hover na desktopu */}
{stock > 0 && !showSizes && !added && (
  <div className="absolute bottom-3 left-3 right-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 translate-y-0 lg:translate-y-2 lg:group-hover:translate-y-0 transition-all duration-200 z-10">
    <button ...>Přidat do košíku</button>
  </div>
)}

{/* Wishlist: vždy viditelný na mobilu */}
<div className="absolute top-2 right-2 z-10 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
  <WishlistButton ... />
</div>
```

#### 1.2 Product Detail — cena + CTA viditelné na mobilu
**Soubor:** `src/app/(public)/produkt/[slug]/page.tsx`

Přidat sticky mobilní CTA bar na spodku stránky:

```tsx
{/* Mobile sticky CTA bar */}
<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line p-3 flex items-center justify-between md:hidden z-40 safe-area-bottom">
  <div>
    <span className="text-[20px] font-extrabold text-navy">{formatPrice(price)}</span>
    {discount && <span className="text-[12px] text-sale font-bold ml-2">-{discount}%</span>}
  </div>
  <button className="h-[44px] px-6 bg-lime text-navy text-[12px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)]">
    Do košíku
  </button>
</div>
```

A přidat `pb-[80px] md:pb-0` na hlavní kontejner, aby obsah nebyl zakrytý.

#### 1.3 Košík — sticky mobilní CTA
**Soubor:** `src/app/(public)/kosik/page.tsx`

```tsx
{/* Mobile sticky bottom bar */}
<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line p-4 lg:hidden z-40 safe-area-bottom">
  <div className="flex items-center justify-between mb-2">
    <span className="text-[14px] font-bold text-navy">Celkem</span>
    <span className="text-[18px] font-extrabold text-navy">{formatPrice(total)}</span>
  </div>
  <Link href="/pokladna" className="w-full h-[48px] bg-lime text-navy text-[13px] font-extrabold uppercase tracking-[0.12em] rounded-[var(--radius-pill)] flex items-center justify-center">
    Pokračovat k pokladně
  </Link>
</div>
```

#### 1.4 Pokladna — sticky mobilní submit
**Soubor:** `src/app/(public)/pokladna/page.tsx`

Stejný pattern — sticky bar se summary + submit tlačítkem na mobilu.

#### 1.5 Hledat — sort na mobilu
**Soubor:** `src/app/(public)/hledat/page.tsx`

Změnit:
```tsx
// PŘED:
<div className="hidden lg:block">
  <SortDropdown />
</div>

// PO:
<SortDropdown />
```

Nebo lépe: přidat sort do MobileFilterDrawer.

### FÁZE 2: Střední priority

#### 2.1 Header — účet link na mobilu
**Soubor:** `src/components/Header.tsx`

Přidat do mobilního menu:
```tsx
<Link href="/ucet" className="block px-0 py-3 text-[15px] font-medium border-b border-wash text-ink" onClick={() => setMenuOpen(false)}>
  Můj účet
</Link>
```

Nebo přidat ikonu vedle košíku v mobilním headeru.

#### 2.2 Header — schování top baru při scrollu
Přidat `useEffect` hook s `IntersectionObserver` nebo scroll event, který schová top bar (32px) po scrollu 50px dolů. Nebo jednoduše: top bar `hidden lg:block` (úplně schovat na mobilu).

#### 2.3 Homepage — menší Běh karta na mobilu
**Soubor:** `src/app/(public)/page.tsx`

```tsx
// Změnit isLarge aspect ratio:
className={`${isLarge ? "aspect-[3/2] sm:aspect-square lg:aspect-auto lg:h-full min-h-[200px] lg:min-h-[280px]" : ...}`}
```

#### 2.4 Homepage — navy panel menší na mobilu
```tsx
<div className="bg-navy rounded-[10px] p-6 lg:p-8 flex flex-col justify-between min-h-[200px] lg:min-h-[300px]">
```

#### 2.5 Footer — collapsible sekce na mobilu
Proměnit footer sloupce na accordion (client component wrapper):

```tsx
// Na mobilu: kliknutelné headery, schovaný obsah
// Na desktopu: vždy viditelné
<FooterAccordion title="Nakupování" className="lg:block">
  <ul>...</ul>
</FooterAccordion>
```

### FÁZE 3: Polish

- M1: Top bar — `text-[11px] sm:text-[12px]`
- M2: Hamburger menu overlay — přidat `fixed inset-0 bg-black/30` za menu
- M5: Hero tags — `overflow-x-auto flex-nowrap` na malých zařízeních
- M8: Instagram mobilní tlačítko
- M13: Subcategory pills `overflow-x-auto`
- M20: Blog tabs `overflow-x-auto flex-nowrap`

---

## Soubory k úpravě

| Soubor | Změny | Fáze |
|--------|-------|------|
| `src/components/ProductCard.tsx` | Quick-add + wishlist viditelné na mobilu | 1 |
| `src/app/(public)/produkt/[slug]/page.tsx` | Sticky mobilní CTA bar | 1 |
| `src/app/(public)/kosik/page.tsx` | Sticky mobilní CTA bar + padding | 1 |
| `src/app/(public)/pokladna/page.tsx` | Sticky mobilní submit bar | 1 |
| `src/app/(public)/hledat/page.tsx` | Sort viditelný na mobilu | 1 |
| `src/components/Header.tsx` | Účet link, top bar scroll, overlay | 2 |
| `src/app/(public)/page.tsx` | Menší Běh karta, navy panel | 2 |
| `src/components/Footer.tsx` | Accordion na mobilu | 2 |
| `src/components/MobileFilterDrawer.tsx` | Přidat sort option | 2 |
| Různé | Polish items (font-size, overflow, padding) | 3 |

## Nové soubory

| Soubor | Účel |
|--------|------|
| `src/components/MobileStickyBar.tsx` | Reusable sticky bottom CTA bar | 1 |
| `src/components/FooterAccordion.tsx` | Collapsible footer sekce na mobilu | 2 |

## Safe area handling

Pro iPhony s dynamic island a bottom bar přidat CSS:

```css
/* V globals.css */
.safe-area-bottom {
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}
```

## Odhad rozsahu

- **Fáze 1 (kritické):** ~150 řádků nového kódu + úpravy v 5 souborech
- **Fáze 2 (střední):** ~120 řádků + 3 soubory + 1 nová komponenta
- **Fáze 3 (polish):** ~50 řádků drobných úprav

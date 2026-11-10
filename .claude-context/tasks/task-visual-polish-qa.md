# QA Report — Vizuální polish (Tasky #5, #6, #7)

**Datum:** 2026-11-10  
**Kontrolor:** kontrolor agent  
**Zdroje:** plány v `.claude-context/tasks/`, brand brief, kód, `npx next build`

---

## 1. Build

**Výsledek: PASSED**

`npx next build` proběhl bez chyb ani varování. Všechny stránky (static i dynamic) se zkompilují správně.

---

## 2. Homepage Hero sekce

**Výsledek: PASSED**

| Bod | Očekáváno (plán) | Implementace | Status |
|-----|-----------------|--------------|--------|
| Grid layout | `grid grid-cols-1 lg:grid-cols-2` | `grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center` | ✅ |
| Subheading | `text-[11px] font-bold uppercase tracking-[0.12em] text-lime` | `text-[11px] font-bold uppercase tracking-[0.12em] text-lime mb-4` | ✅ |
| Nadpis H1 | `text-[36px] lg:text-[52px] font-extrabold tracking-[-0.04em]` | `text-[36px] lg:text-[52px] font-extrabold leading-[1.05] tracking-[-0.04em]` | ✅ |
| 2 CTA tlačítka | "Nakupovat" (lime) + "Všechny On" (outline) | Obě přítomna, správné styly | ✅ |
| Produkt karta vpravo | Pastel bg + badge BESTSELLER + lime cenovka kruh | Implementováno, podmíněno `hero && heroPhoto` | ✅ |
| Badge BESTSELLER | `bg-lime text-navy` pill vlevo nahoře | `bg-lime text-navy text-[10px] font-extrabold uppercase tracking-[0.08em] px-3 py-1.5 rounded-[var(--radius-pill)]` | ✅ |
| Lime cenovka kruh | `bg-lime rounded-full` vpravo dole | `w-[72px] h-[72px] lg:w-[88px] lg:h-[88px] bg-lime rounded-full` | ✅ |
| mix-blend-mode: multiply | Na produktové fotce | `style={{ mixBlendMode: "multiply" }}` | ✅ |

**Poznámka:** Pokud `bestsellers[0]` nemá fotku (`heroPhoto` je prázdný string), pravý sloupec se nevykreslí. Jde o záměrnou podmíněnou logiku, nikoliv chybu.

---

## 3. Homepage drobnosti

**Výsledek: PASSED**

| Sekce | Stav |
|-------|------|
| Prémiové značky — logo výška `h-[24px] lg:h-[36px]` | ✅ Implementováno |
| Značky — grayscale opacity-50, hover plné barvy | ✅ Implementováno |
| Bestsellery — `flex justify-between items-center` heading | ✅ Implementováno |
| Bestsellery — grid `grid-cols-2 lg:grid-cols-4` | ✅ Implementováno |
| ProductCard badge prop — BESTSELLER na prvním, NOVINKA na třetím | ✅ Implementováno v `page.tsx` řádek 196 |
| Kategorie grid — `lg:grid-cols-[1.2fr_1fr_1fr]` s row-span-2 pro Běh | ✅ Implementováno |
| Kategorie gap — `gap-4` | ✅ Implementováno |
| Série — section heading + navy panel + 2 ProductCard | ✅ Implementováno |
| Série — `lg:grid-cols-[1fr_2fr]` | ✅ Implementováno |
| Proč Qsport — 3 boxy `bg-wash`, čísla 01/02/03, `min-h-[160px]` | ✅ Implementováno |
| Instagram — 6 placeholderů v `grid-cols-3 sm:grid-cols-6`, SVG ikona | ✅ Implementováno |

---

## 4. Header

**Výsledek: PASSED**

| Bod | Stav |
|-----|------|
| Účet ikona skrytá na mobilu | ✅ `hidden lg:flex` na `/ucet` link (řádek 91) |
| Nav gap | ✅ `gap-1` (řádek 58) |
| Top bar lime tečky | ✅ `bg-lime mx-3 w-[5px] h-[5px] rounded-full` |
| Sticky header | ✅ `sticky top-0 z-50` |
| Logo výška desktop/mobil | ✅ `h-[24px]` desktop, `h-[20px]` mobil |
| Akce červeně | ✅ `text-sale` |
| Hledání mobil vždy viditelné | ✅ `lg:hidden pb-3` div s SearchInput |
| Hamburger menu | ✅ Implementováno, Akce `text-sale font-bold` |

---

## 5. Footer

**Výsledek: PASSED**

| Bod | Stav |
|-----|------|
| Logo spacing | ✅ `mb-3` na logo Image (řádek 16) |
| Bílé SVG logo | ✅ `/qsport-logo-web-bila.svg` |
| "výkon bez kompromisů" (uppercase CSS) | ✅ `uppercase tracking-[0.12em] text-white/40` |
| 5 sloupců grid | ✅ `lg:grid-cols-[1.8fr_1fr_1fr_1fr_1fr]` |
| Všechny linky a texty | ✅ Odpovídají brand briefu |

---

## 6. Kategorie stránka

**Výsledek: PASSED**

| Bod | Stav |
|-----|------|
| Navy hero banner | ✅ `bg-navy text-white py-10 lg:py-14` |
| Subcategory chips v hero | ✅ Podmíněně renderováno pro parent/child kategorie, `px-5 py-2 rounded-full` |
| Aktivní chip — bílý | ✅ `bg-white text-navy` pro aktivní, `border border-white/30 text-white` pro ostatní |
| "Vše" chip | ✅ Naviguje na parent kategorii |
| Underline na posledním slovu nadpisu | ✅ `bg-blue h-[4px]` linka |
| Cenové rozsahy ve FilterBar | ✅ 3 rozsahy: "Do 3 000 Kč", "3 000 – 5 000 Kč", "Nad 5 000 Kč" |
| Sidebar filtry skryté na mobilu | ✅ `hidden lg:block` |

---

## 7. ProductGallery — badge jako prop

**Výsledek: PASSED**

Komponenta `ProductGallery` přijímá `badge?: string | null` jako prop (řádek 11, `ProductGallery.tsx`). V `produkt/[slug]/page.tsx` je předáváno `badge={null}` (řádek 143). Není hardcoded — badge je řízen externě.

**Poznámka:** V aktuálním product page je `badge={null}`. Pokud bude potřeba badge zobrazovat dle dat produktu (např. `is_new`), stačí změnit hodnotu v page.tsx — architektura to podporuje.

---

## 8. ProductActions — vyprodané velikosti

**Výsledek: PASSED**

Vyprodané varianty v `ProductActions.tsx` (řádek 51–53):
```tsx
: "border-line text-muted/40 bg-white cursor-not-allowed"
```
**Bez `line-through`** — správně dle zadání. Tlačítko je jen zšedlé a `cursor-not-allowed`, ale není přeškrtnuté.

---

## 9. Diakritika — kontrola českých textů

**Výsledek: PASSED**

Prověřeny všechny klíčové texty:

| Soubor | Text | Status |
|--------|------|--------|
| `page.tsx` | "Nová sezóna · On Waterproof" | ✅ správná diakritika |
| `page.tsx` | "On do každého počasí." | ✅ správná diakritika |
| `page.tsx` | "Nepromokavé boty na trail i do města." | ✅ správná diakritika |
| `page.tsx` | "Co teď frčí." | ✅ správná diakritika |
| `page.tsx` | "Venku je tvoje hřiště." | ✅ správná diakritika |
| `page.tsx` | "Druhá šance pro výbavu." | ✅ správná diakritika |
| `page.tsx` | "Výkon bez kompromisů." | ✅ správná diakritika |
| `page.tsx` | "Ze světa sportu." | ✅ správná diakritika |
| `page.tsx` | "Sleduj nás na Instagramu." | ✅ správná diakritika |
| `page.tsx` | "Novinky a akce jako první." | ✅ správná diakritika |
| `Header.tsx` | "Nákup bez registrace", "Doprava od 49 Kč" | ✅ správná diakritika |
| `Footer.tsx` | "Zákaznický servis", "Vrácení zboží", "Reklamace" | ✅ správná diakritika |
| `ProductCard.tsx` | "Přidat do košíku", "Vyprodáno", "Přidáno", "Vyber velikost", "Zavřít" | ✅ správná diakritika |
| `ProductActions.tsx` | "Vyber si velikost (EU)", "Vyberte velikost", "Tabulka velikostí" | ✅ správná diakritika |
| `ProductActions.tsx` | "Skladem · Expedice 1–3 pracovní dny" | ✅ správná diakritika |
| `kategorie/[slug]/page.tsx` | "Domů", "produktů", "Žádné produkty neodpovídají filtru." | ✅ správná diakritika |
| `FilterBar.tsx` | "Značka", "Velikost skladem", "Dostupnost", "Pouze skladem", "Cena", "Řazení", "Resetovat filtry" | ✅ správná diakritika |

---

## 10. CSS třídy vs. brand brief

**Výsledek: PASSED**

| CSS proměnná / třída | Brand brief | Kód | Status |
|---------------------|-------------|-----|--------|
| `bg-navy` | #0B1727 | Používáno v Header, Hero, Footer, Navy panel | ✅ |
| `text-lime` / `bg-lime` | #CEFF2F | CTA tlačítka, badges, cenovka, tečky | ✅ |
| `text-sale` / `bg-sale` | #C1121F | Jen výprodej, přeškrtnutá cena, Akce nav | ✅ |
| `text-blue` | #3157FF | Odkazy v breadcrumbs na detailu produktu | ✅ |
| `bg-wash` | #F3F5F6 | Proč Qsport boxy, placeholdery | ✅ |
| `text-muted` | #667085 | Popisky, sekundární text | ✅ |
| `bg-mint` / `bg-sky` / `bg-peach` / `bg-lilac` | Pastely per kategorie | categoryPastels mapa | ✅ |
| `border-line` | #DCE2E8 | Okraje, oddělovače | ✅ |
| `tracking-[-0.04em]` | Nadpisy: letter-spacing -0.04em | H1, H2, H3 nadpisy | ✅ |
| `tracking-[0.12em]` | Tlačítka/štítky: letter-spacing 0.12em | CTA tlačítka, badges | ✅ |
| `font-extrabold` (800) | Nadpisy: 800 | H1, H2, H3 | ✅ |
| `rounded-[var(--radius-pill)]` | Pill radius | CTA tlačítka, badges | ✅ |
| `rounded-[var(--radius-card)]` / `rounded-[6px]` | Card radius 6px | Produktové karty | ✅ |
| `max-w-[var(--container)]` | Container 1320px | Všechny sekce | ✅ |

---

## 11. Responsivita — mobilní breakpointy

**Výsledek: PASSED**

| Komponenta | Mobilní třída | Desktop třída | Status |
|-----------|--------------|---------------|--------|
| Hero grid | `grid-cols-1` | `lg:grid-cols-2` | ✅ |
| Hero nadpis | `text-[36px]` | `lg:text-[52px]` | ✅ |
| Bestsellery grid | `grid-cols-2` | `lg:grid-cols-4` | ✅ |
| Kategorie grid | `grid-cols-1 sm:grid-cols-2` | `lg:grid-cols-[1.2fr_1fr_1fr]` | ✅ |
| IG grid | `grid-cols-3` | `sm:grid-cols-6` | ✅ |
| Header layout | `flex lg:hidden` / `hidden lg:flex` | Správné přepínání | ✅ |
| Účet ikona | skryta (`hidden lg:flex`) | viditelná | ✅ |
| Footer grid | `grid-cols-1 sm:grid-cols-2` | `lg:grid-cols-[1.8fr_1fr_1fr_1fr_1fr]` | ✅ |
| Sidebar filtry | `hidden lg:block` | viditelný | ✅ |
| Kategorie hero nadpis | `text-[32px]` | `lg:text-[48px]` | ✅ |
| Produkt detail grid | `grid-cols-1` | `md:grid-cols-[1fr_1fr]` | ✅ |
| "Zobrazit vše" button | `hidden sm:inline-flex` | viditelný | ✅ |

---

## Celkové hodnocení

| Oblast | Výsledek |
|--------|----------|
| Build | PASSED |
| Homepage Hero | PASSED |
| Homepage drobnosti | PASSED |
| Header | PASSED |
| Footer | PASSED |
| Kategorie | PASSED |
| ProductGallery badge prop | PASSED |
| ProductActions vyprodáno | PASSED |
| Diakritika | PASSED |
| CSS vs. brand brief | PASSED |
| Responsivita | PASSED |

**Celkem: 11/11 bodů PASSED. Implementace je kompletní a odpovídá plánu, mockupu i brand briefu.**

---

## Drobné poznámky (non-blocking)

1. **Hero — badge prop na homepage hero produktu je hardcoded** (`"Bestseller"` string v `page.tsx:121`). Není to problém, ale do budoucna lze řídit z dat produktu.
2. **ProductGallery badge** — aktuálně vždy `badge={null}` v product page. Architekticky připraveno pro data-driven badge.
3. **Instagram sekce** — placeholdery (záměr, IG API integrace je budoucí task).
4. **Kategorie ikony** — SVG ikony s opacity-30, nikoliv reálné produktové fotky. Záměr dle plánu ("budoucí vylepšení").

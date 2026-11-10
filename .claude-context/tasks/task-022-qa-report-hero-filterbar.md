# QA Report — Hero Slider + FilterBar click fix

**Datum:** 2026-11-04  
**Kontrolor:** kontrolor agent  
**Build:** ✅ PASS (`next build` bez chyb, TypeScript OK, 15 stránek)

---

## 1. HeroSlider.tsx — nový client component

| # | Požadavek | Stav | Detail |
|---|-----------|------|--------|
| 1.1 | `"use client"` direktiva | ✅ | Řádek 1 |
| 1.2 | Auto-rotace 6s | ✅ | `interval = 6000`, `setInterval(next, interval)` v useEffect |
| 1.3 | 3 brand slidy (On/POC/Mizuno) | ✅ | `HERO_CONFIGS` v `page.tsx` — 3 záznamy: brandSlug `on`, `poc`, `mizuno` |
| 1.4 | Dot navigation | ✅ | Řádky 153–166 — `button` pro každý slide, aktivní = lime + scale-125 |
| 1.5 | Crossfade efekt | ✅ | `grid` overlay + `transition-opacity duration-700 ease-in-out`, neaktivní slide `opacity-0 pointer-events-none` |
| 1.6 | Pause on hover | ✅ | `onMouseEnter={() => setPaused(true)}` / `onMouseLeave={() => setPaused(false)}`, useEffect respektuje `paused` |
| 1.7 | Mobile layout | ✅ | Oddělený product card blok `lg:hidden` (řádky 116–136), vlastní rozměry (max-w-[300px], price badge 60px), mobile CTA `lg:hidden` (řádky 140–147) |
| 1.8 | Desktop product card | ✅ | `hidden lg:block w-[380px]` (řádky 94–113), badge, price circle |
| 1.9 | Správné použití hooks | ✅ | `useCallback` pro `next`, závislosti useEffect kompletní (`paused, next, interval, slides.length`) |
| 1.10 | Fallback při 0 slidech | ✅ | `if (slides.length === 0) return null` |

**Poznámka — potenciální issue:** Desktop CTA tlačítka jsou obalena `hidden lg:flex` (řádek 76), ale na mobilu je zobrazen jen `ctaPrimary` v mobile CTA sekci (řádky 140–147). `ctaSecondary` na mobilu chybí — je to záměr, nebo přehlédnutí? Z mockupu zřejmě OK (jeden velký CTA button přes celou šířku).

---

## 2. page.tsx — HERO_CONFIGS + server-side data

| # | Požadavek | Stav | Detail |
|---|-----------|------|--------|
| 2.1 | HERO_CONFIGS konstanta | ✅ | 3 konfigurace: On (bg-mint, BESTSELLER), POC (bg-sky, NOVINKA), Mizuno (bg-mint, BESTSELLER) |
| 2.2 | Server-side DB fetch pro každý brand | ✅ | `for (const config of HERO_CONFIGS)` s `prisma.product.findFirst` — hledá aktivní produkt s fotkou pro daný brandSlug |
| 2.3 | HeroSlider import a použití | ✅ | `import { HeroSlider, type HeroSlide }` + `<HeroSlider slides={heroSlides} interval={6000} />` |
| 2.4 | Fallback generický slide | ✅ | Pokud žádný ze slidů nemá produkt (`heroSlides.every(s => !s.product)`), nahradí se jedním generickým slidem |
| 2.5 | ctaPrimary vs ctaSecondary | ⚠️ | Obě CTA v `HERO_CONFIGS` ukazují na stejný `ctaHref` (`/znacky/on`, `/znacky/poc`, `/znacky/mizuno`). ctaSecondary ("Všechny On") jde na stejnou URL jako ctaPrimary ("Nakupovat"). Je to záměr? Přijatelné jako MVP. |
| 2.6 | Sequential DB queries (ne parallelní) | ⚠️ | `for` loop s `await prisma.product.findFirst` = 3 sekvenční DB dotazy. Mohlo by být `Promise.all`, ale jde o hero sekci, přijatelné pro MVP. |

---

## 3. FilterBar.tsx — checkbox click area fix

| # | Požadavek | Stav | Detail |
|---|-----------|------|--------|
| 3.1 | Celý řádek je button | ✅ | Nové komponenty `Checkbox` a `Radio` — obal je `<button type="button" className="...w-full text-left">`, celá plocha klikatelná |
| 3.2 | Checkbox komponenta extrahována | ✅ | `function Checkbox({ checked, onClick, label, suffix })` — řádky 27–45 |
| 3.3 | Radio komponenta extrahována | ✅ | `function Radio({ checked, onClick, label })` — řádky 47–64, použita pro sekci Řazení |
| 3.4 | CheckIcon extrahován | ✅ | `function CheckIcon()` — SVG checkmark, opakovaně použit |
| 3.5 | Značka — Checkbox + count suffix | ✅ | `suffix={<span className="text-[11px] text-muted ml-auto">{b.count}</span>}` |
| 3.6 | Dostupnost — Checkbox | ✅ | Jeden `<Checkbox>` pro "Pouze skladem" |
| 3.7 | Cena — Checkbox | ✅ | `priceRanges.map()` s `<Checkbox>` |
| 3.8 | Velikost — ponechány size chips (button) | ✅ | Správně — velikosti jsou chip-styl, ne checkboxy, odpovídá mockupu |
| 3.9 | Resetovat filtry button | ✅ | Zobrazen když `hasFilters`, celá šířka |
| 3.10 | Section toggle +/− | ✅ | `Section` komponenta zachována z předchozí verze, funguje správně |

---

## Build

```
✓ Compiled successfully in 321ms
✓ TypeScript — žádné chyby
✓ 15 stránek vygenerováno
```

---

## Nalezené problémy

### ⚠️ Minor (neblokující)

1. **ctaSecondary = stejná URL jako ctaPrimary** (`page.tsx:122-123`) — obě CTA tlačítka odkazují na `config.ctaHref`. "Všechny On" a "Nakupovat" jdou na `/znacky/on`. Přijatelné jako MVP, ale ideálně by "Nakupovat" šlo na `/hledat?znacka=on`.

2. **Hero DB fetch je sekvenční** (`page.tsx:103-131`) — 3× `await` v `for` loop místo `Promise.all([...])`. Bez dopadu na správnost, pouze výkon (3 dotazy sekvenčně místo paralelně).

3. **h2 místo h1 v HeroSlider** (`HeroSlider.tsx:66`) — headline používá `<h2>`, ale protože je to hlavní hero sekce stránky, SEO-správně by mělo být `<h1>`. Stránka nemá jiný `<h1>` (sekce 3-6 mají `<h2>`). Zvážit změnu.

### ❌ Žádné blokující chyby

---

## Celkový výsledek

| Oblast | Výsledek |
|--------|----------|
| HeroSlider.tsx | ✅ 10/10 — plně implementováno |
| page.tsx HERO_CONFIGS | ✅ 5/6 — 1 minor (ctaSecondary URL) |
| FilterBar click fix | ✅ 10/10 — celý řádek klikatelný |
| Build | ✅ PASS |

**SCHVÁLENO** — 3 minor poznámky, žádné blokující chyby.

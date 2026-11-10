# Plán: Header + Footer polish podle brand briefu a mockupu

**Soubory:** `src/components/Header.tsx`, `src/components/Footer.tsx`
**Mockupy:** `.brand/brand/qsport-brand/web/navrh-webu/web-home.png`, `web-mobil.png`
**Brief:** `.claude-context/tasks/qsport-brand-brief.md`

---

## HEADER — Porovnání mockup vs. kód

### Top bar (navy, 32px)

**Mockup:** Navy pruh s textem "Nákup bez registrace · Doprava od 49 Kč · BAZAR", bílý text, limetkové tečky jako oddělovače
**Aktuální kód:** ✅ Odpovídá — má lime tečky (`bg-lime mx-3`), správné texty

**Rozdíly a opravy:**
1. **Doprava text skrytý na mobilu** — `hidden sm:inline` na "Doprava od 49 Kč" a druhé lime tečce. Mockup mobil ukazuje jen "Nákup bez registrace · BAZAR" — **to sedí, OK**
2. **Druhá lime tečka:** aktuální kód má `hidden sm:inline-block` na druhém tečce — ale chybí `w-[5px] h-[5px] rounded-full` třídy! Jen `hidden sm:inline-block`, chybí rozměry.

**Oprava řádek ~34:**
```tsx
// Aktuální (chybný):
<span className="hidden sm:inline-block w-[5px] h-[5px] rounded-full bg-lime mx-3" />
// → Toto je vlastně OK, třídy tam jsou, jen hidden sm:inline-block skryje na mobilu
```
Po přečtení kódu znovu: řádek 34 má `hidden sm:inline-block w-[5px] h-[5px] rounded-full bg-lime mx-3` — to je správné. ✅

### Hlavní header (bílý, sticky)

**Mockup desktop:**
- Logo "QSPORT" vlevo (SVG wordmark)
- Nav uprostřed: Běh · Hory a outdoor · Zima · Oblečení · Doplňky · Značky · Bazar · **Akce** (červeně)
- Vpravo: ikony hledání (lupa) + košík (tašky ikona)
- NENÍ ikona účtu v mockupu — jen lupa + košík

**Aktuální kód:**
- Logo: ✅ `/qsport-logo-web.svg`, výška 24px
- Nav: ✅ 8 odkazů, Akce červeně (`text-sale`)
- Ikony: Lupa + Účet + Košík — **mockup nemá ikonu účtu na desktopu**

**Rozdíly a opravy:**

| # | Položka | Mockup | Kód | Akce |
|---|---------|--------|-----|------|
| 1 | Účet ikona desktop | Není vidět | Je tam | Zvážit skrytí — ale spíš ponechat (funkce existuje) |
| 2 | Nav mezery | Vzdálenější | `gap-0.5` + `px-3` | Zvýšit `gap-1` |
| 3 | Nav font | Zdá se 14px medium | `text-[14px] font-medium` | ✅ OK |
| 4 | Header výška | ~56-60px | `h-[60px]` | ✅ OK |
| 5 | Logo velikost | ~24px výška | `h-[24px]` | ✅ OK |
| 6 | Sticky | Ano | `sticky top-0 z-50` | ✅ OK |
| 7 | Border bottom | Jemná linka | `border-b border-line` | ✅ OK |

### Mobilní header

**Mockup mobil (web-mobil.png):**
- Top bar: "Nákup bez registrace · BAZAR" (skrátěno)
- Header: Hamburger vlevo, "QSPORT" logo uprostřed, košík ikona vpravo
- NENÍ účet ikona v mobilu mockupu
- Pod header: search bar "Hledej značku nebo produkt..." (vždy viditelný)

**Aktuální kód:**
- Hamburger vlevo ✅
- Logo uprostřed ✅
- Účet + Košík vpravo — **mockup má jen košík**
- Search pod header ✅ (vždy viditelný na mobilu)

**Rozdíly a opravy:**

| # | Položka | Mockup | Kód | Akce |
|---|---------|--------|-----|------|
| 1 | Účet ikona mobil | Není | Je tam | Skrýt na mobilu: `hidden lg:flex` na účet link |
| 2 | Mobilní header výška | ~52px | `h-[52px]` | ✅ OK |
| 3 | Logo mobil | ~20px výška | `h-[20px]` | ✅ OK |
| 4 | Hledání mobil | Vždy viditelné | Vždy viditelné | ✅ OK |

---

## Konkrétní změny v Header.tsx

### Změna 1: Skrýt účet ikonu na mobilu (řádky ~137-141)
```diff
- <Link href="/ucet" className="w-10 h-10 flex items-center justify-center text-ink" aria-label="Můj účet">
+ <Link href="/ucet" className="hidden lg:flex w-10 h-10 items-center justify-center text-ink" aria-label="Můj účet">
```

Poznámka: Na desktopu účet ikona zůstane — i když mockup ji přímo neukazuje, je to funkční prvek, který je potřeba pro přihlášené uživatele.

### Změna 2: Nav gap (řádek ~58)
```diff
- <nav className="flex items-center gap-0.5 flex-1">
+ <nav className="flex items-center gap-1 flex-1">
```

### Změna 3: Desktop search — zvážit defaultně otevřený
Mockup desktop neukazuje search přímo v header baru (jen ikonu), ale mobil ukazuje search vždy. **Aktuální chování je správné** — desktop toggle, mobil vždy viditelný.

---

## FOOTER — Porovnání mockup vs. kód

### Mockup footer (bottom of web-home.png):

**Layout:** Navy pozadí, 5 sloupců:
1. **QSPORT.CZ** logo (bílé SVG) + "VÝKON BEZ KOMPROMISŮ" subtext
2. **NAKUPOVÁNÍ:** Běh, Hory a outdoor, Zima, Bazar, Akce
3. **ZÁKAZNICKÝ SERVIS:** Doprava a platba, Vrácení zboží, Reklamace, Velikosti
4. **O NÁS:** Kdo jsme, Značky, Obchodní podmínky
5. **KONTAKT:** obchod@qsport.cz, +420 777 447 464, Instagram · Facebook

**Bottom bar:** © 2026 Qsport.cz

### Aktuální kód:
- 5 sloupců grid ✅
- Logo + "výkon bez kompromisů" ✅
- Nakupování: Běh, Hory a outdoor, Zima, Bazar, Akce ✅
- Zákaznický servis: Doprava a platba, Vrácení zboží, Reklamace, Velikosti ✅
- O nás: Kdo jsme, Značky, **Blog**, Obchodní podmínky — **mockup nemá Blog**
- Kontakt: email, telefon, Instagram · Facebook ✅
- Bottom bar: © 2026 Qsport.cz ✅

### Rozdíly a opravy:

| # | Položka | Mockup | Kód | Akce |
|---|---------|--------|-----|------|
| 1 | Blog v "O nás" | Není | Je tam | Ponechat — Blog existuje jako feature, mockup mohl být starší |
| 2 | Logo subtext | "VÝKON BEZ KOMPROMISŮ" (uppercase) | "výkon bez kompromisů" (lowercase) | ✅ CSS má uppercase (`text-[11px] font-bold uppercase`) |
| 3 | Grid proportions | Rovnoměrné 4 sloupce po logu | `lg:grid-cols-[1.8fr_1fr_1fr_1fr_1fr]` | ✅ OK — logo sloupec je wider |
| 4 | Link styling | Bílý text, opacity ~70% | `text-white/70 hover:text-white` | ✅ OK |
| 5 | Heading styling | Uppercase, muted | `text-[11px] font-bold uppercase tracking-[0.12em] text-white/40` | ✅ OK |
| 6 | Social links | Na stejné úrovni | Oddělené `pt-1` | ✅ OK |
| 7 | Bottom border | Tenká linka | `border-t border-white/10` | ✅ OK |

---

## Konkrétní změny v Footer.tsx

### Footer je z velké části v pořádku. Minimální změny:

### Změna 1: Logo spacing (řádek ~17)
```diff
- className="h-[28px] w-auto mb-2"
+ className="h-[28px] w-auto mb-3"
```
Mockup má trochu více prostoru mezi logem a subtextem.

### Změna 2 (volitelná): Přidat "Sport" do subtitle
Mockup zdá se má "SPORT BEZ KOMPROMISŮ" místo "VÝKON BEZ KOMPROMISŮ". Ale brand brief říká "výkon bez kompromisů" — **ponechat dle briefu**.

---

## Mobilní menu

### Aktuální stav:
- Hamburger → dropdown s nav odkazy
- Každý link: `text-[15px] font-medium`, border-bottom wash
- Akce: `text-sale font-bold`

### Mockup (web-mobil.png):
- Hamburger vlevo — ✅
- Menu obsah není viditelný (zavřený stav)

### Změny: Žádné — mobilní menu odpovídá brand briefu

---

## Shrnutí priorit

| # | Změna | Soubor | Náročnost | Dopad |
|---|-------|--------|-----------|-------|
| 1 | Skrýt účet ikonu na mobilu | Header.tsx:137 | NÍZKÁ | Čistší mobil UI dle mockupu |
| 2 | Nav gap zvětšit | Header.tsx:58 | NÍZKÁ | Lepší spacing |
| 3 | Footer logo spacing | Footer.tsx:17 | NÍZKÁ | Drobný polish |

---

## Závěr

Header i Footer jsou implementovány velmi blízko mockupu a brand briefu. Hlavní odchylka je **účet ikona na mobilu** (v mockupu chybí) a drobné spacing rozdíly. Strukturálně a funkčně je vše v pořádku.

Největší vizuální rozdíl celého webu je v **Hero sekci na homepage** (Task #1), ne v Header/Footer.

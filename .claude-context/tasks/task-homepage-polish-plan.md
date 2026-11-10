# Plán: Vizuální polish homepage podle mockupu

**Soubor:** `src/app/(public)/page.tsx`
**Mockup:** `.brand/brand/qsport-brand/web/navrh-webu/web-home.png`
**Brief:** `.claude-context/tasks/qsport-brand-brief.md`

---

## Souhrn hlavních rozdílů mockup vs. aktuální kód

Mockup ukazuje výrazně bohatší Hero sekci s produktem na pastelu + badge "BESTSELLER" + cenovkou (lime kruh), sekci "Série" s navy panelem vlevo a 2 product cardami, a skutečnými IG příspěvky v Instagram gridu. Aktuální kód má zjednodušený textový Hero bez produktu, správné sekce ale s drobnými odchylkami v rozměrech a stylingu.

---

## 1. HERO SEKCE — zásadní přepracování

### Aktuální stav:
- Jednoduchý navy pruh s textem "Venku je tvoje hřiště." a jedním lime tlačítkem "Nakupovat"
- Žádný produkt, žádný obrázek, žádná cenovka

### Mockup ukazuje:
- Navy pozadí přes celou šířku
- Levá strana: subheading "NOVÁ SEZÓNA · ON WATERPROOF" (lime barva, uppercase, 10px), velký nadpis "On do každého počasí." (~48-56px, white, extrabold), popis "Nepromokavé boty na trail i do města. Déšť? Bláto? Pohoda." (14px white/50), DVĚ tlačítka: "NAKUPOVAT" (lime fill) + "VŠECHNY ON" (white border/outline)
- Pravá strana: produktová fotka na pastel pozadí (mint) v zaoblenému boxu, s badge "BESTSELLER" (lime pill vlevo nahoře) a lime cenovkou kruhem "3 969 Kč" (vpravo dole)

### Implementační plán:

```
Soubor: src/app/(public)/page.tsx — sekce 1. Hero
```

**a) Layout:**
- Změnit z flex-col/flex-row na `grid grid-cols-1 lg:grid-cols-[1fr_1fr]` nebo `lg:grid-cols-2`
- Padding: `py-12 lg:py-16` (více prostoru)
- Gap: `gap-8`

**b) Levá strana — text:**
- Přidat subheading: `<div className="text-[10px] font-bold uppercase tracking-[0.12em] text-lime mb-3">Nová sezóna · On Waterproof</div>`
- Nadpis: zvětšit na `text-[36px] lg:text-[52px]` (mockup je výrazně větší), zachovat "On do každého počasí." s lime podtržením na "každého počasí."
- Popis pod nadpisem: `text-[14px] text-white/50 font-medium max-w-[420px]` — "Nepromokavé boty na trail i do města. Déšť? Bláto? Pohoda."
- DVĚ tlačítka vedle sebe (`flex gap-3 mt-6`):
  - "Nakupovat" — `bg-lime text-navy text-[12px] font-extrabold uppercase tracking-[0.12em] h-11 px-8 rounded-[var(--radius-pill)]`
  - "Všechny On" — `border border-white/30 text-white text-[12px] font-extrabold uppercase tracking-[0.12em] h-11 px-8 rounded-[var(--radius-pill)] hover:bg-white/10`

**c) Pravá strana — produkt:**
- Kontejner: `relative bg-mint rounded-[10px] aspect-[4/3] overflow-hidden` (nebo aspect-[3/2])
- Produkt fotka: `<Image>` s `object-contain`, `mix-blend-mode: multiply`
- Badge "BESTSELLER": absolutně pozicovaný vlevo nahoře — `absolute top-4 left-4 bg-lime text-navy text-[10px] font-extrabold uppercase tracking-[0.08em] px-3 py-1 rounded-[var(--radius-pill)]`
- Lime cenovka kruh: absolutně vpravo dole — `absolute bottom-4 right-4 w-[72px] h-[72px] bg-lime rounded-full flex flex-col items-center justify-center`
  - Cena: `text-[16px] font-extrabold text-navy`
  - "Kč": `text-[10px] font-bold text-navy/60`

**d) Datový zdroj:**
- Hero produkt potřebuje buď:
  - Hardcoded featured produkt (nejjednodušší) — slug v konstantě
  - Nebo nový Prisma dotaz `prisma.product.findFirst({ where: { featured: true } })` (pokud existuje pole featured)
  - Doporučení: použít `bestsellers[0]` z již načtených dat — nejjednodušší

**e) Mobilní verze (z web-mobil.png):**
- Na mobilu Hero zabere celou šířku: nadpis nahoře, pod ním produkt na mint pozadí s BESTSELLER badge, pod ním full-width lime "NAKUPOVAT" tlačítko
- `flex-col` na mobilu, `grid-cols-2` na `lg:`
- Tlačítko "Všechny On" skryto na mobilu (`hidden lg:inline-flex`)
- Mobilní nadpis: `text-[32px]`

---

## 2. PRÉMIOVÉ ZNAČKY — drobné ladění

### Aktuální stav: ✅ Většinou OK
### Drobné rozdíly:
- Mockup má značky výrazně větší (textově, ne jako SVG ikony) — "On", "POC" vypadají jako text/wordmarks ~20-30px výšky
- Aktuální kód: `grayscale opacity-50` — **OK, odpovídá**
- Mockup nemá explicitní limetkovou linku dole

### Změny:
- Logo výšky zvýšit: `className="h-[24px] lg:h-[36px]"` (z 20/30 na 24/36)
- Padding: `py-10` (z py-8) — více prostoru
- Případně přidat `overflow-x-auto` pro mobil scroll

---

## 3. BESTSELLERY "Co teď frčí." — malé úpravy

### Aktuální stav: ✅ Většinou OK, grid 4 karty
### Rozdíly z mockupu:
- Mockup: "ZOBRAZIT VŠE" tlačítko je vpravo nahoře na stejné úrovni s "Co teď frčí." — **aktuální kód to má**, ale `flex items-end mb-1` by měl být `flex items-baseline` nebo `items-center`
- Mockup: badge "BESTSELLER" na prvním produktu, "NOVINKA" na třetím, "-10 %" na čtvrtém — **kód to řeší**
- Mockup ukazuje 4 karty na řádek — **kód to má** `grid-cols-2 lg:grid-cols-4`

### Změny:
- `mb-1` → `mb-0` na section header divě (titulky jsou blíž ke kartám)
- Přidat marginTop na "Zobrazit vše" button: zarovnat `items-center` místo `items-end`
- Section padding: `pt-14 pb-12` → `pt-16 pb-14`

---

## 4. KATEGORIE "Venku je tvoje hřiště." — layout ladění

### Aktuální stav:
- Grid `lg:grid-cols-[1.2fr_1fr_1fr]` s row-span-2 pro Běh
- 6 kategorií: Běh (velký), Hory a outdoor, Zima, Oblečení, Doplňky, Bazar

### Mockup ukazuje:
- Přesně stejný layout: Běh (velký vlevo, row-span-2), Zima + Oblečení (vpravo nahoře), Batohy + Bazar (vpravo dole)
- **Poznámka:** Mockup má "Batohy" místo "Doplňky" — v kódu je "Doplňky" ale to je správně (web nemá kategorii Batohy, ale Doplňky)
- Bazar je plný řádek dole (`col-span-3`)

### Rozdíly:
- Mockup: kategorie karty mají produktové fotky (boty, bundy, helmy) jako pozadí, ne SVG ikony
- Aktuální kód: SVG ikony s opacity-30 — to je OK jako fallback, ale ideálně by tam byly reálné produktové fotky
- Mockup: "Nakupovat →" link text je konzistentní — **kód to má**

### Změny:
- Grid gap: `gap-3` → `gap-4` (o trochu více)
- Zaoblení: `rounded-[10px]` — **OK**
- Bazar: přidat `min-h-[100px]` místo `min-h-[120px]` — kompaktnější
- Zvážit: nahrazení SVG ikon za reálné produktové fotky v budoucnu (ne v tomto tasku, vyžaduje data)

---

## 5. SÉRIE/AKCE — "Teplo i v minusech." — OK s drobnými úpravami

### Aktuální stav: ✅ Navy panel vlevo + 2 product karty vpravo
### Mockup: Přesně to — navy info panel + 2 velké karty s badge

### Rozdíly:
- Mockup: nad navy panelem je malý subheading "SÉRIE · POC NA ZIMU" — **kód to má**
- Mockup: navy panel má větší padding a tlačítko "VYBRAT POC" s border — **kód to má**
- Mockup: produkty vpravo mají lime cenovku kruh (jako v hero) a badge "-10 %", "SLEVA"

### Změny:
- Grid: `lg:grid-cols-[1fr_2fr]` — **OK**
- Přidat nad sekci subheading row: `<div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1">Série</div>` + H2 — momentálně nemá section heading, přidat
- Product karty: standardní `<ProductCard>` se o cenovku a badge stará automaticky

---

## 6. PROČ QSPORT — "Výkon bez kompromisů." — OK

### Aktuální stav: ✅ 3 boxy na bg-wash s čísly 01/02/03
### Mockup: Přesně odpovídá

### Změny:
- Žádné zásadní — layout, barvy i texty sedí
- Volitelně: `min-h-[140px]` → `min-h-[160px]` pro lepší proporce na desktopu

---

## 7. INSTAGRAM — "Sleduj nás na Instagramu."

### Aktuální stav:
- Placeholder boxy "IG" na bg-wash — 6 boxů v gridu 3/6

### Mockup ukazuje:
- Skutečné IG příspěvky jako obrázky — carousel/grid s reálným obsahem
- Různé typy: produktové fotky, story-style, textové grafiky

### Změny:
- Prozatím ponechat placeholdery (IG feed integrace je samostatný task)
- Přidat do placeholderů `text-muted` místo `text-line` pro lepší viditelnost
- Zvážit: větší placeholder obsah — ikona Instagramu místo "IG" textu
- Grid: `grid-cols-3 sm:grid-cols-6` — **OK, odpovídá mockupu**

---

## 8. NEWSLETTER — navy pruh

### Aktuální stav: ✅ Odpovídá mockupu
### Mockup: Navy pruh, text vlevo, email + "PŘIHLÁSIT" vpravo

### Změny:
- Žádné — `NewsletterForm` komponenta a layout odpovídá

---

## 9. BLOG "Ze světa sportu." — chybí v mockupu?

### Aktuální stav:
- Blog sekce existuje s `BlogCard` komponentami

### Mockup:
- Mockup blog sekci explicitně neukazuje (možná je pod IG)
- Brand brief ji zmiňuje — ponechat

### Změny:
- Žádné — zachovat stávající implementaci

---

## Prioritní pořadí implementace

| # | Změna | Náročnost | Dopad |
|---|-------|-----------|-------|
| 1 | **Hero sekce kompletní přepracování** | VYSOKÁ | Vizuálně nejvýznamnější |
| 2 | Prémiové značky — zvětšení log | NÍZKÁ | Drobný polish |
| 3 | Bestsellery — zarovnání headeru | NÍZKÁ | Drobný polish |
| 4 | Kategorie — gap + fotky budoucně | STŘEDNÍ | Proporce |
| 5 | Série sekce — přidat section heading | NÍZKÁ | Konzistence |
| 6 | Instagram — lepší placeholdery | NÍZKÁ | Vizuální |
| 7 | Proč Qsport — výška boxů | NÍZKÁ | Drobný polish |

---

## Konkrétní CSS třídy ke změně

### Hero (řádky ~71-94):
```diff
- <section className="bg-navy text-white">
-   <div className="max-w-[var(--container)] mx-auto px-6 py-10 lg:py-12 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6">
+ <section className="bg-navy text-white">
+   <div className="max-w-[var(--container)] mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
```

- Nadpis: `text-[32px] lg:text-[36px]` → `text-[36px] lg:text-[52px]`
- Přidat lime subheading nad nadpis
- Přidat popis pod nadpis
- Přidat druhé tlačítko (outline white)
- Přidat pravý sloupec s produktem na pastel bg + badge + cenovka

### Značky (řádek ~119):
- Logo výška: `h-[20px] lg:h-[30px]` → `h-[24px] lg:h-[36px]`
- Section padding: `py-8` → `py-10`

### Bestsellery (řádek ~129):
- Items alignment: `items-end` → `items-center`

### Kategorie (řádek ~167):
- Gap: `gap-3` → `gap-4`

### Série (řádky ~216+):
- Přidat section heading before grid

### Proč Qsport (řádek ~257):
- Min-height: `min-h-[140px]` → `min-h-[160px]`

---

## Závislosti

- Hero přepracování vyžaduje: produktovou fotku (z bestsellers[0] nebo featured product)
- Instagram: vyžaduje IG feed API (budoucí task, mimo scope)
- Kategorie fotky: vyžaduje produktové fotky per kategorie (budoucí vylepšení)

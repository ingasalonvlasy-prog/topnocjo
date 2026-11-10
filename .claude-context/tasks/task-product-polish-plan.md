# Task: Vizuální polish produkt detail

**Soubory k úpravě:**
- `src/app/(public)/produkt/[slug]/page.tsx` (hlavní stránka)
- `src/components/ProductGallery.tsx` (galerie s thumbnaily)
- `src/components/ProductActions.tsx` (velikosti + košík)
- `src/components/ProductTabs.tsx` (taby pod produktem)

**Referenční soubory (READ ONLY):**
- `.brand/navrh/navrh-webu/web-produkt.png` (mockup)
- `.claude-context/tasks/qsport-brand-brief.md` (brand brief)
- `prisma/schema.prisma` (DB schéma)

---

## Analýza: Co mockup ukazuje vs. aktuální stav

### BREADCRUMB — stav: HOTOVO (100%)
Mockup: `Domů / Běh / Nepromokavé boty / Cloudhorizon 2 Waterproof`
Aktuální kód: Domů / [kategorie] / [productType] / [název produktu]
Odpovídá mockupu.

### GALERIE (levý sloupec) — stav: HOTOVO (90%)
Mockup ukazuje:
- Velká hlavní fotka na pastel bg s badge "BESTSELLER" vlevo nahoře
- Pod hlavní fotkou: 4 thumbnaily v řadě

**Aktuální stav:** Odpovídá mockupu. ProductGallery má pastel bg, badge, thumbnaily pod hlavní fotkou. Mix-blend-mode: multiply je aplikován.

**Drobné úpravy:**
1. Badge v galerii — aktuálně zobrazuje VŽDY "Bestseller". V mockupu badge závisí na stavu produktu. Implementátor by měl zobrazovat badge jen když je relevantní (nový, sleva).
2. Thumbnail aktivní styl — mockup ukazuje silnější border na aktivním thumbnailu. Aktuální kód: `border-2 border-navy` vs `border-line`. Odpovídá.

### PRAVÝ SLOUPEC — INFO

#### Brand/kategorie breadcrumb — stav: HOTOVO (100%)
Mockup: `ON / NEPROMOKAVÉ BOTY / PÁNSKÉ` (modrý uppercase text)
Aktuální kód: `{brandName} / {categoryName} / {productType}` v `text-blue` uppercase. Odpovídá.

#### Název produktu — stav: HOTOVO (100%)
Mockup: velký tučný navy nadpis. Aktuální: `text-[28px] md:text-[40px] font-extrabold text-navy`. Odpovídá.

#### Cena — stav: HOTOVO (100%)
Mockup: `3 969 Kč` velký + `vč. DPH` malý. Aktuální kód přesně odpovídá.

#### Popis produktu — stav: HOTOVO (95%)
Mockup: `[Popis produktu z feedu – 2–3 krátké věty]`. Aktuální kód: ořezaný popis na 160 znaků. Odpovídá.

#### Velikosti (chips) — stav: HOTOVO (90%)
Mockup ukazuje:
- Label: "Vyber si velikost (EU)" + "Tabulka velikostí" link vpravo
- Chips: outlined, aktivní = navy filled, vyprodané = šedé/disabled

Aktuální kód v ProductActions: Přesně odpovídá. Má label, tabulku velikostí link, chips se správnými stavy.

**Drobná úprava:**
1. V mockupu vyprodaná velikost (40, 47) je jen lehce šedá bez čárkování. Aktuální kód má `line-through` + `cursor-not-allowed`. Mockup to NEMÁ přeškrtnuté — jen vybledlé.

#### "PŘIDAT DO KOŠÍKU" + srdíčko — stav: HOTOVO (95%)
Mockup: Velké navy tlačítko + srdíčko vpravo. Aktuální kód: AddToCartButton (navy pill) + WishlistButton. Odpovídá.

### TRUST LINES (Skladem / Doprava / Vrácení) — stav: HOTOVO (95%)
Mockup ukazuje 3 řádky s barevnými tečkami a oddělovači:
- Zelená tečka: "Skladem – odešleme [doba odeslání]"
- Modrá tečka: "Doprava od 49 Kč · nákup bez registrace"
- Zelená/limetkové tečka: "Vrácení zboží do [X] dní"

Aktuální kód má přesně tyto 3 řádky se správnými barvami teček a border oddělovači. Odpovídá mockupu.

### METAFIELD BOXY — stav: CHYBÍ (placeholder v kódu)
Mockup ukazuje 3 boxy pod trust lines:
- **TLUMENÍ** [metapole]
- **DROP** [metapole]
- **POVRCH** [metapole]

Aktuální kód má pouze komentář: `{/* Metafield boxes — only show when we have real metafield data */}`

**Problém:** V DB schématu NENÍ metafield tabulka ani pole na Product/Variant pro tlumení/drop/povrch. Tyto metadata nejsou v systému.

### TABS SEKCE — stav: HOTOVO (95%)
Mockup brief zmiňuje: Popis, Parametry, "Hodí se k tomu", Recenze.
Aktuální kód: Popis, Parametry, Recenze. Tab "Hodí se k tomu" chybí, ale related products jsou jako separátní sekce pod tabs.

---

## Implementační kroky (seřazeno dle priority)

### Krok 1: Odstranit hardcoded "Bestseller" badge z galerie
**Soubor:** `src/components/ProductGallery.tsx`

Aktuální kód VŽDY zobrazuje "Bestseller" badge:
```tsx
<span className="bg-lime text-navy ...">Bestseller</span>
```

Úprava: Přidat prop `badge` do ProductGallery a zobrazit jen pokud je přítomný.

```tsx
interface ProductGalleryProps {
  photos: string[];
  productName: string;
  pastelBg: string;
  discount: number | null;
  badge?: string | null;  // NOVÝ PROP
}
```

V JSX:
```tsx
{badge && (
  <span className="bg-lime text-navy text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[var(--radius-pill)]">
    {badge}
  </span>
)}
```

V `produkt/[slug]/page.tsx` nepředávat badge (nemáme data pro bestseller logiku):
```tsx
<ProductGallery
  photos={photos}
  productName={product.name}
  pastelBg={pastelBg}
  discount={discount}
  badge={null}
/>
```

### Krok 2: Opravit vyprodané velikosti — odstranit line-through
**Soubor:** `src/components/ProductActions.tsx`

Mockup ukazuje vyprodané velikosti jako vybledlé ale BEZ přeškrtnutí.

Změnit řádek ~53:
```tsx
// Aktuální:
: "border-line text-line bg-white cursor-not-allowed line-through"
// Nové:
: "border-line text-muted/40 bg-white cursor-not-allowed"
```

### Krok 3: Metafield boxy — připravit UI komponentu (bez dat)
**Soubor:** `src/app/(public)/produkt/[slug]/page.tsx`

Metafield data v DB neexistují. Dvě možnosti:

**Varianta A (doporučená):** Parsovat metafield data z `tags` JSON pole nebo `bodyHtml`:
- Některé feedy dodávají strukturovaná data v tagách
- Kontrola: přečíst reálné produkty z DB a zjistit formát tagů

**Varianta B:** Vytvořit Prisma model `ProductMetafield` (key/value store):
- Vyžaduje migraci DB
- Vyžaduje import bot úpravy

**Doporučení:** Odložit na budoucí iteraci. Komentář v kódu ponechat. Až budou metafield data dostupná (z feedu nebo ručního zadání), stačí zapnout UI.

Připravit komponentu pro budoucí použití:
```tsx
{/* Metafield boxy — zobrazit až budou data */}
{/* Mockup: 3 boxy v řadě — TLUMENÍ, DROP, POVRCH */}
{/* <div className="grid grid-cols-3 gap-3 mt-6">
  <div className="border border-line rounded-[var(--radius-card)] p-4">
    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-1">TLUMENÍ</div>
    <div className="text-[14px] font-bold text-ink">{metafield}</div>
  </div>
  ...
</div> */}
```

### Krok 4: Tab "Hodí se k tomu" vs. separátní sekce
**Stav:** Brand brief říká "Tabs: popis, parametry, Hodí se k tomu, podobné produkty". Aktuální kód má related products jako separátní `<section>` pod taby, ne jako tab. 

**Doporučení:** Ponechat separátní sekci. Je to lepší UX — related products jsou viditelné bez klikání na tab. Mockup v obrázku tuto sekci nezobrazuje (je mimo viewport), takže nelze přesně porovnat.

---

## Shrnutí: Co implementovat TEĎ vs. ODLOŽIT

### IMPLEMENTOVAT:
| # | Úprava | Soubor | Náročnost |
|---|--------|--------|-----------|
| 1 | Badge v galerii podmínit propem (ne hardcoded) | `ProductGallery.tsx` + `produkt/[slug]/page.tsx` | Malá |
| 2 | Vyprodané velikosti bez line-through | `ProductActions.tsx` | Malá |

### ODLOŽIT (chybí data):
| # | Úprava | Důvod odložení |
|---|--------|----------------|
| 3 | Metafield boxy (TLUMENÍ/DROP/POVRCH) | Chybí metafield data v DB/feedu |
| 4 | Badge logika (BESTSELLER/NOVINKA z reálných dat) | Chybí sales data |

---

## Celkové hodnocení

Produkt detail stránka je **velmi blízko mockupu** (90-95% shoda). Hlavní odchylky jsou:
1. Hardcoded "Bestseller" badge — rychlý fix
2. Line-through na vyprodaných velikostech — rychlý fix
3. Metafield boxy — vyžaduje data enrichment (budoucí iterace)

Stránka je jinak designově konzistentní s brand briefem: navy barvy, Manrope font, správné spacing, trust lines, galerie s pastel bg a thumbnaily.

---

## Kontrolní checklist před nasazením:
- [ ] ProductGallery badge se zobrazuje jen s validním badge propem
- [ ] Discount badge v galerii se zobrazuje jen při slevě
- [ ] Vyprodané velikosti jsou vybledlé ale nepřeškrtnuté
- [ ] Žádné TypeScript chyby
- [ ] Stránka funguje pro produkty bez fotek (placeholder)
- [ ] Stránka funguje pro produkty bez variant
- [ ] Trust lines mají správné barvy teček dle dostupnosti
- [ ] Breadcrumb navigace funguje správně

# TASK-030: Redesign produktové karty (detail stránka)

**Datum:** 2026-11-12
**Autor:** Plánovač agent
**Stav:** KOMPLETNÍ ANALÝZA

---

## 1. AKTUÁLNÍ STAV — AUDIT

### 1.1 Problémy identifikované uživatelem

1. **Popis tab** — jen holý text, žádné formátování, vypadá prázdně
2. **Parametry tab** — chudá tabulka (Brand, Typ, SKU ve 3 řádcích šedé tabulky)
3. **Celkový dojem** — karta vypadá nedodělaně, prázdně
4. **Duplicita** — pod popisem se znovu zobrazují Brand/Typ/SKU (ty samé co v Parametry tabu)

### 1.2 Data realita

**bodyHtml** — existuje u všech 50 produktů, ale je **minimální**: typicky 1 věta v `<p>` tagu:
```html
<p>Mizuno Morelia Neo IV je skvělou volbou pro každého sportovce. Kombinuje moderní technologie s pohodlím a stylem.</p>
```

**description** — krátký plaintext: `"Mizuno Morelia Neo IV - kvalitní kopačky od značky Mizuno."`

**Dostupná data na variantě:**
- `title` (velikost: "39", "40", ...)
- `size` (null u některých)
- `color` (null u většiny)
- `weight` (číslo v gramech — existuje!)
- `sku` (kód)
- `price`, `comparePrice`, `costPrice`
- `ownStock`, `supplierStock`

**Dostupná data na produktu:**
- `name`, `description`, `bodyHtml`
- `brand.name` (Mizuno, On Running, POC, Husky, Leki)
- `productType` (Kopačky, Běžecká obuv, Sálová obuv, Volejbalová obuv, Cyklo helma, Lyžařská bunda)
- `tags` — JSON array: `["kopačky"]`
- `photos` — JSON array

**Klíčový poznatek:** Obsah je z feedu a je chudý. Design musí vypadat dobře I S MÁLO DATY.

### 1.3 Aktuální soubory

| Soubor | Řádky | Role |
|--------|-------|------|
| `src/app/(public)/produkt/[slug]/page.tsx` | 276 | RSC — layout, breadcrumbs, galerie, info, taby |
| `src/components/ProductTabs.tsx` | 134 | Client — 3 taby: Popis/Parametry/Recenze |
| `src/components/ProductGallery.tsx` | 75 | Client — hlavní foto + thumbnails |
| `src/components/ProductActions.tsx` | 97 | Client — velikost chips + košík |
| `src/components/ShareButtons.tsx` | 92 | Client — FB/WhatsApp/copy link |
| `src/components/ReviewSection.tsx` | ~200 | Client — recenze s formulářem |

### 1.4 Aktuální layout

```
┌─────────────────────────────────────────────────┐
│ Breadcrumbs                                      │
├───────────────────────┬─────────────────────────┤
│ Gallery               │ Brand / Category / Type  │
│ (foto + thumbnails)   │ Product Name (H1)        │
│                       │ Stars (review summary)   │
│                       │ Price + compare price    │
│                       │ Description excerpt      │
│                       │ Size chips + Add to cart  │
│                       │ Trust lines (3 dots)     │
│                       │ Share buttons             │
├───────────────────────┴─────────────────────────┤
│ TABS: Popis | Parametry | Recenze               │
│                                                  │
│ [Popis tab]:                                     │
│   bodyHtml (1 věta) nebo description             │
│   ─── border ───                                │
│   Značka: Mizuno                                 │  ← DUPLICITA!
│   Typ: Kopačky                                   │  ← DUPLICITA!
│   SKU: QS-1001                                   │  ← DUPLICITA!
│                                                  │
│ [Parametry tab]:                                 │
│   ┌──────────┬──────────┐                        │
│   │ Značka   │ Mizuno   │ zebra rows             │
│   │ Typ      │ Kopačky  │                        │
│   │ SKU      │ QS-1001  │                        │
│   └──────────┴──────────┘                        │
├──────────────────────────────────────────────────┤
│ Related products (4 karty)                       │
│ Recently viewed                                  │
└──────────────────────────────────────────────────┘
```

### 1.5 Konkurenční analýza

**Bretton.cz** (sport/lyže, CZ trh):
- Popis: Otevírací odstavec + "Proč si ji vybrat" sekce s bold feature headers + explanační text
- Parametry: Plochý 2-sloupcový list (label: value), bez zebra pruhů, bez ikon
- Trust: "skladem > 10ks", klub discount badge, brand heritage sekce
- Graceful degradation: Typografie-driven — čistá, bez forced vizuálních elementů

**Best practices z předních CZ eshopů (Sportisimo, Alza, Mall):**
- Popis má feature boxy s ikonami (ikona + nadpis + popis)
- Parametry jsou gruppované do kategorií (Obecné, Rozměry, Materiál)
- "Highlights" sekce před taby — 3-4 klíčové vlastnosti s ikonami
- Trust badges: doprava, vrácení, garance, bezpečná platba

---

## 2. NAVRHOVANÝ DESIGN

### 2.1 Brand Colors & Layout

| Token | Hex | Použití |
|-------|-----|---------|
| **Navy** | `#0B1727` | Hlavní text, ikony v highlights, group headers |
| **Lime** | `#CEFF2F` | Accent — "Skladem" badge, hover efekty |
| **Blue** | `#3157FF` | Linky, aktivní tab indicator |
| **Sale** | `#C1121F` | Sleva / comparePrice |
| **Container** | `1320px` | `max-w-[1320px]` — celá stránka |

Tyto barvy jsou již definované v Tailwind jako `text-navy`, `bg-lime`, `text-blue`, `text-sale`. Highlights strip a parameter groupy je MUSÍ používat — žádné generické gray/blue.

### 2.2 Principy

1. **Prázdný prostor je lepší než fake obsah** — nebudem vymýšlet text, co nemáme
2. **Strukturovat to co máme** — i 1 věta popisu vypadá dobře v hezkém kontejneru
3. **Smazat duplicitu** — Brand/Typ/SKU jen v Parametrech, ne pod popisem
4. **Vizuální hierarchie** — feature highlights, ikony, boxy dávají pocit kompletnosti
5. **Graceful degradation** — komponenty se nezobrazí pokud nemají data

### 2.3 Nový layout

```
┌─────────────────────────────────────────────────┐
│ Breadcrumbs                                      │
├───────────────────────┬─────────────────────────┤
│ Gallery               │ Brand / Category / Type  │
│ (foto + thumbnails)   │ Product Name (H1)        │
│                       │ Stars (review summary)   │
│                       │ Price + compare price    │
│                       │ Description excerpt      │
│                       │ Size chips + Add to cart  │
│                       │ Trust lines (3 dots)     │
│                       │ Share buttons             │
├───────────────────────┴─────────────────────────┤
│                                                  │
│ ┌── HIGHLIGHTS (nové!) ─────────────────────┐   │
│ │  🏷 Značka        ⚡ Typ        📦 Skladem │   │
│ │  Mizuno           Kopačky       Expedice   │   │
│ │                                 1–3 dny    │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ TABS: Popis | Parametry | Recenze               │
│                                                  │
│ [Popis tab]:                                     │
│   bodyHtml v hezkém kontejneru                   │
│   (BEZ duplicitních Brand/Typ/SKU!)              │
│                                                  │
│ [Parametry tab]:                                 │
│   ┌─ Obecné ────────────────────────────────┐   │
│   │  Značka        Mizuno                    │   │
│   │  Typ           Kopačky                   │   │
│   │  Kategorie     Běh                       │   │
│   ├─ Velikosti & Varianty ──────────────────┤   │
│   │  Velikosti     39, 40, 41, 42, 43, 44   │   │
│   │  Hmotnost      433 g                     │   │
│   ├─ Identifikace ─────────────────────────┤   │
│   │  SKU           QS-1001                   │   │
│   │  Štítky        kopačky                   │   │
│   └─────────────────────────────────────────┘   │
│                                                  │
│ [Recenze tab]:                                   │
│   (beze změn)                                    │
├──────────────────────────────────────────────────┤
│ Related products                                  │
│ Recently viewed                                   │
└──────────────────────────────────────────────────┘
```

---

## 3. DETAILNÍ DESIGN — PO SEKCÍCH

### 3.1 Feature Highlights strip (NOVÉ)

Horizontální strip mezi pravým sloupcem a taby. 3-4 boxy vedle sebe.

```
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│  [tag icon]    │ │  [zap icon]    │ │  [ruler icon]  │ │  [truck icon]  │
│  ZNAČKA        │ │  TYP           │ │  VELIKOSTI     │ │  DOSTUPNOST    │
│  Mizuno        │ │  Kopačky       │ │  39 – 45       │ │  Skladem       │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
```

**Pravidla zobrazení:**
- Značka: vždy (vždy existuje)
- Typ: pokud `productType` existuje
- Velikosti: pokud > 1 varianta s `size`
- Hmotnost: pokud existuje `weight`
- Dostupnost: vždy (vypočítá se z stock)

**Design:**
```tsx
<div className="max-w-[var(--container)] mx-auto px-6 pb-8">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {highlights.map((h) => (
      <div key={h.label} className="flex items-start gap-3 p-4 bg-wash rounded-[10px]">
        <span className="w-9 h-9 rounded-full bg-navy/5 flex items-center justify-center text-navy shrink-0">
          {h.icon}
        </span>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted block">{h.label}</span>
          <span className="text-[14px] font-bold text-ink">{h.value}</span>
        </div>
      </div>
    ))}
  </div>
</div>
```

**Graceful degradation:** Pokud jsou jen 2 highlights → grid-cols-2 na mobilu i desktopu (flexibilní). Pokud jen 1 → full width karta.

### 3.2 Popis tab — redesign

**Aktuální problém:** Holý text + duplicitní Brand/Typ/SKU info.

**Řešení:**

1. **SMAZAT** — Brand/Typ/SKU info pod popisem (řádky 86-103 v ProductTabs.tsx). To patří do Parametrů.

2. **bodyHtml**: Pokud existuje a je delší než 1 odstavec → zobrazit v hezké typografii (existující styling je OK).

3. **bodyHtml je krátký (1 věta)**: Zobrazit v card kontejneru s ikonou, ne jako sirotčí odstavec:

```tsx
{/* Short description card */}
<div className="flex gap-4 p-5 bg-wash rounded-[10px] max-w-[700px]">
  <span className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy shrink-0">
    <InfoIcon />
  </span>
  <div>
    <h3 className="text-[14px] font-bold text-navy mb-1">O produktu</h3>
    <div
      className="text-[14px] leading-relaxed text-ink [&_p]:mb-0"
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  </div>
</div>
```

4. **Žádný popis** (bodyHtml i description null): Zobrazit minimální fallback:
```tsx
<div className="text-center py-8 text-muted">
  <p className="text-[14px]">Podrobný popis připravujeme.</p>
</div>
```

5. **Dlouhý popis** (reálný HTML s headingy): Zobrazit normálně s existujícím CSS stylingem (řádky 67-81). Ten styling je dobrý.

**Logika:**
```tsx
const isShortDescription = bodyHtml && bodyHtml.length < 300 && !bodyHtml.includes('<h');
const hasDescription = bodyHtml || description;

if (!hasDescription) → fallback "Podrobný popis připravujeme"
else if (isShortDescription) → card layout s ikonou
else → full HTML rendering (existující kód)
```

### 3.3 Parametry tab — redesign

**Aktuální problém:** Plochá zebra-stripe tabulka s 3-7 řádky. Vypadá chudě.

**Řešení: Groupované parametry s headers**

```tsx
{active === "parametry" && (
  <div className="max-w-[700px] space-y-6">
    {/* Obecné */}
    <ParameterGroup
      title="Obecné"
      icon={<TagIcon />}
      params={[
        { label: "Značka", value: brand },
        productType && { label: "Typ", value: productType },
        category && { label: "Kategorie", value: category },
      ].filter(Boolean)}
    />

    {/* Velikosti & Varianty */}
    {(sizes.length > 0 || colors.length > 0 || weight) && (
      <ParameterGroup
        title="Velikosti & varianty"
        icon={<RulerIcon />}
        params={[
          sizes.length > 0 && { label: "Velikosti", value: sizes.join(", ") },
          colors.length > 0 && { label: "Barvy", value: colors.join(", ") },
          weight && { label: "Hmotnost", value: `${weight} g` },
        ].filter(Boolean)}
      />
    )}

    {/* Identifikace */}
    {(sku || tagsList.length > 0) && (
      <ParameterGroup
        title="Identifikace"
        icon={<BarcodeIcon />}
        params={[
          sku && { label: "SKU", value: sku },
          tagsList.length > 0 && { label: "Štítky", value: tagsList.join(", ") },
        ].filter(Boolean)}
      />
    )}
  </div>
)}
```

**ParameterGroup komponenta:**
```tsx
function ParameterGroup({ title, icon, params }: {
  title: string;
  icon: React.ReactNode;
  params: { label: string; value: string }[];
}) {
  if (params.length === 0) return null;

  return (
    <div className="rounded-[10px] border border-line overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-wash border-b border-line">
        <span className="w-6 h-6 text-navy">{icon}</span>
        <h3 className="text-[13px] font-bold text-navy uppercase tracking-[0.06em]">{title}</h3>
      </div>
      {/* Rows */}
      {params.map((param, i) => (
        <div
          key={param.label}
          className={`grid grid-cols-[160px_1fr] gap-x-4 px-4 py-3 text-[14px] ${
            i % 2 === 0 ? "bg-white" : "bg-wash/50"
          }`}
        >
          <span className="text-muted font-medium">{param.label}</span>
          <span className="font-bold text-ink">{param.value}</span>
        </div>
      ))}
    </div>
  );
}
```

**Graceful degradation:** Groupy bez dat se nezobrazí. Pokud existuje jen 1 skupina → zobrazí se jen ta. Minimálně bude vždy "Obecné" se značkou.

### 3.4 Recenze tab — beze změn

ReviewSection funguje dobře, žádné změny potřeba.

---

## 4. PŘESNÉ ZMĚNY — PO SOUBORECH

### 4.1 `src/app/(public)/produkt/[slug]/page.tsx`

**Přidat Feature Highlights strip** (mezi ProductActions/ShareButtons a ProductTabs):

Nová sekce pod `</div>` (řádek 229, konec pravého sloupce) a nad `<ProductTabs>` (řádek 232):

```tsx
{/* Feature highlights strip */}
<section className="max-w-[var(--container)] mx-auto px-6 pb-8">
  <ProductHighlights
    brand={product.brand.name}
    productType={product.productType}
    variants={product.variants}
    bestAvailability={bestAvailability}
    category={category?.name || null}
  />
</section>
```

**Upravit ProductTabs props** — přidat `category`:
```tsx
<ProductTabs
  description={product.description}
  bodyHtml={product.bodyHtml}
  brand={product.brand.name}
  productType={product.productType}
  sku={product.variants[0]?.sku || null}
  variants={...}
  tags={product.tags}
  productId={product.id}
  reviewCount={reviewCount}
  category={category?.name || null}  // NOVÉ
/>
```

### 4.2 `src/components/ProductHighlights.tsx` (NOVÝ)

Feature highlights strip — server component (nebo klidně inline v page.tsx).

**~60 řádků.** Grid s highlight boxy. Ikony: SVG inline (tag, zap, ruler, truck).

Logika:
```tsx
const highlights = [];
highlights.push({ label: "Značka", value: brand, icon: <TagIcon /> });
if (productType) highlights.push({ label: "Typ", value: productType, icon: <CategoryIcon /> });

const sizes = [...new Set(variants.filter(v => v.size).map(v => v.size!))];
if (sizes.length > 1) {
  highlights.push({ label: "Velikosti", value: `${sizes[0]} – ${sizes[sizes.length - 1]}`, icon: <RulerIcon /> });
}

const weight = variants[0]?.weight;
if (weight) {
  highlights.push({ label: "Hmotnost", value: `${weight} g`, icon: <ScaleIcon /> });
}

// Availability - always show
const availLabel = bestAvailability === "in_stock"
  ? "Skladem"
  : bestAvailability === "on_order"
    ? "Na objednávku"
    : "Vyprodáno";
highlights.push({ label: "Dostupnost", value: availLabel, icon: <TruckIcon /> });
```

### 4.3 `src/components/ProductTabs.tsx` — REFAKTORING

**Interface změny:**
```tsx
interface ProductTabsProps {
  description: string | null;
  bodyHtml: string | null;
  brand: string;
  productType: string | null;
  sku: string | null;
  variants: { size?: string | null; color?: string | null; weight?: number | null; title: string }[];
  tags: string;
  productId: string;
  reviewCount: number;
  category: string | null;  // NOVÉ
}
```

**Popis tab — přepsat (řádky 63-104):**

1. SMAZAT řádky 86-103 (duplicitní Brand/Typ/SKU dl/dd pod popisem)
2. Přidat detekci krátkého popisu
3. Podmíněné renderování: krátký → card, dlouhý → full HTML, žádný → fallback

```tsx
{active === "popis" && (
  <div className="max-w-[700px]">
    {bodyHtml ? (
      isShortDescription ? (
        <ShortDescriptionCard bodyHtml={bodyHtml} />
      ) : (
        <div className="text-[14px] leading-relaxed text-ink ..." dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      )
    ) : description ? (
      <ShortDescriptionCard bodyHtml={`<p>${description}</p>`} />
    ) : (
      <div className="text-center py-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-wash flex items-center justify-center text-muted">
          <InfoIcon />
        </div>
        <p className="text-[14px] text-muted">Podrobný popis připravujeme.</p>
      </div>
    )}
  </div>
)}
```

**Parametry tab — přepsat (řádky 107-123):**

Nahradit plochý zebra list za groupované parametry s ParameterGroup komponentou (viz sekce 3.3).

**Přidat interní komponenty:**
- `ShortDescriptionCard` — card layout pro krátký popis
- `ParameterGroup` — seskupené parametry s header + ikonou

Tyto budou **inline v ProductTabs.tsx** (ne separate files) — jsou malé a specifické.

### 4.4 Žádné nové soubory kromě `ProductHighlights.tsx`

ProductHighlights může být buď:
- A) Nový soubor `src/components/ProductHighlights.tsx` (~60 řádků)
- B) Inline v `produkt/[slug]/page.tsx` (RSC, nepotřebuje client JS)

**Doporučení:** Varianta B — inline v page.tsx, protože je to jednoduchý grid bez state. Nepotřebuje `"use client"`.

---

## 5. IKONY

Všechny ikony jsou inline SVG, žádné externí závislosti. Konzistentní styl: `w-5 h-5`, `strokeWidth={1.5}`, `fill="none"`.

| Ikona | Kde | SVG základ |
|-------|-----|------------|
| Tag | Značka highlight | `<path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318..."/>` (Heroicons tag) |
| Zap/Category | Typ highlight | `<path d="M3.75 6A2.25 2.25 0 016 3.75h2.25..."/>` (Heroicons squares) |
| Ruler | Velikosti highlight + group | Custom ruler icon |
| Scale | Hmotnost highlight | `<path d="M12 3v17.25..."/>` (Heroicons scale) |
| Truck | Dostupnost highlight | Existing truck/shipping icon |
| Info | Popis card | `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>` |
| Barcode | Identifikace group | `<path d="M3.75 4.875c0-.621.504-1.125..."/>` (Heroicons barcode) |

---

## 6. GRACEFUL DEGRADATION — SCÉNÁŘE

### 6.1 Plný produkt (všechna data)

Highlight strip: 5 boxů (značka, typ, velikosti, hmotnost, dostupnost)
Popis: Plný HTML rendering s H2/H3/lists
Parametry: 3 groupy (Obecné, Velikosti & varianty, Identifikace)

### 6.2 Minimální produkt (jen značka + 1 věta popisu + velikosti)

Highlight strip: 3 boxy (značka, velikosti, dostupnost)
Popis: Card layout s ikonou — 1 věta vypadá záměrně
Parametry: 2 groupy (Obecné s 1 řádkem, Identifikace pokud má SKU)

### 6.3 Produkt bez popisu

Highlight strip: normálně
Popis: Fallback "Podrobný popis připravujeme." s ikonou — vypadá záměrně, ne broken
Parametry: normálně

### 6.4 Produkt bez velikostí (1 varianta "Default")

Highlight strip: bez "Velikosti" boxu → 3-4 boxy
Parametry: bez "Velikosti & varianty" groupy (pokud nemá ani hmotnost)

---

## 7. VIZUÁLNÍ POROVNÁNÍ

### PŘED (aktuální):
```
[Popis tab]
Mizuno Morelia Neo IV je skvělou volbou pro každého sportovce.
Kombinuje moderní technologie s pohodlím a stylem.
───────────────────────
Značka    Mizuno          ← DUPLICITA
Typ       Kopačky         ← DUPLICITA
SKU       QS-1001         ← DUPLICITA

[Parametry tab]
┌─────────────────────────┐
│ Značka   │ Mizuno       │  ← 3 řádky v šedé tabulce
│ Typ      │ Kopačky      │
│ SKU      │ QS-1001      │
└─────────────────────────┘
```

### PO (nový design):
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 🏷 ZNAČKA │ │ ⚡ TYP   │ │ 📏 VEL.  │ │ 🚚 SKLAD │
│ Mizuno   │ │ Kopačky  │ │ 39 – 45  │ │ Skladem  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

[Popis tab]
┌─────────────────────────────────────────────┐
│ (i) O produktu                               │
│                                              │
│ Mizuno Morelia Neo IV je skvělou volbou      │
│ pro každého sportovce. Kombinuje moderní     │
│ technologie s pohodlím a stylem.             │
└─────────────────────────────────────────────┘

[Parametry tab]
┌─ 🏷 OBECNÉ ────────────────────────────────┐
│  Značka        Mizuno                       │
│  Typ           Kopačky                      │
├─ 📏 VELIKOSTI & VARIANTY ─────────────────┤
│  Velikosti     39, 40, 41, 42, 43, 44, 45  │
│  Hmotnost      433 g                        │
├─ 🔤 IDENTIFIKACE ─────────────────────────┤
│  SKU           QS-1001                      │
│  Štítky        kopačky                      │
└─────────────────────────────────────────────┘
```

---

## 8. KONTROLNÍ SEZNAM

### Změny:
- [ ] Přidat Feature Highlights strip do `produkt/[slug]/page.tsx`
- [ ] `ProductTabs.tsx` — smazat duplicitní Brand/Typ/SKU pod popisem (řádky 86-103)
- [ ] `ProductTabs.tsx` — redesign Popis tab (krátký → card, dlouhý → HTML, žádný → fallback)
- [ ] `ProductTabs.tsx` — redesign Parametry tab (groupované s headers + ikony)
- [ ] Přidat `category` prop do ProductTabs
- [ ] Přidat `ParameterGroup` inline komponentu
- [ ] Přidat `ShortDescriptionCard` inline komponentu

### Volitelné (Fáze 2):
- [ ] `ProductHighlights.tsx` jako separátní komponentu (pokud chceme reusovat)
- [ ] Animace na tab switch (framer-motion fade)

### QA:
- [ ] Produkt s plným popisem — HTML rendering funguje
- [ ] Produkt s krátkým popisem (1 věta) — card layout
- [ ] Produkt bez popisu — fallback "Podrobný popis připravujeme"
- [ ] Parametry — groupy se nezobrazí bez dat
- [ ] Parametry — zebra striping v groupách
- [ ] Highlights — adaptivní grid (2-5 boxů)
- [ ] Mobile responsivita — highlights 2 sloupce
- [ ] Žádná duplicita Brand/Typ/SKU
- [ ] `npm run build` — žádné TS chyby

---

## 9. SOUHRN

| Co | Rozsah |
|----|--------|
| **page.tsx** | ~20 řádků přidat (highlights inline) |
| **ProductTabs.tsx** | ~50 řádků smazat (duplicita + stará parametry), ~80 řádků přidat (nové komponenty) |
| **Celkem** | ~70 řádků smazat, ~100 řádků přidat. Net: +30 řádků |

**Klíčová změna:** Design vypadá kompletně i s málo daty. Highlights strip dává vizuální strukturu. Groupované parametry vypadají profesionálně i s 3 řádky. Krátký popis v card kontejneru vypadá záměrně, ne prázdně.

**Žádné nové DB fieldy, žádné změny backendu.** Čistě frontend redesign.

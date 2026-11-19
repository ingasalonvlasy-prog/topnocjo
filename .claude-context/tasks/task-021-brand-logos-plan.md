# TASK #21: Značky — doplnit loga (199 z 203 chybí)

**Status:** Plan ready for implementation
**Priorita:** STREDNI

---

## VYSETROVANI

### Stav v DB
- **203 znacek celkem** (s alespon 1 aktivnim produktem na /znacky strance)
- **4 maji logo v DB:** Mizuno (`/brands/mizuno.svg`), POC (`/brands/poc.svg`), Leki (`/brands/leki.svg`), On Running (`/brands/on.svg`)
- **199 nema logo** — zobrazuji se jako velke pismeno na pastel pozadi

### Stav souboru
`public/brands/` obsahuje **6 SVG souboru:**
- `mizuno.svg` (18 KB) — v DB ✓
- `poc.svg` (688 B) — v DB ✓
- `leki.svg` (1 KB) — v DB ✓
- `on.svg` (2 KB) — v DB ✓
- `alpina.svg` (5 KB) — v DB CHYBI (soubor existuje, ale brand nema `logo` nastaven)
- `maloja.svg` (14 KB) — v DB CHYBI (soubor existuje, ale brand nema `logo` nastaven)

### Proc loga chybi
Shopify API nema logo pro vendory — `vendor` je jen textovy retezec. Shopify import (`scripts/import-shopify.ts:403-427`) vytvari brand s `name`, `nameSearch`, `slug` — **BEZ loga**. 4 loga byla pridana RUCNE po importu.

### Aktualni placeholder design
`src/app/(public)/znacky/page.tsx:69-80`:
```tsx
{brand.logo ? (
  <Image src={brand.logo} alt={brand.name} width={120} height={60}
    className="object-contain max-h-[60px] w-auto mix-blend-multiply" />
) : (
  <span className="text-[36px] font-extrabold text-navy/60">{brand.name[0]}</span>
)}
```
Bez loga = velke pismeno (prvni znak nazvu) na pastel pozadi (mint/sky/peach/lilac rotace).

### TOP znacky bez loga (dle poctu produktu)
| Znacka | Produkty | Priorita |
|--------|----------|----------|
| On | 1475 | VYSOKA — 3. nejvetsi znacka! |
| Mico | 569 | vysoka |
| Swix Hardgoods | 382 | vysoka |
| Swix Textile | 342 | vysoka |
| Stance | 295 | vysoka |
| Star Ski Wax | 231 | stredni |
| SWANS | 217 | stredni |
| Sporten | 105 | stredni |
| Alpina | 104 | stredni (SVG uz existuje!) |
| CMP Campagnolo | 92 | stredni |
| Maloja | 81 | stredni (SVG uz existuje!) |

**POZNAMKA:** Znacka "On" (1475 produktu) a "On Running" (s logem) jsou RUZNE zaznamy v DB! "On" je z importu, "On Running" bylo manualne pridano. To je problem — merge needed.

---

## IMPLEMENTACNI PLAN

### Krok 1: OKAMZITE — Opravit 2 chybejici loga v DB (2 min)

Soubory `alpina.svg` a `maloja.svg` uz existuji v `public/brands/` ale nejsou propojene v DB.

**SQL:**
```sql
UPDATE brands SET logo = '/brands/alpina.svg' WHERE slug = 'alpina';
UPDATE brands SET logo = '/brands/maloja.svg' WHERE slug = 'maloja';
```

**Nebo Prisma skript:**
```ts
await prisma.brand.update({ where: { slug: 'alpina' }, data: { logo: '/brands/alpina.svg' } });
await prisma.brand.update({ where: { slug: 'maloja' }, data: { logo: '/brands/maloja.svg' } });
```

### Krok 2: Vylepsit placeholder design (20 min)

Misto velkeho pismena na pastel pozadi → cistejsi text-only design. AboutYou styl:

**NAVRH A — Plny nazev misto pismena:**
```tsx
// BEFORE:
<span className="text-[36px] font-extrabold text-navy/60">{brand.name[0]}</span>

// AFTER:
<span className="text-[18px] lg:text-[22px] font-extrabold text-navy/40 uppercase tracking-wide leading-tight text-center px-3">
  {brand.name}
</span>
```
Zobrazi plny nazev znacky (napr. "CRAFT") misto jen "C". Cistejsi, informativnejsi.

**NAVRH B — Bez pastel pozadi, border-only styl:**
```tsx
// Zmenit z pastel bg boxu na prazdny box s borderem
<div className="w-full aspect-[3/2] border-2 border-dashed border-line rounded-[8px] flex items-center justify-center">
  <span className="text-[16px] font-bold text-muted uppercase tracking-wider">
    {brand.name}
  </span>
</div>
```

**DOPORUCENI:** Navrh A — plny nazev na pastel pozadi. Pastel pozadi dava barvu a vizualni zajimavost, plny nazev je informativnejsi nez jedno pismeno.

### Krok 3: Generovat SVG loga pro top 20 znacek (45 min)

Pro nejvetsich 20 znacek bez loga vytvorit jednoduche text-based SVG loga. Tyto znacky maji desitky az stovky produktu — zaslouzí si profi vzhled.

**Pristup:** Generovat SVG s nazvem znacky ve fontu ktery pripomina jeji vizualni identitu.

**Skript:** `scripts/generate-brand-logos.ts`
```ts
import fs from "fs";

const brands = [
  { slug: "on", name: "On", style: "modern" },
  { slug: "mico", name: "Mico", style: "sport" },
  { slug: "swix-hardgoods", name: "SWIX", style: "bold" },
  { slug: "swix-textile", name: "SWIX", style: "bold" },
  { slug: "stance", name: "Stance", style: "modern" },
  { slug: "star-ski-wax", name: "Star Ski Wax", style: "sport" },
  { slug: "swans", name: "SWANS", style: "bold" },
  { slug: "sporten", name: "Sporten", style: "sport" },
  { slug: "cmp-campagnolo", name: "CMP", style: "bold" },
  { slug: "high-peak", name: "High Peak", style: "modern" },
  { slug: "ulvang", name: "Ulvang", style: "modern" },
  { slug: "toko", name: "Toko", style: "sport" },
  { slug: "hatchey", name: "Hatchey", style: "sport" },
  { slug: "kjus", name: "Kjus", style: "modern" },
  { slug: "craft", name: "Craft", style: "bold" },
  { slug: "eisbar", name: "Eisbär", style: "modern" },
  { slug: "reima", name: "Reima", style: "sport" },
  { slug: "buff", name: "BUFF", style: "bold" },
  { slug: "colmar", name: "Colmar", style: "modern" },
  { slug: "head", name: "HEAD", style: "bold" },
];

function generateSvg(name: string): string {
  const width = 200;
  const height = 80;
  const fontSize = name.length > 10 ? 22 : name.length > 6 ? 28 : 36;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="${fontSize}" font-weight="800" fill="#0B1727"
    letter-spacing="0.05em">${name.toUpperCase()}</text>
</svg>`;
}

for (const brand of brands) {
  const svg = generateSvg(brand.name);
  fs.writeFileSync(`public/brands/${brand.slug}.svg`, svg);
  console.log(`Generated: ${brand.slug}.svg`);
}
```

Pak update DB:
```ts
for (const brand of brands) {
  await prisma.brand.update({
    where: { slug: brand.slug },
    data: { logo: `/brands/${brand.slug}.svg` },
  });
}
```

**POZNAMKA:** Text-based SVG loga jsou placeholder. Idealni je ziskat oficialni loga od znacek. Ale text SVG je 100x lepsi nez velke pismeno na pastel pozadi.

### Krok 4: (OPTIONAL) Merge "On" a "On Running" znacek

V DB jsou DVE znacky:
- `on` (slug) — 1475 produktu, BEZ loga
- `on-running` (slug) — logo `/brands/on.svg`, ale pravdepodobne 0 produktu

Meli by byt JEDNA znacka. Plan:
```sql
-- Presunout produkty z "on" na "on-running" (ktera ma logo)
UPDATE products SET brandId = (SELECT id FROM brands WHERE slug = 'on-running')
  WHERE brandId = (SELECT id FROM brands WHERE slug = 'on');
-- Smazat prazdnou "on" znacku
DELETE FROM brands WHERE slug = 'on';
-- Prejmenovet on-running na "On"
UPDATE brands SET name = 'On', slug = 'on' WHERE slug = 'on-running';
```

Nebo jednodussi: pridat logo na existujici `on` znacku a smazat `on-running`.

### Krok 5: (OPTIONAL) Smerovat znacky bez produktu na /znacky

Nektere znacky v DB maji 0 aktivnich produktu (napr. cyklo znacky co prisly ze Shopify ale nemaji ACTIVE produkty). Stranky `/znacky` uz filtruje jen `products: { some: { status: "ACTIVE" } }` — to je OK. Ale `/znacky/[slug]` by mohla ukazat prazdnou stranku.

---

## SOUBORY K IMPLEMENTACI

| Soubor | Akce | Krok | Popis |
|--------|------|------|-------|
| (Turso DB) | SQL UPDATE | 1 | Propojit alpina.svg a maloja.svg |
| `src/app/(public)/znacky/page.tsx` | EDIT | 2 | Vylepsit placeholder (plny nazev misto pismena) |
| `scripts/generate-brand-logos.ts` | NEW | 3 | Generator text-based SVG log |
| `public/brands/*.svg` | NEW (20 souboru) | 3 | SVG loga pro top 20 znacek |
| (Turso DB) | SQL UPDATE | 3 | Propojit nova loga v DB |
| (Turso DB) | SQL MERGE | 4 | Merge On + On Running |

---

## DOPORUCENI POSTUP

1. **Krok 1** (2 min) — fix 2 chybejici loga (uz existuji jako soubory)
2. **Krok 2** (20 min) — vylepsit placeholder na plny nazev
3. **Krok 4** (5 min) — merge On/On Running
4. **Krok 3** (45 min) — generovat SVG pro top 20 znacek

Kroky 1+2+4 jsou nejdulezitejsi. Krok 3 je nice-to-have.

---

## KLICOVA OTAZKA PRO UZIVATELE

> Ma uzivatel oficialni loga znacek (SVG/PNG)? Pokud ano, muzeme je uploadnout do `public/brands/` a propojit v DB. To je VZDY lepsi nez text-based SVG.

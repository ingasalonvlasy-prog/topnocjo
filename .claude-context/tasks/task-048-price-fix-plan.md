# TASK-048: Ceny haléře vs CZK — konzistence celého systému

## Analýza: Současný stav

### ROZHODNUTÍ: Všechny ceny v DB v HALÉŘÍCH (×100)

To je e-shop standard (Stripe, Comgate, atd.). `6490 Kč` = `649000` v DB.

---

## Kompletní audit všech cenových cest

### A) Zápis cen do DB (vstupní body)

| Zdroj | Soubor | Jak ukládá | Status |
|-------|--------|------------|--------|
| **Admin product form** | `src/app/(admin)/admin/produkty/[id]/page.tsx:80` | `parseFloat(price) * 100` | HALÉŘE ✓ |
| **Admin product form (compare)** | `src/app/(admin)/admin/produkty/[id]/page.tsx:81-91` | `parseFloat(comparePrice) * 100` | HALÉŘE ✓ |
| **Admin product form display** | `:316` | `defaultValue={(v.price / 100).toFixed(0)}` | Zobrazí CZK, uloží haléře ✓ |
| **Feed importer** | `src/lib/feed/parsers/shared.ts:27-29` | `priceInCents ? round(price) : round(price * 100)` | HALÉŘE ✓ |
| **Feed importer (existing update)** | `src/lib/feed/importer.ts:26` | `price: item.price` (already in cents from parser) | HALÉŘE ✓ |
| **Seed data** | `prisma/seed.ts:148` | `price: def.basePrice` kde `basePrice: 6490` | CELÉ CZK ✗✗✗ |
| **Shopify import** | `scripts/shopify-import.ts` | `Math.round(parseFloat(price) * 100)` | HALÉŘE ✓ |
| **Admin shipping form** | `src/app/(admin)/admin/doprava/[id]/page.tsx:28` | `parseInt(price, 10)` BEZ ×100 | CELÉ CZK ✗✗✗ |
| **Admin shipping freeFrom** | `src/app/(admin)/admin/doprava/[id]/page.tsx:30` | `parseInt(freeFromStr, 10)` BEZ ×100 | CELÉ CZK ✗✗✗ |
| **Admin discount (fixed)** | `src/app/(admin)/admin/slevy/actions.ts:42` | `value * 100` | HALÉŘE ✓ |
| **Admin discount (minOrderAmount)** | `src/app/(admin)/admin/slevy/actions.ts:14` | `parseInt * 100` | HALÉŘE ✓ |

### B) Čtení cen z DB (výstupní body)

| Místo | Soubor | Jak zobrazuje | Status |
|-------|--------|---------------|--------|
| **formatPrice() — hlavní** | `src/lib/products.ts:203-208` | `Intl.format(amount)` — NEDĚLÍ /100! | ✗✗✗ KRITICKÉ |
| **formatPrice() — email order-confirmation** | `src/lib/emails/order-confirmation.tsx:36-38` | `Intl.format(amount)` — NEDĚLÍ /100! | ✗✗✗ |
| **formatPrice() — email abandoned-checkout** | `src/lib/emails/abandoned-checkout.tsx:20-22` | `Intl.format(amount)` — NEDĚLÍ /100! | ✗✗✗ |
| **formatPrice() — email payment-received** | `src/lib/emails/payment-received.tsx:12` | `Intl.format(amount)` — NEDĚLÍ /100! | ✗✗✗ |
| **formatPrice() — email admin-new-order** | `src/lib/emails/admin-new-order.tsx:33` | `Intl.format(amount)` — NEDĚLÍ /100! | ✗✗✗ |
| **formatPrice() — email order-cancelled** | `src/lib/emails/order-cancelled.tsx:11` | `Intl.format(amount)` — NEDĚLÍ /100! | ✗✗✗ |
| **formatPrice() — SearchAutocomplete** | `src/components/SearchAutocomplete.tsx:38` | `Intl.format(amount)` — NEDĚLÍ /100! | ✗✗✗ |
| **formatPrice() — HeroSearch** | `src/components/HeroSearch.tsx:14` | `Intl.format(amount)` — NEDĚLÍ /100! | ✗✗✗ |
| **Admin nastaveni shipping** | `src/app/(admin)/admin/nastaveni/page.tsx:143` | `(m.price / 100).toLocaleString()` | DĚLÍ /100 ✓ (ale shipping je v CZK → double-fix!) |
| **Admin doprava list** | `src/app/(admin)/admin/doprava/page.tsx:155` | `{m.price} Kč` — RAW číslo | Zobrazí raw ✗ |
| **Admin doprava list freeFrom** | `src/app/(admin)/admin/doprava/page.tsx:160` | `{m.freeFrom} Kč` — RAW číslo | Zobrazí raw ✗ |
| **Admin orders export** | `src/app/api/admin/orders/export/route.ts:73` | `(halere / 100).toFixed(2)` | DĚLÍ /100 ✓ |
| **Comgate payment** | `src/lib/comgate.ts:35` | `String(params.price)` — expects haléře | ✓ |
| **Discount validate minOrderAmount** | `src/app/api/discount/validate/route.ts:35` | `(discount.minOrderAmount / 100)` | DĚLÍ /100 ✓ |

### C) Checkout flow — výpočty

| Operace | Soubor | Jak počítá | Status |
|---------|--------|------------|--------|
| **Cart subtotal** | `src/lib/cart.tsx` | `sum(item.price * quantity)` | Závisí na DB ceně |
| **FREE_SHIPPING_THRESHOLD** | `src/app/(public)/kosik/page.tsx:10` | `200000` = "2000 Kč in haléře" | HALÉŘE ✓ |
| **Cart freeFrom comparison** | `src/lib/cart.tsx:156` | `subtotal >= freeFrom` | MIXED! subtotal v haléřích ale freeFrom v CZK ✗✗✗ |
| **Checkout shippingPrice** | `src/app/(public)/pokladna/actions.ts:120-123` | `freeFrom && subtotal >= freeFrom ? 0 : price` | MIXED ✗✗✗ |
| **Discount percentage** | `actions.ts:100` | `(subtotal * value) / 100` | ✓ (percentage OK) |
| **Discount fixed** | `actions.ts:102` | `discountAmount = discount.value` | ✓ (value stored in haléře) |
| **Order total** | `actions.ts:125` | `subtotal - discount + shippingPrice` | MIXED (shipping v CZK, rest v haléřích) ✗✗✗ |
| **Comgate call** | `actions.ts` | Sends `total` to Comgate | If total mixed → WRONG PAYMENT AMOUNT ✗✗✗ |

### D) Filter bar — cenové filtry

| Místo | Soubor | Hodnoty | Status |
|-------|--------|---------|--------|
| **FilterBar price ranges** | `src/components/FilterBar.tsx:13-15` | `{min: 0, max: 3000}`, `{min: 3000, max: 5000}`, `{min: 5000, max: 999999}` | CELÉ CZK ✗✗✗ |
| **URL params cena_od/cena_do** | FilterBar → searchParams | Posílá celé CZK hodnoty | ✗ |
| **Product filter** | `src/lib/products.ts:68-69` | `price: { gte: priceMin, lte: priceMax }` | Porovnává URL CZK s DB haléřemi ✗✗✗ |

---

## Kde je to ROZBITÉ teď (s importovanými Shopify daty v haléřích)

### 1. formatPrice() zobrazuje "649 000 Kč" místo "6 490 Kč"
- VŠUDE na webu — ProductCard, produkt detail, košík, pokladna, emaily
- Důvod: formatPrice() nedělí /100

### 2. Shipping srovnání nefunguje
- Košík: `subtotal (haléře) >= freeFrom (CZK)` → free shipping se aktivuje s 1% objednávky
- Příklad: freeFrom = 2000, subtotal = 328900 → "Doprava zdarma" (ale je to jen 3289 Kč)
- Paradoxně to "funguje" — doprava je zdarma od 2000 haléřů (20 Kč!)

### 3. Cenové filtry nefungují
- FilterBar posílá `cena_od=3000` (celé CZK)
- Prisma hledá `price >= 3000` v haléřích → najde vše nad 30 Kč = VŠECHNO
- "Nad 5000 Kč" najde vše nad 50 Kč

### 4. Comgate platba
- Order total = subtotal (haléře) - discount (haléře) + shippingPrice (CZK)
- Výsledná částka je mixed → špatná platba

### 5. Seed data produkty mají ceny 100× nižší než importované
- Seed: `6490` (celé CZK) vs Shopify import: `649000` (haléře)
- ProductCard zobrazí "6 490 Kč" (seed) vs "649 000 Kč" (import) — obojí špatně

---

## IMPLEMENTAČNÍ PLÁN

### FÁZE 1: formatPrice() — přidat /100 (KRITICKÉ)

**Soubor:** `src/lib/products.ts`

```ts
// PŘED:
export function formatPrice(amount: number): string {
  const formatted = new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted}\u00A0Kč`;
}

// PO:
export function formatPrice(amount: number): string {
  const czk = Math.round(amount / 100);
  const formatted = new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(czk);
  return `${formatted}\u00A0Kč`;
}
```

**PLUS:** Opravit všechny lokální kopie formatPrice:
- `src/lib/emails/order-confirmation.tsx:36` → přidat `/100`
- `src/lib/emails/abandoned-checkout.tsx:20` → přidat `/100`
- `src/lib/emails/payment-received.tsx:12` → přidat `/100`
- `src/lib/emails/admin-new-order.tsx:33` → přidat `/100`
- `src/lib/emails/order-cancelled.tsx:11` → přidat `/100`
- `src/components/SearchAutocomplete.tsx:38` → přidat `/100`
- `src/components/HeroSearch.tsx:14` → přidat `/100`

**IDEÁLNÍ REFAKTOR:** Smazat všechny lokální kopie, importovat z `@/lib/products`. Ale to vyžaduje řešení kompatibility (email komponenty nemají přístup na client code). Pro emaily nechat lokální kopii ale opravit.

### FÁZE 2: Shipping — ukládat v haléřích

**Soubor:** `src/app/(admin)/admin/doprava/[id]/page.tsx`

```ts
// PŘED:
const price = parseInt(formData.get("price") as string, 10) || 0;
const freeFrom = freeFromStr ? parseInt(freeFromStr, 10) || null : null;

// PO:
const price = Math.round(parseFloat(formData.get("price") as string) * 100) || 0;
const freeFrom = freeFromStr ? Math.round(parseFloat(freeFromStr) * 100) || null : null;
```

**Admin form display — zobrazit v CZK:**

```tsx
// PŘED:
defaultValue={method.price}

// PO:
defaultValue={method.price / 100}
```

A pro freeFrom:
```tsx
defaultValue={method.freeFrom ? method.freeFrom / 100 : ""}
```

**Admin doprava list display:**

```tsx
// PŘED (src/app/(admin)/admin/doprava/page.tsx:155):
<span className="font-medium text-gray-900">{m.price} Kč</span>
<span className="text-gray-500">Zdarma od {m.freeFrom} Kč</span>

// PO:
<span className="font-medium text-gray-900">{m.price / 100} Kč</span>
<span className="text-gray-500">Zdarma od {m.freeFrom / 100} Kč</span>
```

**Admin nastavení display:** Již dělí /100 → po migraci bude děleno 2× → ODEBRAT jedno /100:
```tsx
// src/app/(admin)/admin/nastaveni/page.tsx:143 — UŽ dělí /100
// Po migraci dat: zůstane OK (data budou v haléřích, /100 zobrazí CZK)
```

**MIGRACE EXISTUJÍCÍCH SHIPPING DAT:**

```sql
-- Převést existující shipping ceny z CZK na haléře
UPDATE shipping_methods SET price = price * 100 WHERE price > 0;
UPDATE shipping_methods SET "freeFrom" = "freeFrom" * 100 WHERE "freeFrom" IS NOT NULL;
```

Nebo v Prisma:
```ts
const methods = await prisma.shippingMethod.findMany();
for (const m of methods) {
  await prisma.shippingMethod.update({
    where: { id: m.id },
    data: {
      price: m.price * 100,
      freeFrom: m.freeFrom ? m.freeFrom * 100 : null,
    },
  });
}
```

### FÁZE 3: Seed data — převést na haléře

**Soubor:** `prisma/seed.ts`

```ts
// PŘED:
basePrice: 6490, comparePrice: 7990

// PO:
basePrice: 649000, comparePrice: 799000
```

Buď ručně přepsat všech ~50 produktů, nebo přidat multiplikátor:

```ts
// Na řádku 148:
price: def.basePrice * 100,
comparePrice: def.comparePrice ? def.comparePrice * 100 : null,
costPrice: Math.round(def.basePrice * 0.5) * 100,
```

**DOPORUČENÍ:** Přidat `* 100` na seed řádku 148 místo přepisování všech basePrice. Jednodušší a méně error-prone.

### FÁZE 4: FilterBar — cenové filtry v haléřích

**Soubor:** `src/components/FilterBar.tsx`

```ts
// PŘED:
const priceRanges = [
  { label: "Do 3 000 Kč", min: 0, max: 3000 },
  { label: "3 000 – 5 000 Kč", min: 3000, max: 5000 },
  { label: "Nad 5 000 Kč", min: 5000, max: 999999 },
];

// PO:
const priceRanges = [
  { label: "Do 3 000 Kč", min: 0, max: 300000 },
  { label: "3 000 – 5 000 Kč", min: 300000, max: 500000 },
  { label: "Nad 5 000 Kč", min: 500000, max: 99999900 },
];
```

### FÁZE 5: Ověření checkout flow

**Soubor:** `src/app/(public)/pokladna/actions.ts`

Po fázi 2 (shipping v haléřích):
- `subtotal` = haléře ✓
- `shippingPrice` = haléře ✓ (po opravě)
- `discountAmount` = haléře ✓
- `total = subtotal - discount + shipping` = haléře ✓
- Comgate dostane total v haléřích = ✓

**Cart freeFrom comparison** (`src/lib/cart.tsx:156`):
- `subtotal >= freeFrom` — po migraci obě v haléřích = ✓

### FÁZE 6: Ověření dalších míst

- **Admin orders export** (`route.ts:73`): `(halere / 100)` → ✓ po fixu
- **Discount validate** (`route.ts:35`): `(minOrderAmount / 100)` → ✓ (minOrderAmount ukládáno v haléřích)
- **Structured data** (`src/lib/structured-data.ts`): Ověřit JSON-LD price — Shopify/Google expects cena v základních jednotkách

---

## Ověření structured data

```ts
// src/lib/structured-data.ts — zkontrolovat toto:
// Pokud price je v haléřích, JSON-LD musí mít:
price: (variant.price / 100).toFixed(2),
priceCurrency: "CZK",
```

---

## Kompletní seznam souborů k úpravě

| # | Soubor | Změna | Fáze |
|---|--------|-------|------|
| 1 | `src/lib/products.ts:203` | formatPrice: přidat `/100` | 1 |
| 2 | `src/lib/emails/order-confirmation.tsx:36` | formatPrice: přidat `/100` | 1 |
| 3 | `src/lib/emails/abandoned-checkout.tsx:20` | formatPrice: přidat `/100` | 1 |
| 4 | `src/lib/emails/payment-received.tsx:12` | formatPrice: přidat `/100` | 1 |
| 5 | `src/lib/emails/admin-new-order.tsx:33` | formatPrice: přidat `/100` | 1 |
| 6 | `src/lib/emails/order-cancelled.tsx:11` | formatPrice: přidat `/100` | 1 |
| 7 | `src/components/SearchAutocomplete.tsx:38` | formatPrice: přidat `/100` | 1 |
| 8 | `src/components/HeroSearch.tsx:14` | formatPrice: přidat `/100` | 1 |
| 9 | `src/app/(admin)/admin/doprava/[id]/page.tsx` | price/freeFrom: `* 100` při ukládání, `/100` při zobrazení | 2 |
| 10 | `src/app/(admin)/admin/doprava/page.tsx:155,160` | Display: přidat `/100` | 2 |
| 11 | Migrace shipping dat | UPDATE `price * 100`, `freeFrom * 100` | 2 |
| 12 | `prisma/seed.ts:148-149` | Přidat `* 100` k cenám | 3 |
| 13 | `src/components/FilterBar.tsx:13-15` | Price ranges `* 100` | 4 |
| 14 | `src/lib/structured-data.ts` | Ověřit JSON-LD `/100` | 6 |

## Pořadí implementace (DŮLEŽITÉ!)

1. **NEJDŘÍVE** migrace shipping dat (CZK → haléře v DB)
2. **POTOM** opravit shipping admin form (×100 zápis, /100 display)
3. **POTOM** opravit formatPrice() — všech 8 kopií
4. **POTOM** opravit FilterBar
5. **POTOM** opravit seed.ts
6. **NAKONEC** ověřit structured data

**DŮVOD POŘADÍ:** Pokud opravíme formatPrice() PŘED migrací shipping, admin doprava page zobrazí špatné ceny (protože shipping je v CZK a formatPrice by dělilo /100 → zobrazilo by 0.59 Kč místo 59 Kč).

## Test checklist po implementaci

- [ ] Produkt detail zobrazuje správnou cenu (Shopify: Kč, ne haléře)
- [ ] ProductCard zobrazuje správnou cenu
- [ ] Košík: subtotal, shipping, total správné
- [ ] Pokladna: souhrn správný
- [ ] Doprava: free shipping funguje (testovat s objednávkou > 2000 Kč)
- [ ] Admin doprava: zobrazuje Kč ne haléře
- [ ] Admin produkt: ceny v Kč (input), ukládá haléře
- [ ] Cenové filtry: "Do 3000 Kč" filtruje správně
- [ ] Comgate: obdrží správnou částku v haléřích
- [ ] Email: ceny správné
- [ ] Structured data: JSON-LD cena správná
- [ ] Seed data: pokud reseed, ceny OK

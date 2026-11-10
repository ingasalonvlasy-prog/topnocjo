# Plan: Multi-sklad systém (vlastní + dodavatel)

**Status:** Ready for implementation  
**Priority:** High  
**Date:** 2026-11-08  

---

## Problém

Aktuálně má `Variant` jediné pole `stock: Int`. Produkty přicházejí z feedů dodavatelů (Import Bot, `level-` prefix). Když vlastní sklad = 0 a dodavatel = 2, zákazník vidí "2 skladem", ale objednávka odečte z jednoho pole → stock jde do -1.

## Fulfillment flow (potvrzeno uživatelem)

**NENÍ dropship.** Flow je: dodavatel → Qsport sklad → zákazník.

- **Zboží z vlastního skladu (ownStock > 0):** rovnou balí a posílá → standardní dodací doba (1-3 dny)
- **Zboží od dodavatele (ownStock = 0, supplierStock > 0):** musí nejdřív objednat od dodavatele, přijde k nim, pak balí a posílá → delší dodací doba (3-7 dní)

To znamená:
1. Na webu rozlišit **"Skladem"** (vlastní) vs **"Na objednávku"** (dodavatel) — jiná dodací doba
2. Při objednávce zboží z dodavatelského skladu: systém musí signalizovat, že je potřeba objednat od dodavatele
3. Smíšené objednávky (část vlastní + část dodavatel) jsou možné

## Požadavky

1. Dva zdroje skladu per varianta: `ownStock` (náš fyzický sklad) + `supplierStock` (z feedu)
2. Zákazník vidí celkový stock (`ownStock + supplierStock`) ale s rozlišeným štítkem dostupnosti
3. Při objednávce: nejdřív odečti z `ownStock`, pokud = 0 pak z `supplierStock`
4. Feed import aktualizuje **POUZE** `supplierStock`, nikdy `ownStock`
5. Admin může ručně upravit `ownStock`
6. Nikdy záporný stav
7. **NOVÉ:** Objednávka se položkami z dodavatelského skladu musí být označena jako `needsSupplierOrder`
8. **NOVÉ:** Frontend zobrazuje "Skladem" / "Na objednávku" / "Vyprodáno" podle zdroje

---

## Dotčené soubory (aktuální stav)

| Soubor | Co používá `stock` |
|---|---|
| `prisma/schema.prisma` | `Variant.stock: Int @default(0)` — jediné pole |
| `src/app/(public)/pokladna/actions.ts:53` | `variant.stock < item.quantity` — validace |
| `src/app/(public)/pokladna/actions.ts:124` | `stock: { decrement: item.quantity }` — odečtení |
| `src/lib/products.ts:68` | `variantWhere.stock = { gt: 0 }` — filtr "skladem" |
| `src/components/ProductCard.tsx:44` | `v.stock` — celkový stock, vyprodáno overlay |
| `src/components/ProductActions.tsx:24,43` | `v.stock > 0` — výběr velikosti, disabled state |
| `src/app/(public)/produkt/[slug]/page.tsx:46,70,156` | `v.stock` — totalStock, schema.org, props |
| `src/app/(admin)/admin/produkty/[id]/page.tsx:76,86,324-328` | `stock` — admin edit formulář |
| `src/app/(admin)/admin/produkty/novy/page.tsx:57` | `stock: 0` — nová varianta |
| `src/app/(admin)/admin/produkty/page.tsx:133` | `v.stock` — seznam produktů |
| `src/app/(admin)/admin/page.tsx:13` | `stock: { lte: 2 }` — low-stock dashboard count |
| `prisma/seed.ts:150` | `stock: Math.random()` — seed data |

---

## Phase 1: Prisma schema migrace

### 1.1 Rozšířit Variant model

```prisma
model Variant {
  id           String   @id @default(cuid())
  productId    String
  product      Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku          String?  @unique
  title        String
  size         String?
  color        String?
  price        Int
  comparePrice Int?
  costPrice    Int?
  ownStock      Int      @default(0)   // náš fyzický sklad
  supplierStock Int      @default(0)   // z feedu dodavatele
  weight       Int?
  barcode      String?
  position     Int      @default(0)
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([productId, size, color])
  @@index([productId])
  @@map("variants")
}
```

### 1.2 Migrace dat

```sql
-- Krok 1: přidat nové sloupce
ALTER TABLE variants ADD COLUMN ownStock INTEGER NOT NULL DEFAULT 0;
ALTER TABLE variants ADD COLUMN supplierStock INTEGER NOT NULL DEFAULT 0;

-- Krok 2: migrace existujících dat — předpokládáme, že dosavadní stock = ownStock
UPDATE variants SET ownStock = stock;

-- Krok 3: smazat starý sloupec (až po ověření)
-- SQLite neumí DROP COLUMN přímo — Prisma to řeší přes re-create table
```

**Prisma postup:**
1. Přidej `ownStock` a `supplierStock` do schema
2. Ponech `stock` dočasně (aby Prisma nevytvořil breaking migration)
3. Spusť `npx prisma migrate dev --name add-warehouse-fields`
4. Spusť data migration script (zkopíruj `stock` → `ownStock`)
5. Odstraň `stock` ze schema
6. Spusť `npx prisma migrate dev --name remove-old-stock`

**Bezpečnější alternativa (doporučuji):**  
Ponechat `stock` jako computed field → NEREÁLNÉ v SQLite (žádné generated columns s výrazy).

**Nejčistší přístup:** Smazat `stock`, přidat `ownStock` + `supplierStock`, vše v jedné migraci:
1. Přidej `ownStock Int @default(0)` a `supplierStock Int @default(0)`
2. Spusť `prisma migrate dev`
3. Spusť data migration: `UPDATE variants SET ownStock = stock`
4. Odstraň `stock` ze schema
5. Spusť `prisma migrate dev` znovu

### 1.3 Helper funkce

Vytvořit `src/lib/stock.ts`:

```typescript
type VariantStock = { ownStock: number; supplierStock: number };

/**
 * Stav dostupnosti pro zákazníka.
 * - "in_stock": máme na vlastním skladu → expedice 1-3 dny
 * - "on_order": nemáme, ale dodavatel ano → musíme objednat, expedice 3-7 dní
 * - "out_of_stock": nikde → vyprodáno
 */
export type AvailabilityStatus = "in_stock" | "on_order" | "out_of_stock";

/**
 * Celkový dostupný stock pro zákazníka.
 */
export function totalStock(variant: VariantStock): number {
  return variant.ownStock + variant.supplierStock;
}

/**
 * Je varianta skladem (z jakéhokoliv zdroje)?
 */
export function isInStock(variant: VariantStock): boolean {
  return totalStock(variant) > 0;
}

/**
 * Stav dostupnosti — rozhoduje, co zákazník vidí.
 */
export function getAvailability(variant: VariantStock): AvailabilityStatus {
  if (variant.ownStock > 0) return "in_stock";
  if (variant.supplierStock > 0) return "on_order";
  return "out_of_stock";
}

/**
 * Český label pro stav dostupnosti.
 */
export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  in_stock: "Skladem",
  on_order: "Na objednávku",
  out_of_stock: "Vyprodáno",
};

/**
 * Krátký popis dodací doby pro zákazníka.
 */
export const AVAILABILITY_DELIVERY: Record<AvailabilityStatus, string> = {
  in_stock: "Expedice 1–3 pracovní dny",
  on_order: "Expedice 3–7 pracovních dnů",
  out_of_stock: "",
};

/**
 * Barva štítku pro frontend.
 */
export const AVAILABILITY_COLORS: Record<AvailabilityStatus, { bg: string; text: string }> = {
  in_stock: { bg: "bg-green-100", text: "text-green-700" },
  on_order: { bg: "bg-amber-100", text: "text-amber-700" },
  out_of_stock: { bg: "bg-red-100", text: "text-red-700" },
};

/**
 * Rozděl požadované množství mezi ownStock a supplierStock.
 * Priorita: nejdřív ownStock, pak supplierStock.
 * Vrací { fromOwn, fromSupplier } — kolik odečíst z každého zdroje.
 * Throws pokud celkový stock nestačí.
 */
export function allocateStock(
  variant: VariantStock,
  quantity: number
): { fromOwn: number; fromSupplier: number } {
  const total = totalStock(variant);
  if (total < quantity) {
    throw new Error("Nedostatek skladem");
  }

  const fromOwn = Math.min(variant.ownStock, quantity);
  const fromSupplier = quantity - fromOwn;

  return { fromOwn, fromSupplier };
}

/**
 * Zjisti, zda objednávka potřebuje objednání od dodavatele.
 * Vrací true pokud alespoň 1 položka se bere z supplierStock.
 */
export function orderNeedsSupplier(
  items: Array<{ variant: VariantStock; quantity: number }>
): boolean {
  return items.some(({ variant, quantity }) => {
    const { fromSupplier } = allocateStock(variant, quantity);
    return fromSupplier > 0;
  });
}
```

---

## Phase 2: Checkout (objednávkový flow) + fulfillment signaling

### 2.0 Order model rozšíření — `prisma/schema.prisma`

Přidat na Order:

```prisma
model Order {
  // ... existing fields ...
  needsSupplierOrder  Boolean  @default(false)  // alespoň 1 položka z dodavatelského skladu
  supplierOrderedAt   DateTime?                 // kdy admin objednal od dodavatele
  supplierReceivedAt  DateTime?                 // kdy zboží dorazilo od dodavatele
}
```

A na OrderItem přidat info o zdroji:

```prisma
model OrderItem {
  // ... existing fields ...
  fromOwnStock      Int  @default(0)   // kolik ks z vlastního skladu
  fromSupplierStock Int  @default(0)   // kolik ks z dodavatelského skladu
}
```

### 2.1 Validace skladu — `src/app/(public)/pokladna/actions.ts`

**Aktuálně (řádky 49-55):**
```typescript
if (variant.stock < item.quantity) {
  throw new Error(`Nedostatek skladem: ${variant.product.name} (${variant.title})`);
}
```

**Nově:**
```typescript
import { totalStock, allocateStock, orderNeedsSupplier } from "@/lib/stock";

// Validace
const total = totalStock(variant);
if (total < item.quantity) {
  throw new Error(`Nedostatek skladem: ${variant.product.name} (${variant.title})`);
}
```

### 2.2 Odečtení skladu + fulfillment flag — `src/app/(public)/pokladna/actions.ts`

**Aktuálně (řádky 120-126):**
```typescript
for (const item of data.items) {
  await prisma.variant.update({
    where: { id: item.variantId },
    data: { stock: { decrement: item.quantity } },
  });
}
```

**Nově:**
```typescript
// Před order create: zjisti, zda potřebujeme objednat od dodavatele
const needsSupplier = orderNeedsSupplier(
  data.items.map(item => ({
    variant: variants.find(v => v.id === item.variantId)!,
    quantity: item.quantity,
  }))
);

// Order items s fulfillment info
const orderItems = data.items.map((item) => {
  const variant = variants.find((v) => v.id === item.variantId)!;
  const { fromOwn, fromSupplier } = allocateStock(variant, item.quantity);
  return {
    productId: variant.productId,
    variantId: variant.id,
    productName: variant.product.name,
    variantTitle: variant.title,
    sku: variant.sku,
    quantity: item.quantity,
    unitPrice: variant.price,
    totalPrice: variant.price * item.quantity,
    fromOwnStock: fromOwn,
    fromSupplierStock: fromSupplier,
  };
});

// Create order s needsSupplierOrder flag
const order = await prisma.order.create({
  data: {
    // ... other fields ...
    needsSupplierOrder: needsSupplier,
    items: { create: orderItems },
  },
});

// Decrement stock
for (const item of data.items) {
  const variant = variants.find((v) => v.id === item.variantId)!;
  const { fromOwn, fromSupplier } = allocateStock(variant, item.quantity);
  await prisma.variant.update({
    where: { id: item.variantId },
    data: {
      ownStock: { decrement: fromOwn },
      supplierStock: { decrement: fromSupplier },
    },
  });
}
```

**Důležité:** Toto MUSÍ být v rámci transakce, aby se zamezilo race conditions.

### 2.3 Transakční bezpečnost

Celý order creation + stock decrement zabalit do `prisma.$transaction()`:

```typescript
const order = await prisma.$transaction(async (tx) => {
  // 1. Fresh read (SQLite = serialized, ale pro budoucí PostgreSQL bezpečné)
  const freshVariants = await tx.variant.findMany({
    where: { id: { in: data.items.map(i => i.variantId) } },
    include: { product: true },
  });

  // 2. Validate stock again (inside transaction)
  for (const item of data.items) {
    const v = freshVariants.find(fv => fv.id === item.variantId)!;
    if (totalStock(v) < item.quantity) {
      throw new Error(`Nedostatek skladem: ${v.product.name} (${v.title})`);
    }
  }

  // 3. Calculate allocation + needsSupplier
  const allocations = data.items.map(item => {
    const v = freshVariants.find(fv => fv.id === item.variantId)!;
    const alloc = allocateStock(v, item.quantity);
    return { ...item, variant: v, ...alloc };
  });
  const needsSupplier = allocations.some(a => a.fromSupplier > 0);

  // 4. Create order
  const created = await tx.order.create({
    data: {
      // ... other fields ...
      needsSupplierOrder: needsSupplier,
      items: {
        create: allocations.map(a => ({
          productId: a.variant.productId,
          variantId: a.variant.id,
          productName: a.variant.product.name,
          variantTitle: a.variant.title,
          sku: a.variant.sku,
          quantity: a.quantity,
          unitPrice: a.variant.price,
          totalPrice: a.variant.price * a.quantity,
          fromOwnStock: a.fromOwn,
          fromSupplierStock: a.fromSupplier,
        })),
      },
    },
  });

  // 5. Decrement stock
  for (const a of allocations) {
    await tx.variant.update({
      where: { id: a.variant.id },
      data: {
        ownStock: { decrement: a.fromOwn },
        supplierStock: { decrement: a.fromSupplier },
      },
    });
  }

  return created;
});
```

### 2.4 Admin objednávky — fulfillment workflow

V admin order detail přidat:

```
┌─────────────────────────────────────────────────┐
│  ⚠️ Objednávka vyžaduje dodání od dodavatele    │
│                                                  │
│  Položky z dodavatele:                          │
│  • Nike Air Zoom (vel. 42) — 1 ks              │
│                                                  │
│  [Objednáno od dodavatele]  [Zboží přijato]     │
│  supplierOrderedAt: —       supplierReceivedAt: —│
└─────────────────────────────────────────────────┘
```

Admin klikne "Objednáno od dodavatele" → nastaví `supplierOrderedAt = now()`.
Admin klikne "Zboží přijato" → nastaví `supplierReceivedAt = now()`, objednávka ready k odeslání.

**Order status flow pro dodavatelské objednávky:**
```
NEW → CONFIRMED → AWAITING_SUPPLIER → SUPPLIER_ORDERED → SUPPLIER_RECEIVED → SHIPPED → DELIVERED
```

**Order status flow pro vlastní sklad:**
```
NEW → CONFIRMED → SHIPPED → DELIVERED
```

---

## Phase 3: Frontend — dostupnost + stock zobrazení

### 3.1 Strategie

Klient potřebuje vědět OBOJÍ: `ownStock` i `supplierStock`, protože musí zobrazit:
- **"Skladem"** (zelený badge) — `ownStock > 0`
- **"Na objednávku"** (oranžový badge) — `ownStock = 0, supplierStock > 0`
- **"Vyprodáno"** (overlay) — obojí = 0

→ **Varianta B: poslat klientovi `ownStock` + `supplierStock`** a použít `getAvailability()` z `stock.ts`.

### 3.2 Computed stock pro zpětnou kompatibilitu

V `src/lib/products.ts` přidat transformaci pro existující kód, který čte `.stock`:

```typescript
function addComputedStock<T extends { ownStock: number; supplierStock: number }>(
  variant: T
): T & { stock: number } {
  return { ...variant, stock: variant.ownStock + variant.supplierStock };
}
```

Aplikovat ve `getFilteredProducts()` a `getProductBySlug()` na varianty. Tím stávající kód čtoucí `v.stock` nezlomíme.

### 3.3 ProductCard — dostupnost badge

**`src/components/ProductCard.tsx`**

Přidat do variant props: `ownStock` + `supplierStock` (vedle existujícího computed `stock`).

```typescript
// Nový import
import { getAvailability, AVAILABILITY_LABELS, AVAILABILITY_COLORS } from "@/lib/stock";

// Celková dostupnost produktu (nejlepší stav ze všech variant)
const productAvailability = product.variants.some(v => v.ownStock > 0)
  ? "in_stock"
  : product.variants.some(v => v.supplierStock > 0)
    ? "on_order"
    : "out_of_stock";

// V JSX — pod cenou, místo stávajícího "Vyprodáno" overlay:
{productAvailability === "in_stock" && (
  <span className="text-[11px] font-bold text-green-600">Skladem</span>
)}
{productAvailability === "on_order" && (
  <span className="text-[11px] font-bold text-amber-600">Na objednávku · 3–7 dní</span>
)}
{productAvailability === "out_of_stock" && (
  // stávající "Vyprodáno" overlay zůstává
)}
```

### 3.4 ProductActions — dostupnost per varianta

**`src/components/ProductActions.tsx`**

U vybrané varianty zobrazit delivery info:

```typescript
import { getAvailability, AVAILABILITY_LABELS, AVAILABILITY_DELIVERY } from "@/lib/stock";

// Pod size chips, po výběru:
{selected && (
  <div className="flex items-center gap-2 mt-2 mb-4">
    {getAvailability(selected) === "in_stock" ? (
      <>
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-[13px] text-green-700 font-medium">
          Skladem · Expedice 1–3 pracovní dny
        </span>
      </>
    ) : getAvailability(selected) === "on_order" ? (
      <>
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-[13px] text-amber-700 font-medium">
          Na objednávku · Expedice 3–7 pracovních dnů
        </span>
      </>
    ) : null}
  </div>
)}
```

### 3.5 Produkt detail stránka

**`src/app/(public)/produkt/[slug]/page.tsx`**

- Schema.org: `availability` založit na `getAvailability()`:
  - `in_stock` → `InStock`
  - `on_order` → `PreOrder` (nebo `BackOrder`)
  - `out_of_stock` → `OutOfStock`
- `deliveryLeadTime`: `in_stock` → "P3D", `on_order` → "P7D"

### 3.6 Dotčené soubory — přehled změn

| Soubor | Změna |
|---|---|
| `src/lib/products.ts` | `addComputedStock()` transformace, `inStock` filtr přes OR |
| `src/components/ProductCard.tsx` | Přidat availability badge (Skladem / Na objednávku), props rozšířit o `ownStock` + `supplierStock` |
| `src/components/ProductActions.tsx` | Zobrazit delivery info pod size chips po výběru varianty |
| `src/app/(public)/produkt/[slug]/page.tsx` | Computed stock, schema.org availability, předat `ownStock`/`supplierStock` do komponent |
| `src/app/(admin)/admin/page.tsx` | Low-stock count přes raw query nebo JS filter |

### 3.7 Filtr "Skladem" — úprava Prisma where

**Aktuálně:** `variantWhere.stock = { gt: 0 }`

**Nově:**
```typescript
if (inStock) {
  variantWhere.OR = [
    { ownStock: { gt: 0 } },
    { supplierStock: { gt: 0 } },
  ];
}
```

---

## Phase 4: Admin panel

### 4.1 Variant edit — `src/app/(admin)/admin/produkty/[id]/page.tsx`

**Aktuálně:** Jedno pole "Sklad" (stock input)

**Nově:** Dva pole vedle sebe:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Náš sklad   │  │ Dodavatel   │  │ Celkem      │
│ [ownStock]  │  │ [readonly]  │  │ [computed]  │
│ editovatelné│  │ z feedu     │  │ own+supplier│
└─────────────┘  └─────────────┘  └─────────────┘
```

- **"Náš sklad"** — editovatelný input (`ownStock`)
- **"Dodavatel"** — readonly, šedý text (`supplierStock`) — admin ho nemůže měnit, jen vidí
- **"Celkem"** — readonly, bold, computed (`ownStock + supplierStock`)

**Server action `updateVariant`:**
```typescript
const ownStock = parseInt(formData.get("ownStock") as string) || 0;
// supplierStock se NEAKTUALIZUJE z admin formuláře

await prisma.variant.update({
  where: { id: variantId },
  data: {
    // ... other fields
    ownStock: Math.max(0, ownStock), // nikdy záporný
    // supplierStock: NEZMĚNĚN
  },
});
```

### 4.2 Admin dashboard — `src/app/(admin)/admin/page.tsx`

Low-stock count aktualizovat:

```typescript
// "Nízký sklad" = celkový stock (own + supplier) <= 2
// SQLite nemá computed columns, takže:
const allVariants = await prisma.variant.findMany({
  where: { active: true },
  select: { ownStock: true, supplierStock: true },
});
const lowStockCount = allVariants.filter(v => (v.ownStock + v.supplierStock) <= 2).length;
```

Alternativně efektivněji (ale méně přesně):
```typescript
// Aproximace: varianty kde ownStock + supplierStock <= 2
// V SQL: WHERE (ownStock + supplierStock) <= 2
// Prisma raw query:
const lowStockCount = await prisma.$queryRaw<[{count: number}]>`
  SELECT COUNT(*) as count FROM variants
  WHERE active = 1 AND (ownStock + supplierStock) <= 2
`;
```

### 4.3 Admin produkty list — `src/app/(admin)/admin/produkty/page.tsx`

**Aktuálně:** `product.variants.reduce((sum, v) => sum + v.stock, 0)`

**Nově:** `product.variants.reduce((sum, v) => sum + v.ownStock + v.supplierStock, 0)`

### 4.4 Nová varianta — `src/app/(admin)/admin/produkty/novy/page.tsx`

**Aktuálně:** `stock: 0`  
**Nově:** `ownStock: 0, supplierStock: 0`

---

## Phase 5: Feed Import Engine

Feedy od dodavatelů přicházejí ve **VŠECH formátech** — XML, CSV i JSON. Každý dodavatel má jiný formát. Systém musí umět číst všechny tři.

### 5.0 Prisma model — Supplier + FeedConfig

```prisma
model Supplier {
  id          String       @id @default(cuid())
  name        String       // "Levelek", "SportObchod", ...
  code        String       @unique  // "levelek", "sportobchod" — prefix pro sourceId
  feedUrl     String       // URL feedu (HTTP GET)
  feedFormat  String       // "xml" | "csv" | "json"
  feedConfig  String       @default("{}") // JSON — field mapping per dodavatel
  active      Boolean      @default(true)
  lastImportAt DateTime?
  lastImportStatus String? // "success" | "error" | "partial"
  lastImportCount  Int?    // kolik variant aktualizováno
  lastImportError  String? // chybová hláška pokud error
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@map("suppliers")
}

model FeedImportLog {
  id          String   @id @default(cuid())
  supplierId  String
  status      String   // "success" | "error" | "partial"
  variantsUpdated Int  @default(0)
  variantsCreated Int  @default(0)
  variantsZeroed  Int  @default(0)  // kolik variant nastaveno na supplierStock=0
  duration    Int      @default(0)  // ms
  error       String?
  createdAt   DateTime @default(now())

  @@index([supplierId])
  @@index([createdAt])
  @@map("feed_import_logs")
}
```

`feedConfig` JSON struktura per dodavatel — mapování feedových polí na naše:

```typescript
interface FeedFieldMapping {
  // Cesta k poli ve feedu (dot notation pro JSON/XML, column name pro CSV)
  sku: string;           // "item.sku" | "SKU" | "product_code"
  name?: string;         // "item.name" | "NAZEV"
  size?: string;         // "item.size" | "VELIKOST"
  color?: string;        // "item.color" | "BARVA"
  price: string;         // "item.price" | "CENA"
  comparePrice?: string; // "item.list_price" | "PUVODNI_CENA"
  stock: string;         // "item.qty" | "SKLAD" | "availability"
  // CSV specifické
  csvDelimiter?: string; // ";" | "," | "\t" (default: ",")
  csvEncoding?: string;  // "utf-8" | "windows-1250" (default: "utf-8")
  csvHeaderRow?: number; // řádek s hlavičkou (default: 0)
  // XML specifické
  xmlItemPath?: string;  // XPath k item elementu: "products.product" | "items.item"
  // JSON specifické
  jsonItemPath?: string; // JSON path k array: "data.products" | "items"
  // Transformace
  priceMultiplier?: number; // pokud cena je bez DPH, např. 1.21
  priceInCents?: boolean;   // true pokud cena je v haléřích (default: false → Kč)
  stockMapping?: Record<string, number>; // "ano" → 10, "ne" → 0 (pro textové stavy)
}
```

### 5.1 Architektura — `src/lib/feed/`

```
src/lib/feed/
├── types.ts          — FeedItem, FeedFieldMapping, FeedParseResult
├── parsers/
│   ├── xml.ts        — parseXmlFeed(rawData, mapping) → FeedItem[]
│   ├── csv.ts        — parseCsvFeed(rawData, mapping) → FeedItem[]
│   └── json.ts       — parseJsonFeed(rawData, mapping) → FeedItem[]
├── processor.ts      — processFeed(supplier) — orchestrátor
├── importer.ts       — importFeedItems(items, supplier) — DB write
└── index.ts          — runFeedImport(supplierId), runAllFeedImports()
```

### 5.2 Typy — `src/lib/feed/types.ts`

```typescript
export interface FeedItem {
  sku: string;
  name?: string;
  size?: string;
  color?: string;
  price: number;        // v haléřích (Int, jako v DB)
  comparePrice?: number;
  stock: number;        // celé číslo, ≥ 0
}

export interface FeedParseResult {
  items: FeedItem[];
  errors: string[];     // řádky/elementy, které se nepodařilo zparsovat
  rawCount: number;     // kolik záznamů feed obsahoval
}

export interface FeedImportResult {
  updated: number;
  created: number;
  zeroed: number;       // variant kde supplierStock → 0 (chybí ve feedu)
  errors: string[];
  durationMs: number;
}
```

### 5.3 Parsery

#### XML parser — `src/lib/feed/parsers/xml.ts`

```typescript
// Použít balíček: fast-xml-parser (zero-dependency, rychlý)
// npm install fast-xml-parser
import { XMLParser } from "fast-xml-parser";

export function parseXmlFeed(raw: string, mapping: FeedFieldMapping): FeedParseResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
  });
  const parsed = parser.parse(raw);

  // Najdi array itemů přes xmlItemPath (dot notation)
  const items = getNestedValue(parsed, mapping.xmlItemPath || "products.product");
  const arr = Array.isArray(items) ? items : items ? [items] : [];

  return mapToFeedItems(arr, mapping);
}
```

#### CSV parser — `src/lib/feed/parsers/csv.ts`

```typescript
// Použít balíček: papaparse (robustní, zvládá encoding, BOM, quoted fields)
// npm install papaparse @types/papaparse
import Papa from "papaparse";
import { TextDecoder } from "util";

export function parseCsvFeed(raw: string | Buffer, mapping: FeedFieldMapping): FeedParseResult {
  // Encoding konverze (Windows-1250 feedy od českých dodavatelů)
  const text = typeof raw === "string"
    ? raw
    : new TextDecoder(mapping.csvEncoding || "utf-8").decode(raw);

  const result = Papa.parse(text, {
    header: true,
    delimiter: mapping.csvDelimiter || ",",
    skipEmptyLines: true,
  });

  return mapToFeedItems(result.data as Record<string, string>[], mapping);
}
```

#### JSON parser — `src/lib/feed/parsers/json.ts`

```typescript
export function parseJsonFeed(raw: string, mapping: FeedFieldMapping): FeedParseResult {
  const parsed = JSON.parse(raw);

  // Najdi array přes jsonItemPath
  const items = getNestedValue(parsed, mapping.jsonItemPath || "items");
  const arr = Array.isArray(items) ? items : items ? [items] : [];

  return mapToFeedItems(arr, mapping);
}
```

#### Společný mapper — `mapToFeedItems()`

```typescript
function mapToFeedItems(rawItems: any[], mapping: FeedFieldMapping): FeedParseResult {
  const items: FeedItem[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    try {
      const raw = rawItems[i];
      const sku = String(getNestedValue(raw, mapping.sku) || "").trim();
      if (!sku) {
        errors.push(`Row ${i}: missing SKU`);
        continue;
      }

      let price = parseFloat(String(getNestedValue(raw, mapping.price) || "0"));
      if (mapping.priceMultiplier) price *= mapping.priceMultiplier;
      const priceInCents = mapping.priceInCents
        ? Math.round(price)
        : Math.round(price * 100);

      let stock: number;
      const rawStock = getNestedValue(raw, mapping.stock);
      if (mapping.stockMapping && typeof rawStock === "string") {
        stock = mapping.stockMapping[rawStock.toLowerCase()] ?? 0;
      } else {
        stock = Math.max(0, parseInt(String(rawStock || "0")) || 0);
      }

      items.push({
        sku,
        name: mapping.name ? String(getNestedValue(raw, mapping.name) || "") : undefined,
        size: mapping.size ? String(getNestedValue(raw, mapping.size) || "") : undefined,
        color: mapping.color ? String(getNestedValue(raw, mapping.color) || "") : undefined,
        price: priceInCents,
        comparePrice: mapping.comparePrice
          ? Math.round(parseFloat(String(getNestedValue(raw, mapping.comparePrice) || "0")) * (mapping.priceInCents ? 1 : 100))
          : undefined,
        stock,
      });
    } catch (e) {
      errors.push(`Row ${i}: ${(e as Error).message}`);
    }
  }

  return { items, errors, rawCount: rawItems.length };
}

// Utility: dot-notation access ("products.product" → obj.products.product)
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}
```

### 5.4 Feed Processor — `src/lib/feed/processor.ts`

```typescript
import { parseXmlFeed } from "./parsers/xml";
import { parseCsvFeed } from "./parsers/csv";
import { parseJsonFeed } from "./parsers/json";

export async function fetchAndParseFeed(supplier: {
  feedUrl: string;
  feedFormat: string;
  feedConfig: string;
}): Promise<FeedParseResult> {
  const mapping: FeedFieldMapping = JSON.parse(supplier.feedConfig);

  // 1. Fetch feed
  const response = await fetch(supplier.feedUrl, {
    headers: { "User-Agent": "QsportFeedBot/1.0" },
    signal: AbortSignal.timeout(30_000), // 30s timeout
  });

  if (!response.ok) {
    throw new Error(`Feed HTTP ${response.status}: ${response.statusText}`);
  }

  // 2. Parse based on format
  switch (supplier.feedFormat) {
    case "xml": {
      const text = await response.text();
      return parseXmlFeed(text, mapping);
    }
    case "csv": {
      // CSV může být v jiném encoding → čteme jako buffer
      const buffer = Buffer.from(await response.arrayBuffer());
      return parseCsvFeed(buffer, mapping);
    }
    case "json": {
      const text = await response.text();
      return parseJsonFeed(text, mapping);
    }
    default:
      throw new Error(`Unknown feed format: ${supplier.feedFormat}`);
  }
}
```

### 5.5 DB Importer — `src/lib/feed/importer.ts`

```typescript
import { prisma } from "@/lib/db";

export async function importFeedItems(
  items: FeedItem[],
  supplier: { id: string; code: string }
): Promise<{ updated: number; created: number; zeroed: number; errors: string[] }> {
  let updated = 0;
  let created = 0;
  const errors: string[] = [];
  const processedSkus: string[] = [];

  // 1. Upsert each item
  for (const item of items) {
    try {
      processedSkus.push(item.sku);

      const existing = await prisma.variant.findUnique({
        where: { sku: item.sku },
      });

      if (existing) {
        await prisma.variant.update({
          where: { id: existing.id },
          data: {
            supplierStock: Math.max(0, item.stock),
            price: item.price,
            comparePrice: item.comparePrice ?? existing.comparePrice,
          },
        });
        updated++;
      } else {
        // Nová varianta — potřebujeme productId
        // Hledáme product přes sourceId = supplier.code
        // Pokud product neexistuje, logujeme warning (product se vytváří jiným procesem)
        errors.push(`SKU ${item.sku}: no matching product found, skipped`);
      }
    } catch (e) {
      errors.push(`SKU ${item.sku}: ${(e as Error).message}`);
    }
  }

  // 2. Varianty od tohoto dodavatele, které NEBYLY ve feedu → supplierStock = 0
  const zeroed = await prisma.variant.updateMany({
    where: {
      sku: { notIn: processedSkus },
      product: { sourceId: supplier.code },
      supplierStock: { gt: 0 }, // jen ty co mají něco na skladu
    },
    data: { supplierStock: 0 },
  });

  return { updated, created, zeroed: zeroed.count, errors };
}
```

### 5.6 Orchestrátor — `src/lib/feed/index.ts`

```typescript
import { prisma } from "@/lib/db";
import { fetchAndParseFeed } from "./processor";
import { importFeedItems } from "./importer";

export async function runFeedImport(supplierId: string): Promise<FeedImportResult> {
  const start = Date.now();
  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });

  try {
    // 1. Fetch + parse
    const parseResult = await fetchAndParseFeed(supplier);

    // 2. Import to DB
    const importResult = await importFeedItems(parseResult.items, supplier);

    const duration = Date.now() - start;

    // 3. Log
    await prisma.feedImportLog.create({
      data: {
        supplierId: supplier.id,
        status: importResult.errors.length > 0 ? "partial" : "success",
        variantsUpdated: importResult.updated,
        variantsCreated: importResult.created,
        variantsZeroed: importResult.zeroed,
        duration,
        error: importResult.errors.length > 0 ? importResult.errors.join("; ") : null,
      },
    });

    // 4. Update supplier
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        lastImportAt: new Date(),
        lastImportStatus: importResult.errors.length > 0 ? "partial" : "success",
        lastImportCount: importResult.updated + importResult.created,
        lastImportError: null,
      },
    });

    return { ...importResult, durationMs: duration };
  } catch (e) {
    const duration = Date.now() - start;
    const errorMsg = (e as Error).message;

    await prisma.feedImportLog.create({
      data: {
        supplierId: supplier.id,
        status: "error",
        duration,
        error: errorMsg,
      },
    });

    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        lastImportAt: new Date(),
        lastImportStatus: "error",
        lastImportError: errorMsg,
      },
    });

    throw e;
  }
}

/**
 * Spustí import pro všechny aktivní dodavatele.
 * Volat z cron jobu nebo manuálně z admin panelu.
 */
export async function runAllFeedImports(): Promise<Record<string, FeedImportResult>> {
  const suppliers = await prisma.supplier.findMany({ where: { active: true } });
  const results: Record<string, FeedImportResult> = {};

  for (const supplier of suppliers) {
    try {
      results[supplier.code] = await runFeedImport(supplier.id);
    } catch (e) {
      results[supplier.code] = {
        updated: 0, created: 0, zeroed: 0,
        errors: [(e as Error).message],
        durationMs: 0,
      };
    }
  }

  return results;
}
```

### 5.7 API endpoint — `src/app/api/feeds/import/route.ts`

```typescript
// Manuální spuštění z admin panelu nebo cron
// POST /api/feeds/import — import všech aktivních dodavatelů
// POST /api/feeds/import?supplier=levelek — import konkrétního dodavatele

export async function POST(request: Request) {
  // Auth check (admin only)
  const url = new URL(request.url);
  const supplierCode = url.searchParams.get("supplier");

  if (supplierCode) {
    const supplier = await prisma.supplier.findUnique({ where: { code: supplierCode } });
    if (!supplier) return Response.json({ error: "Supplier not found" }, { status: 404 });
    const result = await runFeedImport(supplier.id);
    return Response.json(result);
  }

  const results = await runAllFeedImports();
  return Response.json(results);
}
```

### 5.8 Admin — Dodavatelé sekce

Nová stránka `/admin/dodavatele`:
- Seznam dodavatelů (název, formát, poslední import, stav)
- Tlačítko "Importovat teď" per dodavatel
- Detail dodavatele: feedUrl, feedFormat, feedConfig (JSON editor), import log
- Tlačítko "Importovat všechny"

### 5.9 Příklady feedConfig per dodavatel

**XML dodavatel (Levelek):**
```json
{
  "xmlItemPath": "products.product",
  "sku": "code",
  "name": "name",
  "size": "size",
  "price": "price_vat",
  "comparePrice": "price_rrp",
  "stock": "stock_quantity",
  "priceInCents": false
}
```

**CSV dodavatel (SportObchod):**
```json
{
  "sku": "KOD",
  "name": "NAZEV",
  "size": "VELIKOST",
  "price": "CENA_S_DPH",
  "stock": "SKLAD",
  "csvDelimiter": ";",
  "csvEncoding": "windows-1250",
  "priceInCents": false,
  "stockMapping": { "ano": 10, "ne": 0, "na dotaz": 0 }
}
```

**JSON dodavatel (API):**
```json
{
  "jsonItemPath": "data.variants",
  "sku": "sku",
  "size": "attributes.size",
  "price": "pricing.retail",
  "comparePrice": "pricing.msrp",
  "stock": "inventory.available",
  "priceMultiplier": 1.21
}
```

### 5.10 NPM závislosti

```
npm install fast-xml-parser papaparse
npm install -D @types/papaparse
```

### 5.11 Pravidla pro feed import (shrnutí)

1. Identifikovat variantu přes `sku` (unique constraint)
2. Aktualizovat **POUZE** `supplierStock` — nikdy `ownStock`
3. Aktualizovat `price`, `comparePrice` (pokud se liší)
4. **NEMAZAT** varianty, které ve feedu nejsou — jen nastavit `supplierStock: 0`
5. Logovat každý import do `FeedImportLog`
6. Feed format detekce per dodavatel (ne auto-detect — explicitní config)

### 5.12 Stock audit log (volitelné rozšíření)

```prisma
model StockLog {
  id        String   @id @default(cuid())
  variantId String
  source    String   // "feed_import" | "order" | "admin_manual"
  field     String   // "ownStock" | "supplierStock"
  oldValue  Int
  newValue  Int
  note      String?  // "order QS-2026-0042" | "feed levelek-2026-11-08"
  createdAt DateTime @default(now())

  @@index([variantId])
  @@index([createdAt])
  @@map("stock_logs")
}
```

Toto je **volitelné** — lze implementovat později jako doplněk k FeedImportLog.

---

## Phase 6: Seed data

Aktualizovat `prisma/seed.ts`:

```typescript
// Aktuálně:
stock: Math.floor(Math.random() * 15) + 1,

// Nově:
ownStock: Math.floor(Math.random() * 8),
supplierStock: Math.floor(Math.random() * 10),
```

---

## Pořadí implementace

| # | Fáze | Závislost | Složitost |
|---|------|-----------|-----------|
| 1 | Schema migrace (Variant + Order + OrderItem + Supplier + FeedImportLog) + `stock.ts` helper | Žádná | Nízká |
| 2 | Checkout (validace + allocation + needsSupplierOrder flag) | Phase 1 | Střední |
| 3 | Frontend (availability badges, delivery info, computed stock) | Phase 1 | Střední |
| 4 | Admin panel (split stock inputs + fulfillment workflow na objednávkách) | Phase 1 | Střední |
| 5 | Feed import engine (parsery XML/CSV/JSON + processor + importer + API) | Phase 1 | Vysoká |
| 6 | Seed data | Phase 1 | Nízká |

**Phase 1-4 a 6 implementovat najednou** (jsou úzce provázané — nelze mít `ownStock`/`supplierStock` ve schema a zároveň `stock` v UI).

**Phase 5 implementovat jako druhý krok** — vyžaduje npm závislosti (`fast-xml-parser`, `papaparse`), admin stránku pro dodavatele, a reálné feedy pro testování.

---

## Rizika a edge cases

### Race conditions při objednávce
- SQLite = single-writer → `prisma.$transaction()` zajistí serialized access
- Ale pozor: pokud se přejde na PostgreSQL, bude potřeba `SELECT FOR UPDATE`

### Záporný stav
- `allocateStock()` vyhazuje error pokud `totalStock < quantity`
- Admin `ownStock` input: `Math.max(0, value)` — nikdy záporný
- Feed import: `Math.max(0, feedItem.stock)` — nikdy záporný

### Zpětná kompatibilita
- Starý `stock` pole zmizí → VŠECHNY reference musí být aktualizovány
- TypeScript compiler odchytí chybějící `stock` property → bezpečné
- `addComputedStock()` zajistí, že klientský kód čtoucí `.stock` funguje dál

### Feed import bez Import Botu
- Import Bot zatím neexistuje → Phase 5 je dokumentace pro budoucí implementaci
- Než bude Import Bot: `supplierStock` zůstane 0, vše funguje přes `ownStock`

### Smíšené objednávky (vlastní + dodavatel)
- Objednávka může obsahovat MIX: některé položky z vlastního skladu, jiné z dodavatele
- `needsSupplierOrder = true` pokud alespoň 1 položka z dodavatele
- Admin vidí per-item breakdown (`fromOwnStock` / `fromSupplierStock` na OrderItem)
- Celou objednávku odesílají až po přijetí dodavatelského zboží (čeká se na kompletaci)

### "Na objednávku" UX
- Zákazník MUSÍ před objednáním vidět, že dodací doba je delší (3-7 dní)
- V košíku zobrazit upozornění pokud alespoň 1 položka je "Na objednávku"
- Na potvrzení objednávky zmínit delší dodací dobu

### Dodavatel nedodá
- Edge case: objednáme od dodavatele, ale dodavatel nedodá
- Řešení: admin ručně zruší objednávku nebo nabídne alternativu
- `supplierStock` se mezitím mohl změnit feedem → ale my už jsme odečetli při objednávce
- Pokud je potřeba vrátit stock: admin ručně přidá zpět do `supplierStock` nebo `ownStock`

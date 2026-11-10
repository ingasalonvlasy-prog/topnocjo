# Plán: TASK-029 — Admin slevy + kupony

**Priorita:** 2
**Soubory k úpravě:**
- `src/app/(admin)/admin/slevy/page.tsx` (116 řádků)
- `src/app/(admin)/admin/slevy/actions.ts` (107 řádků)
- `src/app/(admin)/admin/slevy/novy/page.tsx` (110 řádků)
- `src/app/(admin)/admin/slevy/[id]/page.tsx` (181 řádků)
- `prisma/schema.prisma` — DiscountCode model
- `src/app/api/discount/validate/route.ts` (64 řádků)

**Referenční soubory (READ ONLY):**
- `src/app/(public)/pokladna/page.tsx` — discount application in checkout

---

## Analýza stávajícího stavu

### Co je hotovo (95%):
1. **CRUD slevových kódů** — vytvoření, editace, smazání funguje
2. **Validace v pokladně** — API `/api/discount/validate` funguje, checkout UI aplikuje slevu
3. **Typy slev** — percentage + fixed (v haléřích) funguje
4. **Platnost od-do** — datetime-local pole fungují
5. **Max počet použití** — usageLimit + usageCount funguje
6. **Min hodnota objednávky** — funguje (ukládáno v haléřích)
7. **Aktivní/neaktivní toggle** — funguje v editaci
8. **Stav zobrazení** — aktivní/vypršel/vyčerpán/neaktivní badges

### Co chybí dle zadání:

| # | Funkce | Stav | Náročnost |
|---|--------|------|-----------|
| 1 | Omezení na kategorii/značku | Chybí v schema + UI | STŘEDNÍ |
| 2 | Admin přehled použitých kupónů s referencemi na objednávky | Chybí | STŘEDNÍ |
| 3 | Inkrementace usageCount při objednávce | Nutno ověřit | NÍZKÁ |

---

## Problém 1: Chybí omezení na kategorii/značku

### Schema — DiscountCode model nemá pole pro omezení:
```prisma
// Aktuální:
model DiscountCode {
  id             String    @id @default(cuid())
  code           String    @unique
  type           String    @default("percentage")
  value          Int
  minOrderAmount Int?
  usageLimit     Int?
  usageCount     Int       @default(0)
  validFrom      DateTime?
  validTo        DateTime?
  active         Boolean   @default(true)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  @@map("discount_codes")
}
```

### Řešení — přidat 2 nullable JSON pole:

**Soubor:** `prisma/schema.prisma`

```diff
model DiscountCode {
  id             String    @id @default(cuid())
  code           String    @unique
  type           String    @default("percentage")
  value          Int
  minOrderAmount Int?
  usageLimit     Int?
  usageCount     Int       @default(0)
  validFrom      DateTime?
  validTo        DateTime?
  active         Boolean   @default(true)
+ restrictCategories String?  // JSON array of category slugs, null = all
+ restrictBrands     String?  // JSON array of brand names, null = all
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  @@map("discount_codes")
}
```

**Migrace:** `npx prisma db push` (SQLite, nové nullable sloupce nevyžadují migraci dat)

---

## Problém 2: Admin přehled použitých kupónů

### Aktuální stav:
- Order model má `discountCode String?` a `discountAmount Int @default(0)`
- Admin slevy page ukazuje jen `usageCount`, bez reference na objednávky

### Řešení — přidat sekci "Použití" na stránku editace kupónu:

**Soubor:** `src/app/(admin)/admin/slevy/[id]/page.tsx`

Na stránce editace (`/admin/slevy/[id]`) přidat sekci pod formulářem, která zobrazí objednávky použité s tímto kódem:

```tsx
// V server component, přidat dotaz:
const usages = await prisma.order.findMany({
  where: { discountCode: code.code },
  select: {
    id: true,
    orderNumber: true,
    email: true,
    discountAmount: true,
    total: true,
    createdAt: true,
  },
  orderBy: { createdAt: "desc" },
  take: 50,
});
```

A pod sidebar (delete box) přidat:

```tsx
{/* Použití kódu */}
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mt-4">
  <h3 className="text-sm font-bold text-gray-900 mb-3">
    Použití ({usages.length})
  </h3>
  {usages.length === 0 ? (
    <p className="text-xs text-gray-500">Kód zatím nebyl použit.</p>
  ) : (
    <div className="space-y-2">
      {usages.map((o) => (
        <Link
          key={o.id}
          href={`/admin/objednavky/${o.id}`}
          className="block text-xs hover:bg-gray-50 p-2 rounded -mx-2"
        >
          <div className="flex justify-between">
            <span className="font-mono font-bold text-blue-600">#{o.orderNumber}</span>
            <span className="text-gray-500">{formatDate(o.createdAt)}</span>
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-gray-600">{o.email}</span>
            <span className="font-bold text-green-700">
              −{formatPrice(o.discountAmount)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )}
</div>
```

**Pozn.:** Potřeba přidat `import { formatPrice } from "@/lib/products"` na začátek souboru.

---

## Problém 3: Inkrementace usageCount

### Aktuální stav v `src/app/(public)/pokladna/actions.ts`:
Nutno ověřit, zda `createOrder` inkrementuje `usageCount` na DiscountCode. Pokud ne:

**Soubor:** `src/app/(public)/pokladna/actions.ts`

Po úspěšném vytvoření objednávky s discount kódem přidat:

```tsx
// Po prisma.order.create:
if (data.discountCode) {
  await prisma.discountCode.updateMany({
    where: { code: data.discountCode },
    data: { usageCount: { increment: 1 } },
  });
}
```

---

## Problém 4: Formuláře — přidat omezení na kategorii/značku

### Soubor: `src/app/(admin)/admin/slevy/novy/page.tsx`

Přidat 2 nová textová pole pod "Maximální počet použití":

```tsx
<div>
  <label className={labelCls}>Omezení na kategorie (slugy, oddělené čárkou)</label>
  <input
    name="restrictCategories"
    type="text"
    placeholder="beh, hory-a-outdoor, zima"
    className={inputCls}
  />
  <p className="text-xs text-gray-400 mt-1">Prázdné = platí pro všechny kategorie</p>
</div>

<div>
  <label className={labelCls}>Omezení na značky (názvy, oddělené čárkou)</label>
  <input
    name="restrictBrands"
    type="text"
    placeholder="On, POC, Maloja"
    className={inputCls}
  />
  <p className="text-xs text-gray-400 mt-1">Prázdné = platí pro všechny značky</p>
</div>
```

### Soubor: `src/app/(admin)/admin/slevy/[id]/page.tsx`

Stejná pole s `defaultValue`:

```tsx
const existingCategories = code.restrictCategories
  ? JSON.parse(code.restrictCategories).join(", ")
  : "";
const existingBrands = code.restrictBrands
  ? JSON.parse(code.restrictBrands).join(", ")
  : "";
```

### Soubor: `src/app/(admin)/admin/slevy/actions.ts`

V `createDiscountCode` a `updateDiscountCode` přidat parsing:

```tsx
const restrictCategoriesRaw = formData.get("restrictCategories") as string;
const restrictCategories = restrictCategoriesRaw?.trim()
  ? JSON.stringify(restrictCategoriesRaw.split(",").map((s) => s.trim()).filter(Boolean))
  : null;

const restrictBrandsRaw = formData.get("restrictBrands") as string;
const restrictBrands = restrictBrandsRaw?.trim()
  ? JSON.stringify(restrictBrandsRaw.split(",").map((s) => s.trim()).filter(Boolean))
  : null;
```

A přidat do `data` objektu:
```tsx
data: {
  // ...existing fields...
  restrictCategories,
  restrictBrands,
}
```

---

## Problém 5: Validace v API — respektovat omezení

### Soubor: `src/app/api/discount/validate/route.ts`

Přijmout `items` v request body a zkontrolovat omezení:

```diff
- const { code, subtotal } = (await req.json()) as {
+ const { code, subtotal, items } = (await req.json()) as {
    code?: string;
    subtotal?: number;
+   items?: Array<{ categorySlug?: string; brandName?: string; price: number }>;
  };
```

Po stávajících validacích (active, dates, usage) přidat:

```tsx
// Check category/brand restrictions
if (discount.restrictCategories && items) {
  const allowedCats: string[] = JSON.parse(discount.restrictCategories);
  const hasEligible = items.some((i) => i.categorySlug && allowedCats.includes(i.categorySlug));
  if (!hasEligible) {
    return NextResponse.json(
      { error: "Tento kód platí pouze pro vybrané kategorie." },
      { status: 400 },
    );
  }
}

if (discount.restrictBrands && items) {
  const allowedBrands: string[] = JSON.parse(discount.restrictBrands);
  const hasEligible = items.some((i) => i.brandName && allowedBrands.includes(i.brandName));
  if (!hasEligible) {
    return NextResponse.json(
      { error: "Tento kód platí pouze pro vybrané značky." },
      { status: 400 },
    );
  }
}
```

### Soubor: `src/app/(public)/pokladna/page.tsx`

Při volání `/api/discount/validate` přidat `items` do body:

```diff
const res = await fetch("/api/discount/validate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    code: discountInput.trim(),
    subtotal,
+   items: items.map((i) => ({
+     categorySlug: i.categorySlug,
+     brandName: i.brandName,
+     price: i.price,
+   })),
  }),
});
```

**Pozn.:** CartItem v `src/lib/cart.tsx` aktuálně NEMÁ `categorySlug` ani `brandName`. Budou potřeba přidat do CartItem interface a předávat při addToCart. Alternativně: nechat omezení jen na admin straně a nevalidovat v reálném čase (jednodušší) — uživatel dostane chybu při validate.

**Doporučení:** Pro MVP stačí kategorie/značka omezení v admin UI + DB, ale validaci v reálném čase odložit na druhou iteraci (vyžaduje rozšíření CartItem o metadata z produktu, což je invazivní změna). V první iteraci bude omezení spíš "informační" pro admina.

---

## Shrnutí implementačních kroků

| # | Soubor | Změna | Řádků |
|---|--------|-------|-------|
| 1 | `prisma/schema.prisma` | +restrictCategories, +restrictBrands | +2 |
| 2 | `actions.ts` | Parsing nových polí v create+update | +20 |
| 3 | `novy/page.tsx` | 2 nová input pole | +16 |
| 4 | `[id]/page.tsx` | 2 nová input pole + defaultValue + usage sekce | +50 |
| 5 | `page.tsx` (list) | Bez změn (stav zobrazení už funguje) | 0 |
| 6 | `validate/route.ts` | Budoucí: category/brand check | ODLOŽENO |
| 7 | `pokladna/actions.ts` | usageCount increment (ověřit zda chybí) | +5 |

**Celkem:** ~93 řádků nového kódu, 4 soubory + schema

---

## Závislosti
- Žádné závislosti na jiné tasky
- Schema push potřeba po úpravě modelu: `npx prisma db push`

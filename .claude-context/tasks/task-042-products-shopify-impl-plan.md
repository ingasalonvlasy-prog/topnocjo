# TASK-042: Produkty stránka Shopify upgrade — Implementační plán

## Aktuální stav kódu

### `src/app/(admin)/admin/produkty/page.tsx` (152 řádků):
- Search (název/značka), status filtr, brand filtr
- Dotaz: `prisma.product.findMany()` s include `brand`, `variants`, `categories`
- Předává data do `ProductTable` component
- Pagination (ručně skládané URL — zapomíná na parametry)
- Tlačítko "Nový produkt"
- **NEMÁ:** stat karty, category filtr, export tlačítko

### `src/app/(admin)/admin/produkty/ProductTable.tsx` (229 řádků):
- Tabulka s checkboxy + bulk actions
- Sloupce: Checkbox | Produkt (foto+název+variant count) | Značka | Typ | Cena | Sklad | Stav
- **NEMÁ:** sloupec Kategorie, vylepšený sklad display

### Existující komponenty:
- `StatCard` (`src/components/admin/StatCard.tsx`) — hotový, funguje na zákaznící stránce
- `requireAdmin()` (`src/lib/auth.ts:89`)

---

## FÁZE 1: Stat karty (4 karty nad tabulkou)

### Soubor: `src/app/(admin)/admin/produkty/page.tsx`

**1a) Přidat import StatCard:**
```tsx
import { StatCard } from "@/components/admin/StatCard";
```

**1b) Rozšířit Promise.all (řádek 27) — přidat allProducts a categories:**
```ts
const [products, total, brands, allProducts, categories] = await Promise.all([
  prisma.product.findMany({ ... }), // stávající
  prisma.product.count({ where }),   // stávající
  prisma.brand.findMany({ ... }),    // stávající
  // NOVÉ:
  prisma.product.findMany({
    select: {
      status: true,
      variants: { select: { ownStock: true, supplierStock: true, active: true } },
    },
  }),
  prisma.category.findMany({
    where: { parentId: null },
    orderBy: { position: "asc" },
    select: { name: true, slug: true },
  }),
]);
```

**1c) Stat kalkulace:**
```ts
const activeProducts = allProducts.filter(p => p.status === "ACTIVE").length;
const totalVariants = allProducts.reduce((sum, p) => sum + p.variants.length, 0);
const lowStockProducts = allProducts.filter(p => {
  const stock = p.variants
    .filter(v => v.active)
    .reduce((s, v) => s + v.ownStock + v.supplierStock, 0);
  return p.status === "ACTIVE" && stock > 0 && stock <= 2;
}).length;
const outOfStock = allProducts.filter(p => {
  if (p.status !== "ACTIVE") return false;
  return p.variants
    .filter(v => v.active)
    .reduce((s, v) => s + v.ownStock + v.supplierStock, 0) === 0;
}).length;
```

**1d) Stat karty UI (vložit mezi header div a filtry div):**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <StatCard
    label="Aktivní produkty"
    value={String(activeProducts)}
    change={`z ${allProducts.length} celkem`}
    changeType="neutral"
  />
  <StatCard
    label="Celkem variant"
    value={String(totalVariants)}
    changeType="neutral"
  />
  <StatCard
    label="Nízký sklad"
    value={String(lowStockProducts)}
    change="1-2 kusy"
    changeType={lowStockProducts > 0 ? "down" : "neutral"}
  />
  <StatCard
    label="Vyprodané"
    value={String(outOfStock)}
    change="aktivní bez skladu"
    changeType={outOfStock > 0 ? "down" : "neutral"}
  />
</div>
```

---

## FÁZE 2: Kategorie filtr

### Soubor: `src/app/(admin)/admin/produkty/page.tsx`

**2a) Přidat categoryFilter do searchParams (řádek ~14):**
```ts
const categoryFilter = (sp.category as string) || "";
```

**2b) Přidat do where (řádek ~25):**
```ts
if (categoryFilter) {
  where.categories = { some: { category: { slug: categoryFilter } } };
}
```

**2c) Přidat category select do filter baru (za brand select, řádek ~90):**
```tsx
<div className="w-40">
  <label className="block text-xs font-medium text-gray-500 mb-1">Kategorie</label>
  <select
    name="category"
    defaultValue={categoryFilter}
    className="w-full h-9 text-sm border border-gray-300 rounded-md px-2 bg-white focus:border-green-500 outline-none"
  >
    <option value="">Všechny</option>
    {categories.map((c) => (
      <option key={c.slug} value={c.slug}>{c.name}</option>
    ))}
  </select>
</div>
```

---

## FÁZE 3: Categories sloupec + vylepšený sklad v ProductTable

### Soubor: `src/app/(admin)/admin/produkty/page.tsx`

**3a) Přidat categories do product map (řádek 113-121):**
```ts
categories: p.categories.map(pc => pc.category.name),
```

### Soubor: `src/app/(admin)/admin/produkty/ProductTable.tsx`

**3b) Rozšířit Product interface (řádek 9):**
```ts
interface Product {
  id: string;
  name: string;
  status: string;
  photos: string;
  productType: string | null;
  brand: { name: string };
  variants: { price: number; ownStock: number; supplierStock: number }[];
  categories: string[];  // NOVÝ
}
```

**3c) Přidat Kategorie sloupec do thead (za "Typ" th, řádek ~128):**
```tsx
<th className="text-left px-4 py-3 font-medium text-gray-500 hidden xl:table-cell">Kategorie</th>
```

**3d) Přidat Kategorie cell do tbody (za typ td, řádek ~171):**
```tsx
<td className="px-4 py-3 text-gray-600 hidden xl:table-cell text-sm">
  {product.categories.length > 0
    ? product.categories.slice(0, 2).join(", ") + (product.categories.length > 2 ? ` +${product.categories.length - 2}` : "")
    : "—"}
</td>
```

**3e) Vylepšit sklad cell (nahradit řádky 175-179):**

Aktuální:
```tsx
<td className="px-4 py-3 text-center hidden lg:table-cell">
  <span className={`text-sm ${totalStock <= 2 ? "text-red-500 font-medium" : "text-gray-600"}`}>
    {totalStock}
  </span>
</td>
```

Nový:
```tsx
<td className="px-4 py-3 text-center hidden lg:table-cell">
  <div>
    <span className={`text-sm font-medium ${
      totalStock === 0 ? "text-red-500" : totalStock <= 2 ? "text-orange-500" : "text-gray-900"
    }`}>
      {totalStock}
    </span>
    <p className="text-[11px] text-gray-400">
      u {product.variants.filter(v => (v.ownStock + v.supplierStock) > 0).length}/{product.variants.length} variant
    </p>
  </div>
</td>
```

---

## FÁZE 4: Export CSV tlačítko + API route

### Soubor: `src/app/(admin)/admin/produkty/page.tsx`

**4a) Upravit header — zabalit do flex group (řádek 52-60):**

Aktuální: jen "Nový produkt" link.
Nový: flex div s Export CSV + Nový produkt.

```tsx
<div className="flex items-center gap-3">
  <a
    href="/api/admin/products/export"
    download
    className="h-9 px-4 flex items-center gap-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
  >
    Export CSV
  </a>
  <Link
    href="/admin/produkty/novy"
    className="h-9 px-4 flex items-center gap-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
  >
    {/* + icon */}
    Nový produkt
  </Link>
</div>
```

### Nový soubor: `src/app/api/admin/products/export/route.ts`

```ts
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  await requireAdmin();

  const products = await prisma.product.findMany({
    include: {
      brand: true,
      variants: { where: { active: true } },
      categories: { include: { category: true } },
    },
    orderBy: { name: "asc" },
  });

  function csvEscape(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  const header = ["Název", "Značka", "Typ", "Kategorie", "Stav", "Varianty", "Sklad", "Nejnižší cena (Kč)"];
  const rows = products.map(p => {
    const totalStock = p.variants.reduce((s, v) => s + v.ownStock + v.supplierStock, 0);
    const minPrice = p.variants.length > 0 ? Math.min(...p.variants.map(v => v.price)) : 0;
    const cats = p.categories.map(pc => pc.category.name).join("; ");
    return [
      csvEscape(p.name),
      csvEscape(p.brand.name),
      p.productType || "",
      csvEscape(cats),
      p.status,
      String(p.variants.length),
      String(totalStock),
      (minPrice / 100).toFixed(2).replace(".", ","),
    ];
  });

  const BOM = "\uFEFF";
  const csv = BOM + [header.map(csvEscape).join(","), ...rows.map(r => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produkty-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
```

---

## FÁZE 5: Pagination fix

### Soubor: `src/app/(admin)/admin/produkty/page.tsx`

**Aktuální pagination (řádky 125-149)** ručně skládá URL a zapomíná na `category` parametr.

**Nahradit za URLSearchParams pattern:**
```tsx
{totalPages > 1 && (
  <div className="flex items-center justify-between px-4 py-3 mt-4 bg-white rounded-lg border border-gray-200 shadow-sm">
    <p className="text-sm text-gray-500">Strana {page} z {totalPages}</p>
    <div className="flex gap-2">
      {page > 1 && (
        <Link
          href={`/admin/produkty?${new URLSearchParams({
            ...(search ? { q: search } : {}),
            ...(status ? { status } : {}),
            ...(brandFilter ? { brand: brandFilter } : {}),
            ...(categoryFilter ? { category: categoryFilter } : {}),
            page: String(page - 1),
          })}`}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-white transition-colors"
        >
          Předchozí
        </Link>
      )}
      {page < totalPages && (
        <Link
          href={`/admin/produkty?${new URLSearchParams({
            ...(search ? { q: search } : {}),
            ...(status ? { status } : {}),
            ...(brandFilter ? { brand: brandFilter } : {}),
            ...(categoryFilter ? { category: categoryFilter } : {}),
            page: String(page + 1),
          })}`}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-white transition-colors"
        >
          Další
        </Link>
      )}
    </div>
  </div>
)}
```

---

## KONTROLNÍ SEZNAM

- [ ] `src/app/(admin)/admin/produkty/page.tsx` — stat karty, category filtr, export button, categories data, pagination fix
- [ ] `src/app/(admin)/admin/produkty/ProductTable.tsx` — categories sloupec, vylepšený sklad display
- [ ] `src/app/api/admin/products/export/route.ts` — NOVÝ (s `requireAdmin()`)
- [ ] Ověřit `npm run build`
- [ ] Otestovat: všechny filtry fungují společně (search + status + brand + category)
- [ ] Otestovat: stat karty zobrazují správná čísla
- [ ] Otestovat: export CSV stáhne validní soubor

## ROZSAH: ~130 řádků nového kódu + úpravy ve 2 stávajících + 1 nový soubor

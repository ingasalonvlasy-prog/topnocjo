# TASK-042: Produkty stránka — Shopify úroveň

## Přehled

Aktuální stav produktové stránky je funkční, ale chybí klíčové Shopify features:
- Žádné stat karty (obrátka zásob, ABC analýza)
- Chybí sloupec Kategorie v tabulce
- Sklad zobrazuje jen číslo, ne "X skladem u Y variant"
- Chybí Export/Import tlačítka
- Chybí filtr podle kategorie

## CO UŽ EXISTUJE (nepřepisovat)

- Searchbar (hledání podle názvu/značky)
- Status filtr (Aktivní/Koncept/Archiv)
- Brand filtr (select z DB)
- ProductTable s bulk checkboxy + bulk actions (Aktivovat/Deaktivovat/Archivovat/Smazat)
- Thumbnail fotky v tabulce
- Pagination
- Tlačítko "Nový produkt"

---

## FÁZE 1: Stat karty nad tabulkou

### Soubor: `src/app/(admin)/admin/produkty/page.tsx`

**Přidat do server dotazu (Promise.all na řádku 27):**

```ts
const [products, total, brands, allProducts, categories] = await Promise.all([
  // ... stávající dotazy ...
  prisma.product.findMany({
    select: {
      status: true,
      variants: { select: { ownStock: true, supplierStock: true, price: true, active: true } },
    },
  }),
  prisma.category.findMany({ where: { parentId: null }, orderBy: { position: "asc" } }),
]);
```

**Stat karty výpočet:**

```ts
// Celkem produktů
const totalProducts = allProducts.length;
const activeProducts = allProducts.filter(p => p.status === "ACTIVE").length;

// Celkový sklad
const totalStock = allProducts.reduce((sum, p) => 
  sum + p.variants.reduce((vs, v) => vs + v.ownStock + v.supplierStock, 0), 0);

// Low stock (≤2 kusy celkem)
const lowStockProducts = allProducts.filter(p => {
  const stock = p.variants.filter(v => v.active).reduce((s, v) => s + v.ownStock + v.supplierStock, 0);
  return stock > 0 && stock <= 2;
}).length;

// Vyprodané (0 kusů, aktivní produkt)
const outOfStock = allProducts.filter(p => {
  if (p.status !== "ACTIVE") return false;
  const stock = p.variants.filter(v => v.active).reduce((s, v) => s + v.ownStock + v.supplierStock, 0);
  return stock === 0;
}).length;
```

**Stat karty UI (přidat mezi header a filtry):**

```tsx
import { StatCard } from "@/components/admin/StatCard";

{/* Stat cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <StatCard
    label="Celkem produktů"
    value={String(totalProducts)}
    change={`${activeProducts} aktivních`}
    changeType="neutral"
  />
  <StatCard
    label="Celkový sklad"
    value={`${totalStock} ks`}
    changeType="neutral"
  />
  <StatCard
    label="Nízký sklad"
    value={String(lowStockProducts)}
    change="≤2 kusy"
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

## FÁZE 2: Kategorie filtr + sloupec

### Soubor: `src/app/(admin)/admin/produkty/page.tsx`

**Přidat category filtr do searchParams:**
```ts
const categoryFilter = (sp.category as string) || "";
```

**Přidat do where:**
```ts
if (categoryFilter) {
  where.categories = { some: { category: { slug: categoryFilter } } };
}
```

**Přidat select do filter baru (za brand select, řádek ~90):**
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

**Přidat categories do product data předávaného do ProductTable:**

V `products.map()` přidat:
```ts
categories: p.categories.map(pc => pc.category.name),
```

### Soubor: `src/app/(admin)/admin/produkty/ProductTable.tsx`

**Rozšířit Product interface:**
```ts
interface Product {
  // ... stávající ...
  categories: string[];  // <-- NOVÝ
}
```

**Přidat sloupec do thead (za "Typ"):**
```tsx
<th className="text-left px-4 py-3 font-medium text-gray-500 hidden xl:table-cell">Kategorie</th>
```

**Přidat sloupec do tbody (za typ cell):**
```tsx
<td className="px-4 py-3 text-gray-600 hidden xl:table-cell">
  {product.categories.length > 0 ? product.categories.join(", ") : "—"}
</td>
```

---

## FÁZE 3: Vylepšený sklad display

### Soubor: `src/app/(admin)/admin/produkty/ProductTable.tsx`

**Aktuální sklad cell (řádek 175-179):**
```tsx
<td className="px-4 py-3 text-center hidden lg:table-cell">
  <span className={`text-sm ${totalStock <= 2 ? "text-red-500 font-medium" : "text-gray-600"}`}>
    {totalStock}
  </span>
</td>
```

**Nový sklad cell:**
```tsx
<td className="px-4 py-3 text-center hidden lg:table-cell">
  <div>
    <span className={`text-sm font-medium ${totalStock === 0 ? "text-red-500" : totalStock <= 2 ? "text-orange-500" : "text-gray-900"}`}>
      {totalStock} skladem
    </span>
    <p className="text-xs text-gray-400">
      u {product.variants.filter(v => (v.ownStock + v.supplierStock) > 0).length} z {product.variants.length} variant
    </p>
  </div>
</td>
```

Aby fungovalo počítání variant s stockem, ProductTable interface pro variants potřebuje:
```ts
variants: { price: number; ownStock: number; supplierStock: number }[];
```
Toto UŽ existuje — není potřeba měnit.

---

## FÁZE 4: Export tlačítko

### Soubor: `src/app/(admin)/admin/produkty/page.tsx`

**Přidat vedle "Nový produkt" (řádek 52-60):**

```tsx
<div className="flex items-center gap-3">
  <a
    href="/api/admin/products/export"
    download
    className="h-9 px-4 flex items-center gap-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
  >
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
    Export CSV
  </a>
  <Link
    href="/admin/produkty/novy"
    className="h-9 px-4 flex items-center gap-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
  >
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
    Nový produkt
  </Link>
</div>
```

### Nový soubor: `src/app/api/admin/products/export/route.ts`

```ts
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  // Auth check (pokud Task #39 je hotový, použít requireAdmin)
  const user = await getCurrentUser();
  if (!user || (user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    include: {
      brand: true,
      variants: { where: { active: true } },
      categories: { include: { category: true } },
    },
    orderBy: { name: "asc" },
  });

  const header = "ID,Název,Značka,Typ,Kategorie,Stav,Varianty,Sklad,Nejnižší cena";
  const rows = products.map(p => {
    const totalStock = p.variants.reduce((s, v) => s + v.ownStock + v.supplierStock, 0);
    const minPrice = p.variants.length > 0 ? Math.min(...p.variants.map(v => v.price)) : 0;
    const cats = p.categories.map(pc => pc.category.name).join("; ");
    return [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.brand.name}"`,
      p.productType || "",
      `"${cats}"`,
      p.status,
      p.variants.length,
      totalStock,
      (minPrice / 100).toFixed(2),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produkty-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
```

---

## FÁZE 5: Pagination query string fix

### Soubor: `src/app/(admin)/admin/produkty/page.tsx`

Aktuální pagination (řádky 131-147) ručně sestavuje URL a zapomene na `category` filtr.

**Opravit:** Místo ručního skládání parametrů použít URLSearchParams:

```tsx
{totalPages > 1 && (() => {
  const baseParams = new URLSearchParams();
  if (search) baseParams.set("q", search);
  if (status) baseParams.set("status", status);
  if (brandFilter) baseParams.set("brand", brandFilter);
  if (categoryFilter) baseParams.set("category", categoryFilter);
  
  return (
    <div className="flex items-center justify-between px-4 py-3 mt-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <p className="text-sm text-gray-500">Strana {page} z {totalPages}</p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={`/admin/produkty?${new URLSearchParams([...baseParams, ["page", String(page - 1)]])}`}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-white transition-colors"
          >
            Předchozí
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={`/admin/produkty?${new URLSearchParams([...baseParams, ["page", String(page + 1)]])}`}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-white transition-colors"
          >
            Další
          </Link>
        )}
      </div>
    </div>
  );
})()}
```

---

## KONTROLNÍ SEZNAM PRO IMPLEMENTÁTORA

- [ ] Přidat 4 stat karty: celkem, celkový sklad, nízký sklad, vyprodané
- [ ] Přidat category filtr do searchParams + where + UI
- [ ] Přidat categories sloupec do ProductTable
- [ ] Vylepšit sklad zobrazení: "X skladem u Y z Z variant"
- [ ] Přidat Export CSV tlačítko + API route
- [ ] Opravit pagination query string (přidat category param)
- [ ] Ověřit build: `npm run build`
- [ ] Otestovat: filtry fungují společně (search + status + brand + category)
- [ ] Otestovat: export CSV stáhne platný soubor

## SOUBORY K ÚPRAVĚ

1. `src/app/(admin)/admin/produkty/page.tsx` — stat karty, category filtr, export button, pagination fix
2. `src/app/(admin)/admin/produkty/ProductTable.tsx` — categories sloupec, vylepšený sklad display
3. `src/app/api/admin/products/export/route.ts` — NOVÝ soubor

## ODHAD ROZSAHU

~120 řádků nového kódu + úpravy ve 2 stávajících souborech + 1 nový API route

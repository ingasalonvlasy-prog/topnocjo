# Plán: TASK-034 — Admin analytika + statistiky

**Priorita:** 2
**Soubory k úpravě:**
- `src/app/(admin)/admin/analytika/page.tsx` (393 řádků)
- `src/app/(admin)/admin/page.tsx` — dashboard

---

## Analýza stávajícího stavu

### Co je hotovo (90%):
1. **Stat karty** — tržby celkem, tržby měsíc, objednávky celkem, průměrná objednávka, zákazníci celkem, nové objednávky
2. **Denní tržby** — tabulka za 30 dní s CSS bar chart (zelené pruhy)
3. **Top produkty** — tabulka top 10 za 30 dní (název, ks, tržby)
4. **Top značky** — tabulka top 10 za 30 dní
5. **Objednávky dle stavu** — seznam s badges a počty

### Co chybí dle zadání:

| # | Funkce | Stav | Náročnost |
|---|--------|------|-----------|
| 1 | Přepínání období (7/30/90 dní) | Chybí (hardcoded 30 dní) | NÍZKÁ |
| 2 | Top kategorie | Chybí | STŘEDNÍ |
| 3 | Konverzní poměr | Chybí | NÍZKÁ |

---

## Problém 1: Přepínání období (7/30/90 dní)

**Soubor:** `src/app/(admin)/admin/analytika/page.tsx`

Aktuálně `thirtyDaysAgo` je hardcoded. Řešení: přijmout `obdobi` z searchParams.

```tsx
export default async function AdminAnalyticsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const days = parseInt(params.obdobi || "30", 10);
  const validDays = [7, 30, 90].includes(days) ? days : 30;
  const periodStart = new Date(now.getTime() - validDays * 24 * 60 * 60 * 1000);
```

Přidat period selector nad stat karty:

```tsx
<div className="flex gap-2 mb-6">
  {[7, 30, 90].map((d) => (
    <Link
      key={d}
      href={`/admin/analytika?obdobi=${d}`}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        validDays === d
          ? "bg-gray-900 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {d} dní
    </Link>
  ))}
</div>
```

Nahradit `thirtyDaysAgo` za `periodStart` ve všech queries.

---

## Problém 2: Top kategorie

**Soubor:** `src/app/(admin)/admin/analytika/page.tsx`

V data fetching přidat:

```tsx
// V orderItems30d query (přejmenovat na orderItemsPeriod)
// Přidat select: productId
// Pak joinovat s product → categories

const categoryMap = new Map<string, { name: string; quantity: number; revenue: number }>();
for (const item of orderItemsPeriod) {
  if (!item.productId) continue;
  const product = await prisma.product.findUnique({
    where: { id: item.productId },
    select: { categories: { include: { category: true } } },
  });
  // ... aggregate per category
}
```

**Optimalizace:** Místo N+1 query, načíst product→category mapping jednou:

```tsx
const productCategories = await prisma.productCategory.findMany({
  where: { productId: { in: uniqueProductIds } },
  include: { category: { select: { name: true, slug: true } } },
});

const productCatMap = new Map<string, string[]>();
for (const pc of productCategories) {
  const cats = productCatMap.get(pc.productId) || [];
  cats.push(pc.category.name);
  productCatMap.set(pc.productId, cats);
}
```

Přidat tabulku "Top kategorie" vedle "Top značky":

```tsx
<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
  <div className="px-4 py-3 border-b border-gray-200">
    <h2 className="font-semibold text-gray-900">Top kategorie ({validDays} dní)</h2>
  </div>
  {/* Tabulka: Kategorie, Prodáno ks, Tržby */}
</div>
```

---

## Problém 3: Konverzní poměr

**Soubor:** `src/app/(admin)/admin/analytika/page.tsx`

Jednoduchá metrika: PAID objednávky / celkové objednávky za období.

```tsx
const periodOrders = await prisma.order.count({ where: { createdAt: { gte: periodStart } } });
const periodPaid = await prisma.order.count({ where: { paymentStatus: "PAID", createdAt: { gte: periodStart } } });
const conversionRate = periodOrders > 0 ? Math.round((periodPaid / periodOrders) * 100) : 0;
```

Přidat jako StatCard:

```tsx
<StatCard
  label="Konverze plateb"
  value={`${conversionRate} %`}
  change={`${periodPaid} z ${periodOrders}`}
  changeType={conversionRate > 50 ? "up" : "neutral"}
/>
```

---

## Shrnutí

| # | Soubor | Změna | Řádků |
|---|--------|-------|-------|
| 1 | `analytika/page.tsx` | Period selector + searchParams | +15 |
| 2 | `analytika/page.tsx` | Top kategorie sekce | +40 |
| 3 | `analytika/page.tsx` | Konverzní poměr StatCard | +10 |

**Celkem:** ~65 řádků, 1 soubor

# TASK-039: Admin objednavky seznam — Shopify level

## Aktualni stav

**Soubory:**
- `src/app/(admin)/admin/objednavky/page.tsx` — Server Component, 317 radku
- `src/components/admin/OrderFilters.tsx` — Client Component, filtry (stav, platba, datum, search)
- `src/components/admin/ExportOrdersButton.tsx` — Client Component, CSV export
- `src/components/admin/StatCard.tsx` — Server Component, 27 radku (label, value, change, icon)
- `src/lib/order-constants.ts` — ORDER_STATUSES, PAYMENT_STATUSES, barvy, labels, prechody

**Aktualni features:**
- 4 stat linky (badge styly): Nove, Ceka platba, Ceka dodavatel, K odeslani
- Filtry: select stav, select platba, date from, date to, search input
- Tabulka 7 sloupcu: Cislo, Zakaznik, Datum, Doprava, Stav (badge), Platba (badge), Celkem
- Paginace po 20 (PER_PAGE = 20)
- Export CSV tlacitko

**Co chybi oproti Shopify:**
- Stat karty se sparkline mini-grafy (6 karet)
- Checkbox bulk select
- Vice sloupcu: Polozky, Stav plneni, Metoda doruceni
- Tlacitka: Vytvorit objednavku, Dalsi akce
- Paginace 1-50

---

## Implementacni plan

### KROK 1: StatCard sparkline upgrade
**Soubor:** `src/components/admin/StatCard.tsx`

Pridat optional `sparkline` prop. Kdyz je pritomny, renderovat SVG polyline.

```tsx
// NOVY interface
interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: React.ReactNode;
  sparkline?: number[];  // NEW — 7 cisel pro trend
}

// Sparkline helper (uvnitr StatCard.tsx)
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const h = 28;
  const w = 60;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 2)}`)
    .join(" ");
  // Trend: posledni > prvni = zelena, jinak cervena
  const trending = data[data.length - 1] >= data[0];
  const color = trending ? "#16a34a" : "#dc2626"; // green-600 / red-600
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

**Uprava StatCard renderovani:**
- Pridat `{sparkline && <Sparkline data={sparkline} />}` vedle icon na pravou stranu
- Zpetne kompatibilni — bez sparkline prop se chova stejne

---

### KROK 2: Stat karty na objednavky seznamu (6 karet)
**Soubor:** `src/app/(admin)/admin/objednavky/page.tsx`

Nahradit aktualni StatLink badges za 6 StatCard karet v gridu `grid-cols-2 md:grid-cols-3 lg:grid-cols-6`.

**Data queries** — pridat do existujiciho `Promise.all`:

```ts
// Posledních 7 dní pro sparklines
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
sevenDaysAgo.setHours(0, 0, 0, 0);

// Vsechny objednavky za 7 dní (pro sparkline agregaci)
const recentOrders = await prisma.order.findMany({
  where: { createdAt: { gte: sevenDaysAgo } },
  select: {
    createdAt: true,
    status: true,
    paymentStatus: true,
    total: true,
    shippedAt: true,
    items: { select: { quantity: true } },
  },
});
```

**Agregace do 7-dennich poli (server-side helper):**
```ts
function aggregateByDay(
  orders: typeof recentOrders,
  filterFn: (o: typeof recentOrders[0]) => boolean,
  valueFn: (o: typeof recentOrders[0]) => number
): number[] {
  const result: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
    const dayOrders = orders.filter(
      (o) => o.createdAt >= dayStart && o.createdAt <= dayEnd && filterFn(o)
    );
    result.push(dayOrders.reduce((sum, o) => sum + valueFn(o), 0));
  }
  return result;
}
```

**6 stat karet:**

| # | Label | Value | Sparkline data | Change |
|---|-------|-------|----------------|--------|
| 1 | Objednavky dnes | count today | aggregateByDay(all, () => true, () => 1) | vs vcera % |
| 2 | Objednane polozky | sum items.quantity today | aggregateByDay(all, ..., items sum) | vs vcera % |
| 3 | Trzby dnes | formatPrice(sum total today where PAID) | aggregateByDay(PAID, total) | vs vcera % |
| 4 | Splnene objednavky | count SHIPPED today | aggregateByDay(SHIPPED, 1) | count 7d |
| 5 | Dorucene objednavky | count DELIVERED today | aggregateByDay(DELIVERED, 1) | count 7d |
| 6 | Prumer. doba plneni | avg dny (shippedAt - createdAt) | BEZ sparkline | "X dni" |

**Icon pro kazdou kartu** — pouzit existujici Heroicons outline SVG (uz pouzite v dashboardu):
1. ShoppingCart
2. CubeTransparent
3. CurrencyDollar
4. Truck
5. CheckCircle
6. Clock

---

### KROK 3: Bohatsi tabulka
**Soubor:** `src/app/(admin)/admin/objednavky/page.tsx`

#### 3a. Nove sloupce

Aktualni sloupce: Cislo | Zakaznik | Datum | Doprava | Stav | Platba | Celkem

**Novy layout sloupcu (10):**

| Sloupec | Sirka | Zdroj dat | Poznamka |
|---------|-------|-----------|----------|
| Checkbox | w-10 | client state | select/deselect |
| #Cislo | auto | order.orderNumber | link na detail |
| Datum | nowrap | order.createdAt | "10. lis" format |
| Zakaznik | auto | firstName + lastName, email pod | 2 radky |
| Polozky | w-16 center | order.items.length | cislo, napr. "3" |
| Celkem | right nowrap | order.total | formatPrice, bold |
| Platba | auto | paymentStatus | badge |
| Plneni | auto | DERIVED from status | nova badge — viz mapovani nize |
| Doruceni | auto | shipping.name | kratky text |

**Stav plneni mapovani (nove):**
```ts
type FulfillmentStatus = "UNFULFILLED" | "IN_PROGRESS" | "FULFILLED" | "DELIVERED";

function getFulfillmentStatus(orderStatus: string): { label: string; bg: string; text: string } {
  switch (orderStatus) {
    case "NEW":
    case "CONFIRMED":
      return { label: "Nesplneno", bg: "bg-yellow-100", text: "text-yellow-700" };
    case "PROCESSING":
    case "AWAITING_SUPPLIER":
      return { label: "Probiha", bg: "bg-blue-100", text: "text-blue-700" };
    case "SHIPPED":
      return { label: "Splneno", bg: "bg-green-100", text: "text-green-700" };
    case "DELIVERED":
      return { label: "Doruceno", bg: "bg-green-100", text: "text-green-700" };
    case "CANCELLED":
      return { label: "Zruseno", bg: "bg-red-100", text: "text-red-700" };
    default:
      return { label: orderStatus, bg: "bg-gray-100", text: "text-gray-700" };
  }
}
```

**Poznamka:** Sloupec "Stav" (order status) ODEBRAT — nahrazujeme ho dvema sloupci "Platba" a "Plneni", coz je Shopify pattern. Puvodni stav objednavky se implicitne vyjadri pres fulfillment badge.

#### 3b. Items count v include

Uz existujici `include: { items: true }` staci — `order.items.length` da pocet polozek.

---

### KROK 4: Checkbox bulk select (Client Component)
**Novy soubor:** `src/app/(admin)/admin/objednavky/OrdersTable.tsx` ("use client")

Server component nacte data a preda je klientskemu wrapperu.

```tsx
// page.tsx — server component
// ... existujici data loading ...
return (
  <div>
    {/* Stat karty — zustavaji server rendered */}
    {/* Filtry — zustavaji */}
    <OrdersTable
      orders={orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        firstName: o.firstName,
        lastName: o.lastName,
        email: o.email,
        createdAt: o.createdAt.toISOString(),
        shippingName: o.shipping?.name || "-",
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: o.total,
        itemCount: o.items.length,
      }))}
      page={page}
      totalPages={totalPages}
      total={total}
      params={params}
    />
  </div>
);
```

**OrdersTable.tsx ("use client"):**
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/products";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/lib/order-constants";

interface OrderRow {
  id: string;
  orderNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  shippingName: string;
  status: string;
  paymentStatus: string;
  total: number;
  itemCount: number;
}

interface Props {
  orders: OrderRow[];
  page: number;
  totalPages: number;
  total: number;
  params: Record<string, string | undefined>;
}

export function OrdersTable({ orders, page, totalPages, total, params }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = orders.length > 0 && orders.every(o => selected.has(o.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map(o => o.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  // ... render tabulku s checkboxy + bulk action bar
}
```

**Bulk action bar** — zobrazit nad tabulkou kdyz selected.size > 0:
```tsx
{selected.size > 0 && (
  <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-200">
    <span className="text-sm font-medium text-blue-700">
      {selected.size} vybrano
    </span>
    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
      Exportovat vybrane
    </button>
  </div>
)}
```

---

### KROK 5: Header tlacitka
**Soubor:** `src/app/(admin)/admin/objednavky/page.tsx`

Nahradit jednoduchy ExportOrdersButton za button group:

```tsx
<div className="flex items-center gap-2">
  {/* Export — existujici component */}
  <Suspense fallback={null}>
    <ExportOrdersButton />
  </Suspense>

  {/* Dalsi akce — dropdown placeholder */}
  <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
    Dalsi akce
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  </button>

  {/* Vytvorit objednavku — primary */}
  <Link
    href="/admin/objednavky/nova"
    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800"
  >
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
    Vytvorit objednavku
  </Link>
</div>
```

---

### KROK 6: Paginace 1-50
**Soubor:** `src/app/(admin)/admin/objednavky/page.tsx`

```ts
const PER_PAGE = 50; // zmena z 20
```

Paginace logika zustava stejna — uz podporuje libovolny PER_PAGE.

---

## Souhrn zmen podle souboru

| Soubor | Akce | Radky odhad |
|--------|------|-------------|
| `src/components/admin/StatCard.tsx` | Pridat sparkline prop + SVG helper | +35 |
| `src/app/(admin)/admin/objednavky/page.tsx` | Prepis stat karet (6x StatCard), data queries, header buttons, PER_PAGE=50, predani dat do OrdersTable | ~200 zmen |
| `src/app/(admin)/admin/objednavky/OrdersTable.tsx` | **NOVY** — client component pro tabulku s checkboxy, bulk akce, fulfillment badges | ~180 novy |
| `src/components/admin/OrderFilters.tsx` | Beze zmen (filtry uz jsou solidni) | 0 |
| `src/components/admin/ExportOrdersButton.tsx` | Beze zmen | 0 |
| `src/lib/order-constants.ts` | Pridat getFulfillmentStatus helper | +15 |

**Celkem:** ~430 radku zmen/novych, 1 novy soubor

## Zavislosti

- StatCard.tsx musi byt hotovy PRED objednavky page.tsx
- OrdersTable.tsx je nezavisly, muze se delat paralelne se stat kartami
- getFulfillmentStatus v order-constants.ts musi existovat pred OrdersTable

## Rizika

- **Vykon:** 7-dennich sparkline dat = 1 extra query. Pouzivame jediny `findMany` + server-side agregaci, takze OK.
- **Bulk akce:** Zatim jen UI (export vybranych). Skutecne bulk status zmeny budou dalsi faze.
- **"Vytvorit objednavku":** Link na `/admin/objednavky/nova` — stranka zatim neexistuje. Implementator ji muze nechat jako 404 nebo pridat placeholder.

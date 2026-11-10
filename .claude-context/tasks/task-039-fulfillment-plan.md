# TASK-039: Fulfillment management — ShipD Delivery styl

## Aktualni stav

**Neexistuje zadna fulfillment stranka.** Momentalne se vsechno ridi pres objednavky detail (zmena stavu, tracking). Chybi dedickovany pohled pro expedici zasilek.

**Existujici relevantni soubory:**
- `src/app/(admin)/admin/objednavky/[id]/actions.ts` — updateOrderStatus, updateTracking (uz fungujici)
- `src/app/(admin)/admin/objednavky/[id]/balici-list/page.tsx` — packing slip (uz existuje)
- `src/lib/zasilkovna.ts` — createZasilkovnaPacket (uz existuje)
- `src/lib/order-constants.ts` — stavy, prechody, labels

**Prisma Order model relevantni pole:**
- `status`: NEW, CONFIRMED, PROCESSING, AWAITING_SUPPLIER, SHIPPED, DELIVERED, CANCELLED
- `paymentStatus`: PENDING, PAID, CANCELLED, REFUNDED
- `shippingId` → ShippingMethod (name, code, type, config)
- `packetaPointId`, `packetaPointName` — Zasilkovna vydejna
- `trackingNumber`, `trackingUrl`
- `shippedAt`, `deliveredAt`
- `needsSupplierOrder`, `supplierOrderedAt`, `supplierReceivedAt`

---

## Implementacni plan

### KROK 1: Nova stranka fulfillment
**Novy soubor:** `src/app/(admin)/admin/objednavky/fulfillment/page.tsx`

Server Component s tabs a tabulkou.

**URL:** `/admin/objednavky/fulfillment`
**Params:** `?tab=all|unfulfilled|fulfilled` (default: unfulfilled)

#### Data query

```ts
const tab = params.tab || "unfulfilled";

const where: Record<string, unknown> = {};

if (tab === "unfulfilled") {
  where.status = { in: ["NEW", "CONFIRMED", "PROCESSING", "AWAITING_SUPPLIER"] };
  where.paymentStatus = "PAID"; // jen zaplacene — logicky, neplnime nezaplacene
} else if (tab === "fulfilled") {
  where.status = { in: ["SHIPPED", "DELIVERED"] };
}
// tab === "all" → zadny filtr

const orders = await prisma.order.findMany({
  where,
  include: {
    shipping: true,
    items: { select: { quantity: true } },
  },
  orderBy: { createdAt: "desc" },
  take: 100,
});
```

### KROK 2: Layout stranky

```
┌──────────────────────────────────────────────────────────┐
│ Plneni objednavek                                         │
│                                                           │
│ [Packing slipy]  [Export CSV]  [Predavaci protokol]       │
│                                                           │
│ [Vse (42)] | [Nesplnene (15)] | [Splnene (27)]           │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ □  #Cislo  Zakaznik  Vytvoreno  Cena  Stav  Track  │   │
│ │    ing  Doprava                                     │   │
│ │ ☐  QS-1076 Jan Nov.  10.11.    890   ●Nespl  —    │   │
│ │    GLS — na adresu                                  │   │
│ │ ☐  QS-1075 Eva K.    9.11.     1290  ●Nespl  —    │   │
│ │    Zasilkovna — Z-BOX Florenc, Ke Stitkovu 12      │   │
│ └─────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### KROK 3: Akcni tlacitka nahore

```tsx
<div className="flex flex-wrap items-center gap-2 mb-4">
  {/* Packing slipy — batch tisk */}
  <button
    onClick={() => {/* TODO: batch print packing slips */}}
    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
  >
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
    Packing slipy
  </button>

  {/* Export CSV */}
  <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
    Export CSV
  </button>

  {/* Predavaci protokol — placeholder */}
  <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50" disabled>
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
    Predavaci protokol
  </button>
</div>
```

**Pozn:** Packing slipy a CSV export budou ze zacatku jen vizualni tlacitka. Funkcionalitu muze implementator pridat — batch packing slip = otevre vsechny vybrane balici listy v novem okne. CSV export = sdili logiku s existujicim ExportOrdersButton.

### KROK 4: Tabs

```tsx
const tabs = [
  { key: "all", label: "Vse", count: allCount },
  { key: "unfulfilled", label: "Nesplnene", count: unfulfilledCount },
  { key: "fulfilled", label: "Splnene", count: fulfilledCount },
];

<div className="flex border-b border-gray-200 mb-4">
  {tabs.map(t => (
    <Link
      key={t.key}
      href={`/admin/objednavky/fulfillment?tab=${t.key}`}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        tab === t.key
          ? "border-gray-900 text-gray-900"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      {t.label} ({t.count})
    </Link>
  ))}
</div>
```

**Data pro counts** — 3 count queries v Promise.all:
```ts
const [allCount, unfulfilledCount, fulfilledCount] = await Promise.all([
  prisma.order.count(),
  prisma.order.count({
    where: {
      status: { in: ["NEW", "CONFIRMED", "PROCESSING", "AWAITING_SUPPLIER"] },
      paymentStatus: "PAID",
    },
  }),
  prisma.order.count({
    where: { status: { in: ["SHIPPED", "DELIVERED"] } },
  }),
]);
```

### KROK 5: Tabulka

**Sloupce:**

| Sloupec | Obsah | Poznamka |
|---------|-------|----------|
| Checkbox | bulk select | client component (FulfillmentTable.tsx) |
| #Cislo | orderNumber link | link na detail |
| Zakaznik | firstName lastName | |
| Vytvoreno | createdAt relativni | "Dnes", "Vcera", "Pred 3 dny" |
| Cena | total | formatPrice |
| Stav | fulfillment badge | Nesplneno/Probiha/Splneno |
| Tracking | trackingNumber + datum | cislo + shippedAt, nebo "—" |
| Doprava | shipping.name + detail | GLS — na adresu NEBO Zasilkovna — Z-BOX nazev, adresa |

**Doprava detail format:**
```tsx
<td className="px-4 py-3">
  <div className="text-sm font-medium text-gray-900">
    {order.shipping?.name}
  </div>
  {order.packetaPointName && (
    <div className="text-xs text-gray-500 mt-0.5">
      {order.packetaPointName}
    </div>
  )}
</td>
```

**Relativni datum helper:**
```ts
function formatRelative(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Dnes";
  if (diff === 1) return "Vcera";
  return `Pred ${diff} dny`;
}
```

### KROK 6: Client component pro checkboxy
**Novy soubor:** `src/app/(admin)/admin/objednavky/fulfillment/FulfillmentTable.tsx` ("use client")

Stejna logika jako OrdersTable.tsx z orders-list planu — selectedIds state, select all, bulk action bar.

### KROK 7: Sidebar link
**Soubor:** `src/components/admin/AdminSidebar.tsx`

Pridat polozku pod "Objednavky":

```tsx
{
  href: "/admin/objednavky/fulfillment",
  label: "Plneni",
  icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  ),
},
```

---

## Souhrn zmen

| Soubor | Akce | Odhad |
|--------|------|-------|
| `src/app/(admin)/admin/objednavky/fulfillment/page.tsx` | **NOVY** — Server Component, tabs, data, layout | ~200 radku |
| `src/app/(admin)/admin/objednavky/fulfillment/FulfillmentTable.tsx` | **NOVY** — Client Component, checkboxy, tabulka, bulk bar | ~150 radku |
| `src/components/admin/AdminSidebar.tsx` | Pridat "Plneni" link | +15 radku |

**Celkem:** ~365 radku, 2 nove soubory

## Zavislosti
- `getFulfillmentStatus` z order-constants.ts (sdileno, z planu orders-list)
- `formatPrice` z lib/products (existujici)
- Sidebar zmena je trivialni a nezavisla

## Rizika
- **Batch packing slipy**: implementace = otevrit vicero `/admin/objednavky/{id}/balici-list` v novych tabech. Alternativa: vytvorit batch endpoint ktery renderuje vicero balicich listu na jedne strance. Doporucuji zacit s jednoduchou variantou (multi-tab open).
- **CSV export fulfillment**: muze sdílet logiku s existujicim `/api/admin/orders/export` — jen pridat fulfillment-specificke filtry.

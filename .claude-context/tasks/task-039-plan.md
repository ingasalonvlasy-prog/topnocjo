# Plán: TASK-039 — Admin upgrade na Shopify úroveň

**Priorita:** 1 (uživatel chce Shopify-level admin)
**Rozsah:** 8 admin stránek + komponenty + sidebar

---

## Porovnání: Shopify vs. aktuální stav

### Co Shopify má a my NE:

| Funkce | Shopify | Qsport aktuálně | Priorita |
|--------|---------|-----------------|----------|
| **Objednávky — stat karty se sparklines** | 6 stat karet s mini-grafy | 4 StatLink badges (jen počty) | VYSOKÁ |
| **Objednávky — bulk checkboxy** | Bulk select + hromadné akce | Žádné checkboxy | STŘEDNÍ |
| **Objednávky — sloupec Položky** | Počet položek ve sloupci | Chybí | NÍZKÁ |
| **Objednávky — splnění/fulfillment** | Nesplněno/Probíhá/Splněno badges | Jen status objednávky | VYSOKÁ |
| **Detail — obrázky produktů** | Thumbnaily v item tabulce | Žádné obrázky | STŘEDNÍ |
| **Detail — marže/nákupní cena** | Metapole: Marže, Nákupní cena | Jen "Zdroj" (vlastní/dodavatel) | NÍZKÁ |
| **Detail — DPH řádek** | Mezisoučet, Doprava, DPH 21%, Celkem | Mezisoučet, Doprava, Celkem (bez DPH) | STŘEDNÍ |
| **Detail — mapa doručovací adresy** | "Zobrazit mapu" link | Chybí | NÍZKÁ |
| **Detail — riziko objednávky** | Bar Nízké/Střední/Vysoké | Chybí | NÍZKÁ (nemáme data) |
| **Doprava — štítky + packing slipy** | Vytvořit štítky, Tisknout, Packing slipy | Jen balicí list per objednávka | STŘEDNÍ |
| **Doprava — fulfillment tabulka** | Dedikovaná stránka s fulfillment workflow | Jen seznam dopravních metod | VYSOKÁ |
| **Sidebar — Opuštěné pokladny** | Počet opuštěných checkoutů | Chybí (nemáme model) | NÍZKÁ |
| **Sidebar — badge počet nových** | Červený badge na více položkách | Pouze na Objednávky | NÍZKÁ |
| **Dashboard — per-status sparklines** | Mini trend grafy u stat karet | Jen čísla | STŘEDNÍ |

---

## Implementační plán (řazeno dle priority)

---

### FÁZE 1: Objednávky seznam — Shopify úroveň (VYSOKÁ)

**Soubory:**
- `src/app/(admin)/admin/objednavky/page.tsx` (318 řádků)
- `src/components/admin/StatCard.tsx` (27 řádků)
- `src/components/admin/OrderFilters.tsx` (115 řádků)

#### 1A. Stat karty místo StatLink badges

Aktuálně: 4 malé StatLink badges (Nové, Čeká platba, Čeká dodavatel, K odeslání).

Shopify má: 6 velkých stat karet s procentuální změnou a sparkline.

**Nahradit řádky 109-135** (quick stats) za grid stat karet:

```tsx
{/* Stat karty — Shopify style */}
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
  <StatCard
    label="Objednávky dnes"
    value={String(todayOrders)}
    change={todayChange}
    changeType={todayOrders > yesterdayOrders ? "up" : "neutral"}
    compact
  />
  <StatCard
    label="Nové"
    value={String(newCount)}
    changeType={newCount > 0 ? "up" : "neutral"}
    change={newCount > 0 ? "vyžaduje pozornost" : ""}
    compact
    href="/admin/objednavky?status=NEW"
  />
  <StatCard
    label="Čeká platba"
    value={String(pendingPayment)}
    compact
    href="/admin/objednavky?paymentStatus=PENDING"
  />
  <StatCard
    label="Čeká dodavatel"
    value={String(awaitingSupplier)}
    compact
    href="/admin/objednavky?status=AWAITING_SUPPLIER"
  />
  <StatCard
    label="K odeslání"
    value={String(readyToShip)}
    changeType={readyToShip > 0 ? "up" : "neutral"}
    change={readyToShip > 0 ? "připraveno" : ""}
    compact
    href="/admin/objednavky?status=CONFIRMED&paymentStatus=PAID"
  />
  <StatCard
    label="Doručené (měsíc)"
    value={String(deliveredMonth)}
    compact
  />
</div>
```

**Nové query v Promise.all:**

```tsx
// Přidat do Promise.all (řádky 49-70):
prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
prisma.order.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
prisma.order.count({ where: { status: "DELIVERED", createdAt: { gte: monthStart } } }),
```

**Rozšířit StatCard o `compact` a `href` props:**

```tsx
// src/components/admin/StatCard.tsx
interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  compact?: boolean;
  href?: string;
}

export function StatCard({ label, value, change, changeType = "neutral", icon, compact, href }: StatCardProps) {
  const content = (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${compact ? "p-3" : "p-5"} ${href ? "hover:border-gray-300 hover:shadow transition-all cursor-pointer" : ""}`}>
      {!compact && icon && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-500">{label}</span>
          <span className="text-gray-400">{icon}</span>
        </div>
      )}
      {compact && <span className="text-xs font-medium text-gray-500 block mb-1">{label}</span>}
      <p className={`font-bold text-gray-900 ${compact ? "text-xl" : "text-2xl"}`}>{value}</p>
      {change && (
        <p className={`text-xs mt-0.5 ${
          changeType === "up" ? "text-green-600" : changeType === "down" ? "text-red-500" : "text-gray-500"
        }`}>
          {change}
        </p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
```

#### 1B. Rozšířit tabulku objednávek

Přidat sloupce ze Shopify: **Položky** (počet), **Splnění** (fulfillment status).

**Nový th + td v tabulce (řádky 152-244):**

```tsx
{/* Nový th po "Doprava" */}
<th className="px-4 py-3 text-center font-medium text-gray-600">Pol.</th>

{/* Nový td */}
<td className="px-4 py-3 text-center text-gray-600 text-xs">
  {order.items.length}
</td>
```

**Fulfillment badge** — odvodit z order.status:

```tsx
{/* Nový th po "Platba" */}
<th className="px-4 py-3 text-left font-medium text-gray-600">Splnění</th>

{/* Fulfillment logic */}
<td className="px-4 py-3">
  {order.status === "SHIPPED" || order.status === "DELIVERED" ? (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
      {order.status === "DELIVERED" ? "Doručeno" : "Odesláno"}
    </span>
  ) : order.status === "PROCESSING" || order.status === "AWAITING_SUPPLIER" ? (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
      Probíhá
    </span>
  ) : order.status === "CANCELLED" ? (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
      Zrušeno
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
      Nesplněno
    </span>
  )}
</td>
```

#### 1C. Bulk select checkboxy

Přidat checkbox column + bulk action bar. Vyžaduje **client component wrapper** pro select state.

**Nový soubor:** `src/components/admin/OrderBulkActions.tsx`

```tsx
"use client";

import { useState } from "react";

interface Props {
  orderIds: string[];
  children: (args: {
    selectedIds: Set<string>;
    toggleId: (id: string) => void;
    toggleAll: () => void;
    allSelected: boolean;
  }) => React.ReactNode;
}

export function OrderBulkActions({ orderIds, children }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === orderIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orderIds));
    }
  };

  const allSelected = selectedIds.size === orderIds.length && orderIds.length > 0;

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="bg-gray-900 text-white px-4 py-2 rounded-lg mb-3 flex items-center gap-4 text-sm">
          <span className="font-medium">{selectedIds.size} vybráno</span>
          <button className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors">
            Export vybraných
          </button>
          <button className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors">
            Tisknout balicí listy
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-white/60 hover:text-white"
          >
            Zrušit výběr
          </button>
        </div>
      )}
      {children({ selectedIds, toggleId, toggleAll, allSelected })}
    </>
  );
}
```

**V tabulce přidat checkbox sloupec:**

```tsx
{/* thead — první th */}
<th className="px-3 py-3 w-8">
  <input
    type="checkbox"
    checked={allSelected}
    onChange={toggleAll}
    className="w-4 h-4 rounded border-gray-300"
  />
</th>

{/* tbody — první td */}
<td className="px-3 py-3">
  <input
    type="checkbox"
    checked={selectedIds.has(order.id)}
    onChange={() => toggleId(order.id)}
    className="w-4 h-4 rounded border-gray-300"
  />
</td>
```

**POZOR:** page.tsx je server component. Checkboxy vyžadují client wrapper. Řešení: `OrderBulkActions` wrapper kolem tabulky.

---

### FÁZE 2: Detail objednávky — Shopify úroveň (VYSOKÁ)

**Soubor:** `src/app/(admin)/admin/objednavky/[id]/page.tsx` (494 řádků)

#### 2A. Header badges (jako Shopify #1076)

Aktuálně: nadpis + datum + 2 tlačítka (Faktura, Balicí list).

Shopify: `#1076` + badge Zaplaceno + badge Probíhá + datum + "z Online Store" + tlačítka.

**Nahradit header (řádky 110-149):**

```tsx
<div className="mb-6">
  <Link href="/admin/objednavky" className="text-sm text-gray-500 hover:text-gray-700">
    &larr; Zpět na objednávky
  </Link>
  <div className="flex items-center justify-between mt-2">
    <div className="flex items-center gap-3">
      <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
      {/* Payment badge */}
      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${paymentColor.bg} ${paymentColor.text}`}>
        {PAYMENT_STATUS_LABELS[paymentKey]}
      </span>
      {/* Fulfillment badge */}
      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusColor.bg} ${statusColor.text}`}>
        {ORDER_STATUS_LABELS[statusKey]}
      </span>
    </div>
    <div className="flex items-center gap-2">
      {/* Vrátit peníze */}
      {order.paymentStatus === "PAID" && order.status !== "CANCELLED" && (
        <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
          Vrátit peníze
        </button>
      )}
      <a href={`/admin/objednavky/${order.id}/faktura`} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
        Faktura
      </a>
      <a href={`/admin/objednavky/${order.id}/balici-list`} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
        Balicí list
      </a>
    </div>
  </div>
  <p className="text-sm text-gray-500 mt-1">
    {formatDateTime(order.createdAt)} · {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
  </p>
</div>
```

#### 2B. Fulfillment sekce (Shopify "Probíhá" box)

Přidat nad položky — fulfillment status box s dopravcem, deadlinem, tlačítkem "Označit jako splněno":

```tsx
{/* Fulfillment box — nad položkami */}
<div className={`rounded-lg border p-4 mb-4 ${
  order.status === "SHIPPED" || order.status === "DELIVERED"
    ? "bg-green-50 border-green-200"
    : order.status === "PROCESSING" || order.status === "AWAITING_SUPPLIER"
    ? "bg-yellow-50 border-yellow-200"
    : "bg-gray-50 border-gray-200"
}`}>
  <div className="flex items-center justify-between">
    <div>
      <h3 className="font-semibold text-gray-900">
        {order.status === "DELIVERED" ? "Splněno" :
         order.status === "SHIPPED" ? "Odesláno" :
         order.status === "PROCESSING" ? "Probíhá příprava" :
         "Nesplněno"}
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        Dopravce: {order.shipping?.name || "—"}
        {order.packetaPointName && ` · ${order.packetaPointName}`}
      </p>
      {order.trackingNumber && (
        <p className="text-sm text-gray-600">
          Tracking: <a href={order.trackingUrl || "#"} target="_blank" className="text-blue-600 hover:text-blue-800">{order.trackingNumber}</a>
        </p>
      )}
    </div>
    {/* Akční tlačítka */}
    <div className="flex gap-2">
      {order.status !== "SHIPPED" && order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
        <form action={updateOrderStatus}>
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="newStatus" value="SHIPPED" />
          <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800">
            Označit jako odesláno
          </button>
        </form>
      )}
      {order.status === "SHIPPED" && (
        <form action={updateOrderStatus}>
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="newStatus" value="DELIVERED" />
          <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700">
            Označit jako doručeno
          </button>
        </form>
      )}
    </div>
  </div>
</div>
```

#### 2C. Produktové thumbnaily v položkách

Přidat obrázek produktu do item tabulky. Vyžaduje join s Product:

**Rozšířit order query (řádek 86-93):**

```tsx
items: {
  include: {
    product: { select: { images: true } },  // POZOR: závisí na Product model
  },
},
```

**POZOR:** OrderItem nemá přímý `product` relation v aktuálním schema — má `productId` a `productName`. Musíme buď:
- A) Přidat `product` relation na OrderItem (schema change)
- B) Načíst produkty separátně přes productId

**Doporučení:** Varianta B (bez schema change):

```tsx
const productIds = order.items.map((i) => i.productId).filter(Boolean) as string[];
const products = await prisma.product.findMany({
  where: { id: { in: productIds } },
  select: { id: true, images: true },
});
const productImageMap = new Map(products.map((p) => [p.id, p.images?.[0] || null]));
```

V tabulce:

```tsx
<td className="px-4 py-2">
  <div className="flex items-center gap-3">
    {item.productId && productImageMap.get(item.productId) ? (
      <img
        src={productImageMap.get(item.productId)!}
        alt=""
        className="w-10 h-10 object-cover rounded-md border border-gray-200"
      />
    ) : (
      <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5" />
        </svg>
      </div>
    )}
    <span className="font-medium text-gray-900">{item.productName}</span>
  </div>
</td>
```

#### 2D. DPH řádek v souhrnu

Přidat DPH 21% do cenového shrnutí (řádky 212-225):

```tsx
<div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm">
  <div className="flex justify-between py-1">
    <span className="text-gray-600">Mezisoučet</span>
    <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
  </div>
  <div className="flex justify-between py-1">
    <span className="text-gray-600">Doprava ({order.shipping?.name})</span>
    <span className="text-gray-900">{formatPrice(order.shippingPrice)}</span>
  </div>
  {order.discountAmount > 0 && (
    <div className="flex justify-between py-1">
      <span className="text-gray-600">Sleva ({order.discountCode})</span>
      <span className="text-green-600">−{formatPrice(order.discountAmount)}</span>
    </div>
  )}
  <div className="flex justify-between py-1 text-gray-500">
    <span>DPH 21% (zahrnuto)</span>
    <span>{formatPrice(Math.round(order.total - order.total / 1.21))}</span>
  </div>
  <div className="flex justify-between py-1 border-t border-gray-200 mt-1 pt-2">
    <span className="font-bold text-gray-900">Celkem</span>
    <span className="font-bold text-gray-900 text-base">{formatPrice(order.total)}</span>
  </div>
</div>
```

#### 2E. Mapa link na doručovací adresu

V shipping address sidebar (řádek 477-488) přidat "Zobrazit mapu":

```tsx
{hasShippingAddress && (
  <a
    href={`https://maps.google.com/?q=${encodeURIComponent(
      `${order.shippingStreet}, ${order.shippingZip} ${order.shippingCity}, Česko`
    )}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-800"
  >
    Zobrazit mapu &rarr;
  </a>
)}
```

---

### FÁZE 3: Fulfillment stránka (VYSOKÁ)

**Nový soubor:** `src/app/(admin)/admin/expedice/page.tsx`

Dedikovaná stránka pro fulfillment workflow (inspirace: ShipD Delivery screenshot).

```tsx
// Tabs: Vše | Nesplněné | Odesláno | Doručeno
// Tabulka: Č. objednávky, Zákazník, Vytvořeno, Celkem, Stav, Tracking, Doprava, Akce
// Akce: Odeslat, Tisk balicího listu, Tisk štítku (TODO)
```

**Query:**

```tsx
const where: Record<string, unknown> = {};
if (tab === "unfulfilled") {
  where.status = { in: ["NEW", "CONFIRMED", "PROCESSING", "AWAITING_SUPPLIER"] };
  where.paymentStatus = "PAID";
} else if (tab === "shipped") {
  where.status = "SHIPPED";
} else if (tab === "delivered") {
  where.status = "DELIVERED";
}

const orders = await prisma.order.findMany({
  where,
  include: { shipping: true, items: { select: { id: true } } },
  orderBy: { createdAt: "desc" },
  take: 50,
});
```

**Tab UI:**

```tsx
<div className="flex gap-1 mb-6 border-b border-gray-200">
  {[
    { key: "", label: "Vše", count: totalCount },
    { key: "unfulfilled", label: "Nesplněné", count: unfulfilledCount },
    { key: "shipped", label: "Odesláno", count: shippedCount },
    { key: "delivered", label: "Doručeno", count: deliveredCount },
  ].map((t) => (
    <Link
      key={t.key}
      href={`/admin/expedice${t.key ? `?tab=${t.key}` : ""}`}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        tab === t.key
          ? "border-gray-900 text-gray-900"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {t.label} <span className="text-xs text-gray-400 ml-1">{t.count}</span>
    </Link>
  ))}
</div>
```

**Akční tlačítka nahoře:**

```tsx
<div className="flex gap-2 mb-4">
  <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800">
    Tisknout balicí listy
  </button>
  <ExportOrdersButton />
</div>
```

**Přidat do sidebar navigace:**

```tsx
// V AdminSidebar.tsx, skupina "Prodej", za "Objednávky":
{
  href: "/admin/expedice",
  label: "Expedice",
  icon: /* truck/package SVG */,
},
```

---

### FÁZE 4: Sidebar rozšíření (STŘEDNÍ)

**Soubor:** `src/components/admin/AdminSidebar.tsx` (298 řádků)

#### 4A. Přidat "Expedice" do skupiny "Prodej"

Za Objednávky (řádek 33) přidat:

```tsx
{
  href: "/admin/expedice",
  label: "Expedice",
  icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  ),
},
```

#### 4B. Badge na Expedice (nesplněné)

V layout.tsx přidat count a předat do sidebar:

```tsx
const unfulfilledCount = await prisma.order.count({
  where: {
    status: { in: ["NEW", "CONFIRMED", "PROCESSING", "AWAITING_SUPPLIER"] },
    paymentStatus: "PAID",
  },
});
```

Badge na Expedice stejně jako na Objednávky.

---

### FÁZE 5: Dashboard sparklines (STŘEDNÍ)

**Soubor:** `src/app/(admin)/admin/page.tsx` (405 řádků)

#### 5A. Mini sparkline graf na stat kartách

StatCard rozšířit o `sparkline` prop — array čísel pro posledních 7 dní:

```tsx
interface StatCardProps {
  // ...existing
  sparkline?: number[];
}
```

CSS-only sparkline (SVG polyline):

```tsx
{sparkline && sparkline.length > 1 && (
  <div className="mt-2 h-8">
    <svg viewBox={`0 0 ${sparkline.length * 10} 30`} className="w-full h-full" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-green-400"
        points={sparkline.map((v, i) => {
          const max = Math.max(...sparkline, 1);
          const y = 28 - (v / max) * 26;
          return `${i * 10 + 5},${y}`;
        }).join(" ")}
      />
    </svg>
  </div>
)}
```

**Data pro sparkline** — tržby per den za 7 dní (již se počítá v `paidOrdersLast7Days`):

```tsx
const revenueSparkline = revenueByDay.map((d) => d.value);
const ordersSparkline = /* objednávky per den za 7 dní */;
```

---

### FÁZE 6: Doprava stránka — z tabulky na karty (STŘEDNÍ)

**Soubor:** `src/app/(admin)/admin/doprava/page.tsx` (141 řádků)

Uživatel říká že tabulková forma je nepřehledná. Nahradit tabulku za karty:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {shippingMethods.map((method) => (
    <div key={method.id} className={`bg-white rounded-lg border shadow-sm p-5 ${
      method.active ? "border-gray-200" : "border-gray-200 opacity-60"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{method.name}</h3>
        <span className={`w-2.5 h-2.5 rounded-full ${method.active ? "bg-green-500" : "bg-gray-300"}`} />
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        <p>{formatPrice(method.price)}</p>
        {method.freeFrom && <p className="text-green-600">Zdarma od {formatPrice(method.freeFrom)}</p>}
        <p className="text-xs text-gray-400">{method.type}</p>
      </div>
      <div className="mt-4 flex gap-2">
        <Link href={`/admin/doprava/${method.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          Upravit
        </Link>
        <form action={toggleActive}>
          <input type="hidden" name="methodId" value={method.id} />
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
            {method.active ? "Deaktivovat" : "Aktivovat"}
          </button>
        </form>
      </div>
    </div>
  ))}
</div>
```

---

## Shrnutí implementace

| Fáze | Soubory | Změny | Řádků | Priorita |
|------|---------|-------|-------|----------|
| 1A | objednavky/page.tsx, StatCard.tsx | Stat karty místo badges | +30 | VYSOKÁ |
| 1B | objednavky/page.tsx | Nové sloupce (Položky, Splnění) | +20 | VYSOKÁ |
| 1C | OrderBulkActions.tsx (NOVÝ), page.tsx | Bulk checkboxy + akce | +70 | STŘEDNÍ |
| 2A | objednavky/[id]/page.tsx | Header badges | +15 | VYSOKÁ |
| 2B | objednavky/[id]/page.tsx | Fulfillment box | +35 | VYSOKÁ |
| 2C | objednavky/[id]/page.tsx | Produktové thumbnaily | +25 | STŘEDNÍ |
| 2D | objednavky/[id]/page.tsx | DPH + sleva řádky | +10 | STŘEDNÍ |
| 2E | objednavky/[id]/page.tsx | Mapa link | +8 | NÍZKÁ |
| 3 | expedice/page.tsx (NOVÝ) | Fulfillment stránka | +120 | VYSOKÁ |
| 4A | AdminSidebar.tsx | Expedice v nav | +12 | STŘEDNÍ |
| 4B | layout.tsx, AdminSidebar.tsx | Badge count | +8 | NÍZKÁ |
| 5 | StatCard.tsx, page.tsx (dashboard) | Sparkline | +25 | STŘEDNÍ |
| 6 | doprava/page.tsx | Karty místo tabulky | +30 | STŘEDNÍ |

**Celkem:** ~408 řádků, 5 existujících + 2 nové soubory

---

## Doporučené pořadí implementace

1. **Fáze 1A + 1B** — Stat karty + tabulka sloupce (objednávky seznam)
2. **Fáze 2A + 2B** — Header badges + fulfillment box (objednávky detail)
3. **Fáze 3 + 4A** — Expedice stránka + sidebar link
4. **Fáze 2C + 2D** — Thumbnaily + DPH
5. **Fáze 5** — Dashboard sparklines
6. **Fáze 6** — Doprava karty
7. **Fáze 1C** — Bulk checkboxy (nejsložitější, vyžaduje client wrapper)
8. **Fáze 2E + 4B** — Mapa link + badge count (drobnosti)

---

## Co NEIMPLEMENTUJEME (a proč)

| Shopify funkce | Proč ne |
|----------------|---------|
| Opuštěné pokladny | Nemáme model pro abandoned carts, velký scope |
| Riziko objednávky | Nemáme fraud detection data |
| Konverzní shrnutí | Nemáme sessions/analytics tracking |
| Prodejní kanály | Máme jen jeden kanál (web) |
| Sparkline knihovna | CSS-only SVG stačí, žádné npm závislosti |
| Zásilkovna štítky tisk | Zásilkovna generuje štítky sama po packet create |
| GLS integrace | Nemáme GLS API credentials |

---

## Závislosti a rizika

- **OrderBulkActions** (Fáze 1C): Přechod server→client boundary. Tabulka zůstane server-rendered, wrapper bude client.
- **Product images** (Fáze 2C): Product model musí mít `images` pole (String[]) — ověřit v schema.
- **Expedice** (Fáze 3): Nová stránka, žádné schema changes, jen jiný pohled na existující Order data.
- **StatCard refactor** (Fáze 1A): Zpětně kompatibilní — přidáváme optional props.

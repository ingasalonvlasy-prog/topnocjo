# Plan: Admin objednávky — seznam, detail, status workflow

**Status:** Ready for implementation  
**Priority:** High  
**Date:** 2026-11-08  

---

## Aktuální stav

### Order model (existuje v schema)
- `orderNumber` (QS-YYYYMMDD-0001), `status` (NEW/CONFIRMED/CANCELLED), `paymentStatus` (PENDING/PAID/CANCELLED)
- Zákazník: `firstName`, `lastName`, `email`, `phone`
- Fakturační: `street`, `city`, `zip`
- Doručovací: `shippingName`, `shippingStreet`, `shippingCity`, `shippingZip`
- Doprava: `shippingId` → ShippingMethod, `shippingPrice`, `packetaPointId`, `packetaPointName`
- Platba: `paymentMethod` (card/transfer), `comgateTransId`
- Částky: `subtotal`, `total`
- Poznámky: `note` (zákazník), `adminNote`
- Tracking: `trackingNumber`, `trackingUrl`
- Timestamps: `createdAt`, `paidAt`, `shippedAt`, `deliveredAt`, `cancelledAt`
- Multi-sklad: `needsSupplierOrder`, `supplierOrderedAt`, `supplierReceivedAt`
- Relace: `items` (OrderItem[]), `shipping` (ShippingMethod), `user?` (User)

### OrderItem model
- `productName`, `variantTitle`, `sku`, `quantity`, `unitPrice`, `totalPrice`
- `fromOwnStock`, `fromSupplierStock`

### Co existuje
- `/admin/objednavky/page.tsx` — placeholder stránka ("připravuje se")
- Sidebar: "Objednávky" link v sekci "Prodej" — funguje
- `src/lib/orders.ts` — jen `generateOrderNumber()`
- Comgate callback: nastavuje `paymentStatus` + `status`

### Co chybí
- Seznam objednávek s filtry
- Detail objednávky
- Status workflow (tlačítka pro změnu stavu)
- Tracking number input
- Admin poznámka
- Fulfillment workflow pro dodavatelské objednávky

---

## Status & Payment konstanty

Vytvořit `src/lib/order-constants.ts`:

```typescript
// ==================== ORDER STATUS ====================

export const ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PROCESSING",
  "AWAITING_SUPPLIER",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Nová",
  CONFIRMED: "Potvrzená",
  PROCESSING: "Připravuje se",
  AWAITING_SUPPLIER: "Čeká na dodavatele",
  SHIPPED: "Odeslaná",
  DELIVERED: "Doručená",
  CANCELLED: "Zrušená",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  NEW: { bg: "bg-blue-100", text: "text-blue-700" },
  CONFIRMED: { bg: "bg-indigo-100", text: "text-indigo-700" },
  PROCESSING: { bg: "bg-yellow-100", text: "text-yellow-700" },
  AWAITING_SUPPLIER: { bg: "bg-orange-100", text: "text-orange-700" },
  SHIPPED: { bg: "bg-purple-100", text: "text-purple-700" },
  DELIVERED: { bg: "bg-green-100", text: "text-green-700" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700" },
};

/**
 * Povolené přechody stavu.
 * Klíč = aktuální stav, hodnota = možné další stavy.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "AWAITING_SUPPLIER", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  AWAITING_SUPPLIER: ["PROCESSING", "SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

// ==================== PAYMENT STATUS ====================

export const PAYMENT_STATUSES = ["PENDING", "PAID", "CANCELLED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Čeká na platbu",
  PAID: "Zaplaceno",
  CANCELLED: "Zrušeno",
  REFUNDED: "Vráceno",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, { bg: string; text: string }> = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-700" },
  PAID: { bg: "bg-green-100", text: "text-green-700" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700" },
  REFUNDED: { bg: "bg-gray-100", text: "text-gray-700" },
};

// ==================== PAYMENT METHOD ====================

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "Kartou online",
  transfer: "Bankovním převodem",
};
```

---

## Phase 1: Seznam objednávek — `/admin/objednavky/page.tsx`

### 1.1 Data fetching

```typescript
import { prisma } from "@/lib/db";

interface OrderListParams {
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;  // YYYY-MM-DD
  dateTo?: string;
  search?: string;    // orderNumber, email, jméno
  page?: number;
}

// Server component — čte searchParams
const where: Prisma.OrderWhereInput = {};
if (status) where.status = status;
if (paymentStatus) where.paymentStatus = paymentStatus;
if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) };
if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo + "T23:59:59") };
if (search) {
  where.OR = [
    { orderNumber: { contains: search } },
    { email: { contains: search } },
    { firstName: { contains: search } },
    { lastName: { contains: search } },
  ];
}

const [orders, total] = await Promise.all([
  prisma.order.findMany({
    where,
    include: { shipping: true, items: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * 20,
    take: 20,
  }),
  prisma.order.count({ where }),
]);
```

### 1.2 UI layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Objednávky                                         [Exportovat]   │
│  {total} objednávek                                                │
├─────────────────────────────────────────────────────────────────────┤
│  Filtry:                                                           │
│  [Status ▾] [Platba ▾] [Datum od] [Datum do] [🔍 Hledat...]      │
├─────────────────────────────────────────────────────────────────────┤
│  # Číslo       │ Zákazník       │ Datum   │ Status  │ Platba │ Kč  │
│  QS-20261108-1 │ Jan Novák      │ 8.11.   │ 🟢 Pot │ 💳 Zap│ 2490│
│  QS-20261108-2 │ Eva Malá       │ 8.11.   │ 🔵 Nov │ ⏳ Ček│ 1890│
│  ...           │                │         │         │        │     │
├─────────────────────────────────────────────────────────────────────┤
│  < 1 2 3 ... >                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Tabulka — sloupce

| Sloupec | Obsah | Formát |
|---------|-------|--------|
| Číslo | `orderNumber` | Link na detail, mono font |
| Zákazník | `firstName lastName` + `email` pod tím šedě | |
| Datum | `createdAt` | `cs-CZ`, `d. MMM` |
| Doprava | `shipping.name` + ikona per type | Zásilkovna / GLS / Osobní |
| Status | `ORDER_STATUS_LABELS[status]` | Barevný badge |
| Platba | `PAYMENT_STATUS_LABELS[paymentStatus]` | Barevný badge |
| Celkem | `total` | `formatPrice()`, bold |

### 1.4 Filtry — client component

Vytvořit `src/components/admin/OrderFilters.tsx` (client component):

- Status dropdown: všechny ORDER_STATUSES + "Všechny"
- Platba dropdown: všechny PAYMENT_STATUSES + "Všechny"  
- Datum od/do: `<input type="date" />`
- Search: text input s debounce 300ms
- Filtry se zapisují do URL searchParams (router.push)

### 1.5 Quick stats bar (nad tabulkou)

```
[🔵 Nové: 3] [🟡 Čeká platba: 2] [🟠 Čeká dodavatel: 1] [📦 K odeslání: 4]
```

Každý stat je klikatelný → nastaví filtr.

```typescript
const [newCount, pendingPayment, awaitingSupplier, readyToShip] = await Promise.all([
  prisma.order.count({ where: { status: "NEW" } }),
  prisma.order.count({ where: { paymentStatus: "PENDING", status: { not: "CANCELLED" } } }),
  prisma.order.count({ where: { status: "AWAITING_SUPPLIER" } }),
  prisma.order.count({ where: { status: { in: ["CONFIRMED", "PROCESSING"] }, paymentStatus: "PAID" } }),
]);
```

---

## Phase 2: Detail objednávky — `/admin/objednavky/[id]/page.tsx`

### 2.1 Data fetching

```typescript
const order = await prisma.order.findUnique({
  where: { id },
  include: {
    items: true,
    shipping: true,
    user: { select: { id: true, email: true, firstName: true, lastName: true } },
  },
});
```

### 2.2 Layout — 2 sloupce (2/3 + 1/3)

```
┌──────────────────────────────────────┬──────────────────────┐
│  ← Zpět na objednávky               │                      │
│  Objednávka QS-20261108-0001        │  STATUS               │
│  8. listopadu 2026, 14:32           │  [🟢 Potvrzená]       │
│                                      │                      │
│  ┌──────────────────────────────┐   │  PLATBA               │
│  │ Položky                     │   │  [💳 Zaplaceno]        │
│  │ ┌───┬──────┬────┬───┬─────┐ │   │  Comgate: abc123      │
│  │ │ # │Prod. │Var.│Qty│Cena │ │   │  Zaplaceno: 8.11.     │
│  │ ├───┼──────┼────┼───┼─────┤ │   │                      │
│  │ │ 1 │Nike..│ 42 │ 1 │2490 │ │   │  DOPRAVA              │
│  │ │ 2 │Adid..│ L  │ 2 │ 890 │ │   │  Zásilkovna (49 Kč)  │
│  │ └───┴──────┴────┴───┴─────┘ │   │  Výdejní místo: ...   │
│  │ Mezisoučet:          4 270  │   │                      │
│  │ Doprava:                49  │   │  TRACKING              │
│  │ Celkem:             4 319   │   │  [____________] [Uložit]│
│  └──────────────────────────────┘   │  URL: [__________]    │
│                                      │                      │
│  ┌──────────────────────────────┐   │  ZÁKAZNÍK             │
│  │ ⚠️ Čeká na dodavatele       │   │  Jan Novák            │
│  │ • Nike Air (42) — 1 ks     │   │  jan@email.cz         │
│  │ [Objednáno] [Přijato]      │   │  +420 123 456 789     │
│  └──────────────────────────────┘   │                      │
│                                      │  FAKTURAČNÍ ADRESA    │
│  ┌──────────────────────────────┐   │  Školská 660/3        │
│  │ Admin poznámka              │   │  110 00 Praha 1       │
│  │ [textarea....................│   │                      │
│  │ ...........................]│   │  DORUČOVACÍ ADRESA    │
│  │ [Uložit poznámku]          │   │  (stejná / jiná)      │
│  └──────────────────────────────┘   │                      │
│                                      │  AKCE                 │
│  ┌──────────────────────────────┐   │  [Potvrdit objednávku]│
│  │ Historie                    │   │  [Zrušit objednávku]  │
│  │ 8.11. 14:32 — Vytvořena   │   │                      │
│  │ 8.11. 14:33 — Zaplaceno   │   │                      │
│  │ 8.11. 15:00 — Potvrzena   │   │                      │
│  └──────────────────────────────┘   │                      │
└──────────────────────────────────────┴──────────────────────┘
```

### 2.3 Levý sloupec (2/3)

#### A) Položky (OrderItems tabulka)

```typescript
// Tabulka
| # | Produkt | Varianta | SKU | Ks | Cena/ks | Celkem | Zdroj |
```

**Sloupec "Zdroj"** (z multi-sklad):
- `fromOwnStock > 0 && fromSupplierStock === 0` → "Vlastní sklad" (zelený)
- `fromOwnStock === 0 && fromSupplierStock > 0` → "Dodavatel" (oranžový)
- `fromOwnStock > 0 && fromSupplierStock > 0` → "Mix: 2 vlastní + 1 dodavatel"

Pod tabulkou: mezisoučet, doprava, **celkem** (bold).

#### B) Dodavatelský banner (pokud `needsSupplierOrder`)

Žlutý banner s výpisem položek z dodavatele + akční tlačítka:

```typescript
{order.needsSupplierOrder && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
    <h3>⚠ Objednávka vyžaduje dodání od dodavatele</h3>
    <ul>
      {order.items
        .filter(i => i.fromSupplierStock > 0)
        .map(i => <li>{i.productName} ({i.variantTitle}) — {i.fromSupplierStock} ks</li>)
      }
    </ul>
    <div className="flex gap-2 mt-3">
      <form action={markSupplierOrdered}>
        <input type="hidden" name="orderId" value={order.id} />
        <button disabled={!!order.supplierOrderedAt}>
          {order.supplierOrderedAt
            ? `Objednáno ${formatDate(order.supplierOrderedAt)}`
            : "Označit jako objednáno"
          }
        </button>
      </form>
      <form action={markSupplierReceived}>
        <input type="hidden" name="orderId" value={order.id} />
        <button disabled={!!order.supplierReceivedAt || !order.supplierOrderedAt}>
          {order.supplierReceivedAt
            ? `Přijato ${formatDate(order.supplierReceivedAt)}`
            : "Zboží přijato"
          }
        </button>
      </form>
    </div>
  </div>
)}
```

#### C) Admin poznámka

```typescript
<form action={updateAdminNote}>
  <input type="hidden" name="orderId" value={order.id} />
  <textarea name="adminNote" defaultValue={order.adminNote || ""} rows={3} />
  <button type="submit">Uložit poznámku</button>
</form>
```

#### D) Historie (timeline)

Sestavit z timestamps:

```typescript
function buildTimeline(order: Order) {
  const events: { date: Date; label: string; color: string }[] = [];

  events.push({ date: order.createdAt, label: "Objednávka vytvořena", color: "blue" });

  if (order.paidAt) events.push({ date: order.paidAt, label: "Zaplaceno", color: "green" });
  if (order.supplierOrderedAt) events.push({ date: order.supplierOrderedAt, label: "Objednáno od dodavatele", color: "orange" });
  if (order.supplierReceivedAt) events.push({ date: order.supplierReceivedAt, label: "Zboží od dodavatele přijato", color: "orange" });
  if (order.shippedAt) events.push({ date: order.shippedAt, label: "Odesláno", color: "purple" });
  if (order.deliveredAt) events.push({ date: order.deliveredAt, label: "Doručeno", color: "green" });
  if (order.cancelledAt) events.push({ date: order.cancelledAt, label: "Zrušeno", color: "red" });

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}
```

Zobrazit jako vertikální timeline s tečkami a čárami.

### 2.4 Pravý sloupec (1/3 — sidebar)

#### A) Status badge + změna

Aktuální status jako velký barevný badge.
Pod ním: dropdown nebo tlačítka pro povolené přechody (z `ORDER_STATUS_TRANSITIONS`).

```typescript
const currentStatus = order.status as OrderStatus;
const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentStatus];

// Render tlačítek
{allowedTransitions.map(nextStatus => (
  <form action={updateOrderStatus} key={nextStatus}>
    <input type="hidden" name="orderId" value={order.id} />
    <input type="hidden" name="newStatus" value={nextStatus} />
    <button className={`...${ORDER_STATUS_COLORS[nextStatus].bg}...`}>
      {nextStatus === "CONFIRMED" && "Potvrdit"}
      {nextStatus === "PROCESSING" && "Začít připravovat"}
      {nextStatus === "SHIPPED" && "Označit jako odesláno"}
      {nextStatus === "DELIVERED" && "Označit jako doručeno"}
      {nextStatus === "CANCELLED" && "Zrušit objednávku"}
      {nextStatus === "AWAITING_SUPPLIER" && "Čeká na dodavatele"}
    </button>
  </form>
))}
```

#### B) Platební status

Badge + Comgate transId (pokud existuje) + datum zaplacení.

#### C) Doprava

- Název dopravy (Zásilkovna / GLS / Osobní)
- Cena dopravy
- Pokud Zásilkovna: výdejní místo (`packetaPointName`, `packetaPointId`)

#### D) Tracking

```typescript
<form action={updateTracking}>
  <input type="hidden" name="orderId" value={order.id} />
  <div>
    <label>Tracking číslo</label>
    <input name="trackingNumber" defaultValue={order.trackingNumber || ""} />
  </div>
  <div>
    <label>Tracking URL</label>
    <input name="trackingUrl" defaultValue={order.trackingUrl || ""} placeholder="https://..." />
  </div>
  <button type="submit">Uložit tracking</button>
</form>
```

Auto-generate trackingUrl:
- Zásilkovna: `https://tracking.packeta.com/cs/?id=${trackingNumber}`
- GLS: `https://gls-group.com/CZ/cs/sledovani-zasilek?match=${trackingNumber}`

#### E) Zákazník

Jméno, email (mailto: link), telefon (tel: link).
Pokud `user` existuje: link na `/admin/zakaznici/${user.id}`.

#### F) Adresy

Fakturační + doručovací (pokud odlišná).

#### G) Akční tlačítka

Dynamická dle stavu — viz 2.4 A.

---

## Phase 3: Server actions

Vytvořit `src/app/(admin)/admin/objednavky/[id]/actions.ts`:

### 3.1 updateOrderStatus

```typescript
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ORDER_STATUS_TRANSITIONS, OrderStatus } from "@/lib/order-constants";

export async function updateOrderStatus(formData: FormData) {
  const orderId = formData.get("orderId") as string;
  const newStatus = formData.get("newStatus") as OrderStatus;

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const currentStatus = order.status as OrderStatus;

  // Validace přechodu
  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Nelze změnit stav z ${currentStatus} na ${newStatus}`);
  }

  // Timestamp update dle nového stavu
  const data: Record<string, any> = { status: newStatus };
  if (newStatus === "SHIPPED") data.shippedAt = new Date();
  if (newStatus === "DELIVERED") data.deliveredAt = new Date();
  if (newStatus === "CANCELLED") data.cancelledAt = new Date();

  await prisma.order.update({ where: { id: orderId }, data });

  revalidatePath(`/admin/objednavky/${orderId}`);
  revalidatePath("/admin/objednavky");
}
```

### 3.2 updateTracking

```typescript
export async function updateTracking(formData: FormData) {
  const orderId = formData.get("orderId") as string;
  const trackingNumber = (formData.get("trackingNumber") as string)?.trim() || null;
  let trackingUrl = (formData.get("trackingUrl") as string)?.trim() || null;

  // Auto-generate URL pokud chybí
  if (trackingNumber && !trackingUrl) {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { shipping: true },
    });

    if (order.shipping.code === "zasilkovna") {
      trackingUrl = `https://tracking.packeta.com/cs/?id=${trackingNumber}`;
    } else if (order.shipping.code === "gls") {
      trackingUrl = `https://gls-group.com/CZ/cs/sledovani-zasilek?match=${trackingNumber}`;
    }
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { trackingNumber, trackingUrl },
  });

  revalidatePath(`/admin/objednavky/${orderId}`);
}
```

### 3.3 updateAdminNote

```typescript
export async function updateAdminNote(formData: FormData) {
  const orderId = formData.get("orderId") as string;
  const adminNote = (formData.get("adminNote") as string)?.trim() || null;

  await prisma.order.update({
    where: { id: orderId },
    data: { adminNote },
  });

  revalidatePath(`/admin/objednavky/${orderId}`);
}
```

### 3.4 markSupplierOrdered / markSupplierReceived

```typescript
export async function markSupplierOrdered(formData: FormData) {
  const orderId = formData.get("orderId") as string;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      supplierOrderedAt: new Date(),
      status: "AWAITING_SUPPLIER",
    },
  });

  revalidatePath(`/admin/objednavky/${orderId}`);
}

export async function markSupplierReceived(formData: FormData) {
  const orderId = formData.get("orderId") as string;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      supplierReceivedAt: new Date(),
      status: "PROCESSING",
    },
  });

  revalidatePath(`/admin/objednavky/${orderId}`);
}
```

---

## Phase 4: Dashboard integration

### 4.1 Admin dashboard — `src/app/(admin)/admin/page.tsx`

Přidat order stats:

```typescript
const [orderCount, newOrders, revenue] = await Promise.all([
  prisma.order.count(),
  prisma.order.count({ where: { status: "NEW" } }),
  prisma.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { total: true } }),
]);
```

Nové StatCards:
- "Objednávky celkem" — `orderCount`
- "Nové objednávky" — `newOrders` (s linkem na filtrovaný seznam)
- "Tržby" — `formatPrice(revenue._sum.total || 0)`

### 4.2 Sidebar badge (volitelné)

Na "Objednávky" v sidebar přidat červený badge s počtem nových:

```typescript
// V AdminSidebar — potřebuje být client component, takže:
// Řešení: server component wrapper, nebo fetch počet přes API
// Nejjednodušší: přidat badge přes CSS counter na stránce
```

---

## Pořadí implementace

| # | Fáze | Soubory | Složitost |
|---|------|---------|-----------|
| 1 | `order-constants.ts` | `src/lib/order-constants.ts` (nový) | Nízká |
| 2 | Seznam objednávek | `src/app/(admin)/admin/objednavky/page.tsx` (přepsat placeholder) | Střední |
| 3 | Order filtry | `src/components/admin/OrderFilters.tsx` (nový, client) | Střední |
| 4 | Detail objednávky | `src/app/(admin)/admin/objednavky/[id]/page.tsx` (nový) | Vysoká |
| 5 | Server actions | `src/app/(admin)/admin/objednavky/[id]/actions.ts` (nový) | Střední |
| 6 | Dashboard stats | `src/app/(admin)/admin/page.tsx` (rozšířit) | Nízká |

**Implementovat v pořadí 1 → 2+3 → 4+5 → 6.**

---

## Dotčené soubory

| Soubor | Akce |
|---|---|
| `src/lib/order-constants.ts` | **NOVÝ** — statusy, labely, barvy, přechody |
| `src/app/(admin)/admin/objednavky/page.tsx` | **PŘEPSAT** — placeholder → seznam s filtry |
| `src/components/admin/OrderFilters.tsx` | **NOVÝ** — client component s filtry |
| `src/app/(admin)/admin/objednavky/[id]/page.tsx` | **NOVÝ** — detail objednávky |
| `src/app/(admin)/admin/objednavky/[id]/actions.ts` | **NOVÝ** — server actions |
| `src/app/(admin)/admin/page.tsx` | **ROZŠÍŘIT** — order stats na dashboard |

---

## Design notes

- Styl: konzistentní s existujícím admin (bg-white rounded-lg border, gray-900 headings, green-600 primary buttons)
- Status badges: `inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full` (jako existující published badge v blog admin)
- Tabulka: `<table className="w-full text-sm">` se zebra striping (jako blog admin list)
- Detail: 2-column grid `lg:grid-cols-3` (2 main + 1 sidebar), stejně jako product detail
- Formuláře: server actions s `revalidatePath` (pattern z blog admin)
- Datum formátování: `toLocaleDateString("cs-CZ")` (existující pattern)
- Ceny: `formatPrice()` z `src/lib/products.ts`

# TASK-043: Shopify-style order numbers + admin order detail premium redesign

**Datum:** 2026-11-14
**Autor:** Plánovač agent
**Stav:** KOMPLETNÍ PLÁN

---

## 1. ČÍSLA OBJEDNÁVEK — SHOPIFY STYLE

### 1.1 Aktuální stav

**Soubor:** `src/lib/orders.ts` (19 řádků)

```ts
export async function generateOrderNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `QS-${dateStr}-`;
  // → "QS-20261113-0001"
}
```

**Problémy:**
1. Formát `QS-20261113-0001` je neprofesionální, dlouhý, špatně zapamatovatelný
2. Denní reset počítadla — teoreticky kolize po půlnoci
3. String-based lookup nejpomalejší přístup (findFirst + startsWith)

### 1.2 Cílový formát

Shopify používá jednoduché sekvenční číslo: **#1001, #1002, #1003...**

- Start od **1001** (ne od 1 — vypadá profesionálněji, maskuje že je to nový obchod)
- Prefix `#` jen v UI zobrazení, v DB uloženo jako `"1001"`
- Monotónně rostoucí, žádný reset, žádný datum v čísle
- Stále unikátní (unique constraint v DB)

### 1.3 Implementace — nový `generateOrderNumber()`

**Nahradit celý soubor `src/lib/orders.ts`:**

```ts
import { prisma } from "./db";

const ORDER_NUMBER_START = 1001;

export async function generateOrderNumber(): Promise<string> {
  // Get the highest existing numeric order number
  const lastOrder = await prisma.order.findFirst({
    where: {
      // Only match pure numeric order numbers (new format)
      orderNumber: { not: { contains: "-" } },
    },
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  });

  if (lastOrder) {
    const lastNum = parseInt(lastOrder.orderNumber, 10);
    if (!isNaN(lastNum)) {
      return String(lastNum + 1);
    }
  }

  // Fallback: count ALL orders (including old format) + start offset
  const totalOrders = await prisma.order.count();
  return String(ORDER_NUMBER_START + totalOrders);
}
```

**Proč tento přístup:**
- Staré objednávky `QS-20261113-0001` zůstávají beze změny (contain "-", přeskočeny)
- Nové objednávky startují od `1001 + počet_existujících` → navazují na historii
- Pokud je 0 existujících objednávek → první bude #1001
- Pokud je 50 existujících → první nová bude #1051
- `orderBy: createdAt desc` je rychlejší než `orderBy: orderNumber desc` pro mix formátů

**Alternativní robustnější přístup (preferovaný):**

```ts
import { prisma } from "./db";

const ORDER_NUMBER_START = 1001;

export async function generateOrderNumber(): Promise<string> {
  // Find highest numeric order number across ALL orders
  const allOrders = await prisma.order.findMany({
    select: { orderNumber: true },
    orderBy: { createdAt: "desc" },
    take: 100, // Check last 100 — enough to find highest numeric
  });

  let maxNum = 0;
  for (const o of allOrders) {
    const num = parseInt(o.orderNumber, 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }

  if (maxNum > 0) {
    return String(maxNum + 1);
  }

  // No numeric orders yet — start from ORDER_NUMBER_START + existing count
  const totalOrders = await prisma.order.count();
  return String(ORDER_NUMBER_START + totalOrders);
}
```

**DOPORUČENÝ (nejjednodušší a nejrobustnější):**

```ts
import { prisma } from "./db";

const ORDER_NUMBER_START = 1001;

export async function generateOrderNumber(): Promise<string> {
  const count = await prisma.order.count();
  return String(ORDER_NUMBER_START + count);
}
```

Toto je nejčistší. Funguje vždy — START + total count. Čísla rostou monotónně. Pokud se objednávka smaže, nebude mezera (ale to je OK — Shopify taky má mezery v číslech). Race condition: dva concurrent requesty mohou dostat stejné číslo — ošetřeno unique constraintem v DB, retry:

```ts
import { prisma } from "./db";

const ORDER_NUMBER_START = 1001;

export async function generateOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.order.count();
    const candidate = String(ORDER_NUMBER_START + count + attempt);

    const exists = await prisma.order.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    });

    if (!exists) return candidate;
  }

  // Ultimate fallback — timestamp-based
  return String(ORDER_NUMBER_START + Date.now() % 1000000);
}
```

### 1.4 Display formát — kde se zobrazuje `#` prefix

Všechna místa kde se orderNumber zobrazuje — přidat `#` prefix v UI (NE v DB):

| Soubor | Řádek | Aktuálně | Nově |
|--------|-------|----------|------|
| `admin/objednavky/[id]/page.tsx` | 165 | `{order.orderNumber}` | `#{order.orderNumber}` |
| `admin/objednavky/page.tsx` → OrderTableClient | 154 | `{order.orderNumber}` | `#{order.orderNumber}` |
| `admin/page.tsx` (dashboard) | 510 | `{order.orderNumber}` | `#{order.orderNumber}` |
| `admin/finance/page.tsx` | 397 | `#{order.orderNumber}` | ✅ už má `#` |
| `admin/slevy/[id]/page.tsx` | 240 | `#{o.orderNumber}` | ✅ už má `#` |
| `admin/zakaznici/[id]/page.tsx` | 137 | `{order.orderNumber}` | `#{order.orderNumber}` |
| `ucet/page.tsx` (public) | 98 | `#{order.orderNumber}` | ✅ už má `#` |
| `ucet/objednavky/page.tsx` (public) | 93 | `#{order.orderNumber}` | ✅ už má `#` |
| Email šablony | various | `orderNumber` | OK — emaily mají `Objednávka ${orderNumber}` |

**Emailové šablony** — ponechat formát "Objednávka 1076" (bez #), protože v subject linku vypadá profesionálněji.

### 1.5 Vyhledávání — kompatibilita

`admin/objednavky/page.tsx` řádek 64:
```ts
{ orderNumber: { contains: search } }
```
Funguje pro oba formáty — uživatel může hledat "1076" i "QS-2026".

`admin/orders/export/route.ts` řádek 35:
```ts
{ orderNumber: { contains: search } }
```
Stejný pattern — kompatibilní.

### 1.6 URL routing — ŽÁDNÁ ZMĚNA

Objednávky se routují přes `order.id` (CUID), NE přes orderNumber:
- `/admin/objednavky/${order.id}` — admin detail
- `/objednavka/${order.orderNumber}` — public view (pokud existuje)

Public view URL změní formát automaticky: `/objednavka/1076` místo `/objednavka/QS-20261113-0001`.

---

## 2. ADMIN ORDER DETAIL — PREMIUM REDESIGN

### 2.1 Aktuální stav vs Shopify

**Aktuální stránka:** `src/app/(admin)/admin/objednavky/[id]/page.tsx` — 739 řádků

**Co už máme a Shopify nemá (ZACHOVAT):**
- ✅ Ekonomika objednávky (nákupní cena, marže) — řádky 387-422
- ✅ Supplier banner s tlačítky "Objednáno" / "Zboží přijato" — řádky 425-466
- ✅ Fulfillment deadline + overdue indikátor — řádky 248-254
- ✅ Estimated delivery range — řádky 128-136
- ✅ Item source badges (Vlastní sklad / Dodavatel / Mix) — řádky 284-293
- ✅ Product thumbnails v položkách — řádky 298-312
- ✅ Risk assessment — řádky 666-676
- ✅ Balicí list link — řádky 191-201

**Co Shopify má líp (VYLEPŠIT):**
1. **Header** — čistší, větší číslo objednávky, datum prominentní
2. **Status badges** — lépe vizuálně oddělené (Payment paid / Fulfillment)
3. **Fulfillment card** — jasnější hierarchie, items UVNITŘ fulfillment
4. **Financial summary** — lépe strukturované s viditelnými labels
5. **Sidebar** — kompaktnější, lepší spacing
6. **Celkový dojem** — více whitespace, subtilnější bordery, lepší typografie

### 2.2 Redesign — header

**Aktuální (řádky 155-207):**
```
← Zpět na objednávky
#QS-20261113-0001  [Zaplaceno] [Nesplněno]     [Vrátit peníze] [Faktura] [Balicí list]
13. listopadu 2026, 14:32 · Online obchod
```

**Nový design:**
```
← Zpět na objednávky

#1076                                    [Vrátit peníze] [Faktura ↓] [Balicí list ↓] [⋯]
13. listopadu 2026, 14:32

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🟢 Zaplaceno │ │ 🟡 Nesplněno │ │ Kartou online│
└──────────────┘ └──────────────┘ └──────────────┘
```

**Změny:**
1. Order number VELKÝ (`text-3xl font-extrabold`) s `#` prefixem
2. Status badges pod číslem na vlastním řádku — TŘI badges: platba, plnění, platební metoda
3. Datum menší, pod číslem
4. Action buttons kompaktnější, s dropdown "⋯" pro sekundární akce
5. Odstranit "· Online obchod" — redundantní

**Nový JSX (nahradí řádky 153-207):**
```tsx
return (
  <div>
    {/* Header */}
    <div className="mb-8">
      <Link
        href="/admin/objednavky"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Objednávky
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            #{order.orderNumber}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {formatDateTime(order.createdAt)}
          </p>
          {/* Status badges row */}
          <div className="flex items-center gap-2 mt-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${paymentColor.bg} ${paymentColor.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                paymentKey === "PAID" ? "bg-green-500" :
                paymentKey === "PENDING" ? "bg-yellow-500" :
                paymentKey === "REFUNDED" ? "bg-gray-500" : "bg-red-500"
              }`} />
              {PAYMENT_STATUS_LABELS[paymentKey] || order.paymentStatus}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${fulfillment.bg} ${fulfillment.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                fulfillment.label === "Splněno" || fulfillment.label === "Doručeno" ? "bg-green-500" :
                fulfillment.label === "Probíhá" ? "bg-blue-500" :
                fulfillment.label === "Zrušeno" ? "bg-red-500" : "bg-yellow-500"
              }`} />
              {fulfillment.label}
            </span>
            <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
              {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
            Vrátit peníze
          </button>
          <a
            href={`/admin/objednavky/${order.id}/faktura`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            Faktura
          </a>
          <a
            href={`/admin/objednavky/${order.id}/balici-list`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            Balicí list
          </a>
        </div>
      </div>
    </div>
```

### 2.3 Redesign — Fulfillment card

**Aktuální (řádky 215-273):** Fulfillment info je oddělená od položek.

**Nový design — sloučit fulfillment + položky do jednoho celku:**

```
┌─────────────────────────────────────────────────────┐
│ Plnění                    [Nesplněno]    [Splnit ✓] │
├─────────────────────────────────────────────────────┤
│ Dopravce: Zásilkovna      │ Deadline: 15.11. 12:00  │
│ Zdroj: Vlastní sklad      │ Odhad doručení: 17-19.11│
│ Výdejní místo: Z-BOX Praha│                         │
├─────────────────────────────────────────────────────┤
│ ┌──┐ Atomic Hawx Prime 110S                        │
│ │📷│ Vel. 27.5 · SKU: ATM-HP110S-275  [Vl. sklad] │
│ └──┘                           2 990 Kč × 1 = 2990 │
│─────────────────────────────────────────────────────│
│ ┌──┐ Salomon X Ultra 4 GTX                         │
│ │📷│ Vel. 42 · SKU: SAL-XU4G-42      [Dodavatel]  │
│ └──┘                           3 490 Kč × 1 = 3490 │
├─────────────────────────────────────────────────────┤
│ Mezisoučet                               6 480 Kč  │
│ Sleva (SPORT20)                           -648 Kč  │
│ Doprava (Zásilkovna)                       69 Kč   │
│ DPH 21%                                 1 024 Kč   │
│─────────────────────────────────────────────────────│
│ Celkem                                  5 901 Kč   │
│ Zaplaceno 13.11.2026                   [Zaplaceno] │
└─────────────────────────────────────────────────────┘
```

**Klíčové změny:**
1. **Jedna karta** místo tří (fulfillment + items + summary) — jako Shopify
2. Fulfillment metadata (dopravce, deadline, výdejní místo) v kompaktní grid NAHOŘE
3. Položky s thumbnaily pod tím
4. Financial summary na spodku téže karty
5. Lepší vizuální hierarchie — header s badge + action button

**Nový JSX (nahradí řádky 213-384 — fulfillment card + items card + financial summary):**

```tsx
{/* Unified Fulfillment + Items + Payment card */}
<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
  {/* Fulfillment header */}
  <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <h2 className="text-base font-semibold text-gray-900">Plnění</h2>
      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${fulfillment.bg} ${fulfillment.text}`}>
        {fulfillment.label}
      </span>
      {isOverdue && (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
          Po termínu
        </span>
      )}
    </div>
    {!order.shippedAt && statusKey !== "CANCELLED" && (
      <form action={updateOrderStatus}>
        <input type="hidden" name="orderId" value={order.id} />
        <input type="hidden" name="newStatus" value="SHIPPED" />
        <button
          type="submit"
          disabled={!allowedTransitions.includes("SHIPPED")}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Označit jako splněno
        </button>
      </form>
    )}
  </div>

  {/* Fulfillment metadata grid */}
  <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm">
    <div>
      <span className="text-gray-500 text-xs">Dopravce</span>
      <p className="font-medium text-gray-900">{order.shipping?.name || "—"}</p>
    </div>
    <div>
      <span className="text-gray-500 text-xs">Zdroj</span>
      <p className="font-medium text-gray-900">
        {order.needsSupplierOrder ? "Dodavatel" : "Vlastní sklad"}
      </p>
    </div>
    <div>
      <span className="text-gray-500 text-xs">Deadline</span>
      <p className={`font-medium ${isOverdue ? "text-red-600" : "text-gray-900"}`}>
        {formatDateTime(fulfillmentDeadline)}
      </p>
    </div>
    <div>
      <span className="text-gray-500 text-xs">Odhad doručení</span>
      <p className="font-medium text-gray-900">{estimatedDelivery || "Po odeslání"}</p>
    </div>
    {order.pickupPointName && (
      <div className="col-span-2">
        <span className="text-gray-500 text-xs">Výdejní místo</span>
        <p className="font-medium text-gray-900">
          {order.pickupPointName}
          {order.pickupPointId && (
            <span className="text-xs text-gray-400 ml-1">#{order.pickupPointId}</span>
          )}
        </p>
      </div>
    )}
  </div>

  {/* Order items */}
  <div className="divide-y divide-gray-100">
    {order.items.map((item) => {
      const photo = item.productId ? photoMap.get(item.productId) : null;
      const slug = item.productId ? slugMap.get(item.productId) : null;
      let source: { label: string; color: string };
      if (item.fromOwnStock > 0 && item.fromSupplierStock === 0) {
        source = { label: "Vlastní sklad", color: "text-green-700 bg-green-50" };
      } else if (item.fromOwnStock === 0 && item.fromSupplierStock > 0) {
        source = { label: "Dodavatel", color: "text-orange-700 bg-orange-50" };
      } else if (item.fromOwnStock > 0 && item.fromSupplierStock > 0) {
        source = { label: "Mix", color: "text-amber-700 bg-amber-50" };
      } else {
        source = { label: "—", color: "text-gray-400" };
      }

      return (
        <div key={item.id} className="flex items-center gap-4 px-5 py-4">
          {/* Thumbnail */}
          <div className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden">
            {photo ? (
              <img src={photo} alt={item.productName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {slug ? (
                <Link href={`/produkt/${slug}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate transition-colors">
                  {item.productName}
                </Link>
              ) : (
                <span className="text-sm font-semibold text-gray-900 truncate">{item.productName}</span>
              )}
              <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${source.color}`}>
                {source.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              <span>{item.variantTitle}</span>
              {item.sku && <span className="font-mono">SKU: {item.sku}</span>}
            </div>
          </div>

          {/* Price */}
          <div className="text-right text-sm flex-shrink-0">
            <p className="text-gray-500">
              {formatPrice(item.unitPrice)} × {item.quantity}
            </p>
            <p className="font-bold text-gray-900">{formatPrice(item.totalPrice)}</p>
          </div>
        </div>
      );
    })}
  </div>

  {/* Financial summary — bottom of same card */}
  <div className="px-5 py-4 border-t border-gray-200 bg-gray-50/50 text-sm space-y-1.5">
    <div className="flex justify-between py-0.5">
      <span className="text-gray-600">Mezisoučet</span>
      <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
    </div>
    {order.discountAmount > 0 && (
      <div className="flex justify-between py-0.5">
        <span className="text-gray-600">
          Sleva{order.discountCode && <span className="ml-1 font-mono text-xs text-gray-400">({order.discountCode})</span>}
        </span>
        <span className="text-green-600 font-medium">-{formatPrice(order.discountAmount)}</span>
      </div>
    )}
    <div className="flex justify-between py-0.5">
      <span className="text-gray-600">Doprava ({order.shipping?.name})</span>
      <span className="text-gray-900">
        {order.shippingPrice === 0 ? <span className="text-green-600 font-medium">Zdarma</span> : formatPrice(order.shippingPrice)}
      </span>
    </div>
    <div className="flex justify-between py-0.5">
      <span className="text-gray-600">DPH 21%</span>
      <span className="text-gray-900">{formatPrice(vat)}</span>
    </div>
    <div className="flex justify-between py-1.5 border-t border-gray-200 mt-2 pt-3">
      <span className="font-bold text-gray-900 text-base">Celkem</span>
      <span className="font-extrabold text-gray-900 text-lg">{formatPrice(order.total)}</span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500">
        {order.paymentStatus === "PAID" ? "Zaplaceno" : "Čeká na platbu"}
        {order.paidAt && ` ${formatDate(order.paidAt)}`}
      </span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${paymentColor.bg} ${paymentColor.text}`}>
        {PAYMENT_STATUS_LABELS[paymentKey]}
      </span>
    </div>
  </div>
</div>
```

### 2.4 Redesign — sidebar vylepšení

**Hlavní vizuální změny v sidebar:**

1. **Rounded-xl** místo rounded-lg na kartách (konzistentní s hlavní kartou)
2. **Větší padding** — p-5 místo p-4
3. **Subtilnější bordery** — border-gray-100 místo border-gray-200 na vnitřních prvcích
4. **Shadow-sm** na všech kartách (už je)
5. **Status card** — přidat colored left border jako accent

**Status card (řádky 522-553) — přidat levý accent border:**

```tsx
<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-l-4 border-l-{statusAccentColor}">
```

Kde `statusAccentColor`:
```ts
const statusAccentMap: Record<string, string> = {
  NEW: "blue-500",
  CONFIRMED: "indigo-500",
  PROCESSING: "yellow-500",
  AWAITING_SUPPLIER: "orange-500",
  SHIPPED: "purple-500",
  DELIVERED: "green-500",
  CANCELLED: "red-500",
};
```

**POZOR:** Tailwind dynamic classes nefungují — musí být celé stringy. Řešení:

```ts
const statusAccentMap: Record<string, string> = {
  NEW: "border-l-blue-500",
  CONFIRMED: "border-l-indigo-500",
  PROCESSING: "border-l-yellow-500",
  AWAITING_SUPPLIER: "border-l-orange-500",
  SHIPPED: "border-l-purple-500",
  DELIVERED: "border-l-green-500",
  CANCELLED: "border-l-red-500",
};
const statusAccent = statusAccentMap[statusKey] || "border-l-gray-300";
```

### 2.5 Redesign — obecné vizuální úpravy

| Element | Aktuálně | Nově |
|---------|----------|------|
| Karty | `rounded-lg` | `rounded-xl` |
| Karty padding | `p-4` | `p-5` |
| Gap mezi kartami | `gap-6` | `gap-5` |
| Hlavní heading font | `text-2xl font-bold` | `text-3xl font-extrabold tracking-tight` |
| Section headings | `font-semibold text-gray-900` | `text-sm font-semibold text-gray-900 uppercase tracking-wider` — NE, zachovat lowercase |
| Timeline dots | `w-2.5 h-2.5` | zachovat |
| Thumbnail velikost | `w-10 h-10` | `w-12 h-12 rounded-lg` |

### 2.6 Ekonomika objednávky — vizuální upgrade

**Aktuální (řádky 387-422):** Jednoduchá karta s grid 3 cols.

**Nový design — kompaktnější, vizuálnější:**

```tsx
{/* Order economics */}
{(margin !== null || totalCost > 0) && (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
    <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
      Ekonomika
    </h2>
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-gray-50 rounded-lg p-3 text-center">
        <p className="text-xs text-gray-500 mb-1">Nákupní cena</p>
        <p className="text-sm font-bold text-gray-900">{formatPrice(totalCost)}</p>
      </div>
      {margin !== null && (
        <div className={`rounded-lg p-3 text-center ${margin > 0 ? "bg-green-50" : "bg-red-50"}`}>
          <p className="text-xs text-gray-500 mb-1">Marže</p>
          <p className={`text-sm font-bold ${margin > 0 ? "text-green-700" : "text-red-700"}`}>
            {formatPrice(margin)}
          </p>
        </div>
      )}
      <div className="bg-gray-50 rounded-lg p-3 text-center">
        <p className="text-xs text-gray-500 mb-1">Zdroj</p>
        <div className="flex items-center justify-center gap-2 mt-0.5">
          {order.items.some((i) => i.fromOwnStock > 0) && (
            <span className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Vlastní
            </span>
          )}
          {order.items.some((i) => i.fromSupplierStock > 0) && (
            <span className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Dodavatel
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
)}
```

---

## 3. PŘESNÉ ZMĚNY — PO SOUBORECH

### Soubor: `src/lib/orders.ts`

**KOMPLETNÍ PŘEPIS** (19 → ~20 řádků):
```ts
import { prisma } from "./db";

const ORDER_NUMBER_START = 1001;

export async function generateOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.order.count();
    const candidate = String(ORDER_NUMBER_START + count + attempt);

    const exists = await prisma.order.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    });

    if (!exists) return candidate;
  }

  // Fallback — timestamp-based unique
  return String(ORDER_NUMBER_START + Date.now() % 1000000);
}
```

### Soubor: `src/app/(admin)/admin/objednavky/[id]/page.tsx`

**Změna 1 — Header (řádky 153-207):**
Nahradit za nový header viz sekce 2.2. Klíčové: `text-3xl font-extrabold`, status badges na novém řádku, arrow icon místo `&larr;`.

**Změna 2 — Sloučit fulfillment + items + summary (řádky 213-384):**
Nahradit TŘI samostatné karty za jednu sloučenou viz sekce 2.3.

**Změna 3 — Ekonomika karta (řádky 387-422):**
Nahradit za vizuálně lepší verzi viz sekce 2.6.

**Změna 4 — Order number display (řádek 165):**
`{order.orderNumber}` → `#{order.orderNumber}`

**Změna 5 — Rounded-xl na sidebar kartách:**
Všechny `rounded-lg` v sidebar → `rounded-xl` (řádky 522, 556, 574, 589, 630, 666, 679, 691, 715)

**Změna 6 — Status card accent border (řádek 522):**
Přidat `border-l-4 ${statusAccent}` + definovat `statusAccentMap`

### Soubor: `src/components/admin/OrderTableClient.tsx`

**Řádek 154:** `{order.orderNumber}` → `#{order.orderNumber}`

### Soubor: `src/app/(admin)/admin/page.tsx`

**Řádek 510:** `{order.orderNumber}` → `#{order.orderNumber}`

### Soubor: `src/app/(admin)/admin/zakaznici/[id]/page.tsx`

**Řádek 137:** `{order.orderNumber}` → `#{order.orderNumber}`

---

## 4. CO SE NEMĚNÍ

- **Prisma schema** — `orderNumber String @unique` zůstává beze změny
- **DB migrace** — žádná potřeba (orderNumber je String, formát se jen mění)
- **Emailové šablony** — zachovat "Objednávka 1076" (bez #)
- **Comgate callback** — pracuje s `order.orderNumber`, formát neovlivňuje
- **Export CSV** — `order.orderNumber` v CSV je prostě jiný string
- **Public stránky** — `#{order.orderNumber}` — kde není `#`, přidat
- **Sidebar sekce** — Tracking, Poznámka, Doprava — beze změny (řešeno v TASK-041)

---

## 5. FÁZOVÁNÍ

### Fáze 1 — Order numbers (jeden commit)
1. Přepsat `src/lib/orders.ts` — nový sekvenční formát
2. Přidat `#` prefix na display místa (6 souborů, ~6 jednořádkových změn)

### Fáze 2 — Admin detail redesign (jeden commit)
1. Header redesign — `text-3xl`, badges na řádku, action buttons
2. Sloučená fulfillment + items + summary karta
3. Ekonomika vizuální upgrade
4. Sidebar visual polish (rounded-xl, accent border na status)

**DŮLEŽITÉ:** Fáze mohou jít v jednom PR, ale rozdělit do dvou commitů pro snadný review.

---

## 6. KONTROLNÍ SEZNAM

### Order Numbers:
- [ ] `src/lib/orders.ts` — přepsat na sekvenční formát
- [ ] `page.tsx` řádek 165 — `#{order.orderNumber}`
- [ ] `OrderTableClient.tsx` řádek 154 — `#{order.orderNumber}`
- [ ] `admin/page.tsx` řádek 510 — `#{order.orderNumber}`
- [ ] `admin/zakaznici/[id]/page.tsx` řádek 137 — `#{order.orderNumber}`
- [ ] Ověřit: staré objednávky se stále zobrazují správně (#QS-20261113-0001)
- [ ] Ověřit: nová objednávka dostane sekvenční číslo (#1001+)
- [ ] `npm run build` — žádné TS chyby

### Admin Detail Redesign:
- [ ] Header: text-3xl, 3 badges, arrow back link
- [ ] Sloučená karta: fulfillment + items + payment = 1 card
- [ ] Ekonomika: colored backgrounds na margin
- [ ] Sidebar: rounded-xl na kartách
- [ ] Status card: border-l-4 accent color
- [ ] Thumbnail: w-12 h-12 rounded-lg
- [ ] Visual QA: srovnat se Shopify screenshotem
- [ ] `npm run build` — žádné TS chyby
- [ ] Responsive check na menších breakpointech

---

## 7. SOUHRN

| Co | Rozsah |
|----|--------|
| **orders.ts** | Kompletní přepis (19 → ~20 řádků) |
| **page.tsx** (order detail) | ~200 řádků přepsáno (header + merged card + economics) |
| **OrderTableClient.tsx** | 1 řádek |
| **admin/page.tsx** | 1 řádek |
| **zakaznici/[id]/page.tsx** | 1 řádek |
| **Celkem** | ~200 řádků přepsáno + 3 jednořádkové changes |

**Klíčové principy:**
1. Objednávky jako **#1076** — krátké, profesionální, zapamatovatelné
2. **Jedna sloučená karta** pro fulfillment + items + payment (jako Shopify, ale s extras)
3. **Větší heading**, badges na řádku, accent border na status
4. Zachovat unikátní features (marže, supplier tracking, risk assessment)
5. **Žádné DB migrace** — jen formát čísla + UI polish

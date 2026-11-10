# TASK-039: Admin detail objednavky — Shopify level

## Aktualni stav

**Soubor:** `src/app/(admin)/admin/objednavky/[id]/page.tsx` — Server Component, 493 radku
**Actions:** `src/app/(admin)/admin/objednavky/[id]/actions.ts` — 5 server actions

**Aktualni features:**
- Header: orderNumber + datum, link zpet, tlacitka Faktura + Balici list
- 2-sloupcovy layout (2/3 + 1/3)
- Levy sloupec: polozky tabulka (bez obrazku), financni souhrn (mezisoučet, doprava, celkem), supplier banner, admin poznamka, customer note, timeline
- Pravy sidebar: stav (badge + transition buttons), platba (badge + metoda + comgate ID), doprava (nazev + cena + vydejna), tracking (form), zakaznik (jmeno + email + phone + profil link), fakturacni adresa, doruovaci adresa

**Co chybi oproti Shopify:**
- Header badges (Zaplaceno + Stav plneni) vedle #cisla
- Fulfillment sekce s deadline, dopravce detail, dodavatel, odhad doruceni
- Polozky s product thumbnails
- DPH 21% ve financnim souhrnu
- Metapole (marze, nakupni cena, sklady)
- Konverzni shrnuti (1. objednavka / vracejici zakaznik)
- Riziko objednavky (Nizke/Stredni/Vysoke)
- Tlacitka: Vratit penize, Upravit, Dalsi akce

---

## Implementacni plan

### KROK 1: Header upgrade
**Misto:** radky 109-149 v `[id]/page.tsx`

Aktualni header:
```
← Zpet na objednavky
Objednavka QS-XXXX          [Faktura] [Balici list]
datum cas
```

**Novy header (Shopify styl):**
```
← Zpet na objednavky
#QS-XXXX [Zaplaceno badge] [Probiha badge]     [Vratit penize] [Upravit] [···]  
10. listopadu 2026 v 9:13 z Online Store         [Faktura] [Balici list]
```

**Implementace:**

```tsx
{/* Header */}
<div className="mb-6">
  <Link href="/admin/objednavky" className="text-sm text-gray-500 hover:text-gray-700">
    &larr; Zpet na objednavky
  </Link>
  <div className="flex items-center justify-between mt-2">
    <div className="flex items-center gap-3">
      <h1 className="text-2xl font-bold text-gray-900">
        {order.orderNumber}
      </h1>
      {/* Payment badge */}
      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${paymentColor.bg} ${paymentColor.text}`}>
        {PAYMENT_STATUS_LABELS[paymentKey]}
      </span>
      {/* Fulfillment badge */}
      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${fulfillmentBadge.bg} ${fulfillmentBadge.text}`}>
        {fulfillmentBadge.label}
      </span>
    </div>
    <div className="flex items-center gap-2">
      {/* Vratit penize — placeholder */}
      <button className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" disabled>
        Vratit penize
      </button>
      {/* Upravit — placeholder */}
      <button className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" disabled>
        Upravit
      </button>
      {/* Dalsi akce — dropdown placeholder */}
      <button className="px-2 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
        </svg>
      </button>
    </div>
  </div>
  <p className="text-sm text-gray-500 mt-1">
    {formatDateTime(order.createdAt)} z Online Store
  </p>
  {/* Secondary actions */}
  <div className="flex items-center gap-2 mt-3">
    <a href={`/admin/objednavky/${order.id}/faktura`} target="_blank" rel="noopener noreferrer"
       className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50">
      Faktura
    </a>
    <a href={`/admin/objednavky/${order.id}/balici-list`} target="_blank" rel="noopener noreferrer"
       className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50">
      Balici list
    </a>
  </div>
</div>
```

**Fulfillment badge helper** — pouzit `getFulfillmentStatus()` z `order-constants.ts` (pridano v orders-list planu).

---

### KROK 2: Fulfillment sekce
**Misto:** Novy blok PRED polozkami v levem sloupci

Shopify ukazuje fulfillment kartu s dopravce, dodavatelem, deadline a odhadem doruceni.

```tsx
{/* Fulfillment */}
<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <h2 className="font-semibold text-gray-900">Plneni</h2>
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${fulfillmentBadge.bg} ${fulfillmentBadge.text}`}>
        {fulfillmentBadge.label}
      </span>
    </div>
    {/* Tlacitko "Oznacit jako splneno" — jen pokud neni SHIPPED/DELIVERED/CANCELLED */}
    {!["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.status) && (
      <form action={updateOrderStatus}>
        <input type="hidden" name="orderId" value={order.id} />
        <input type="hidden" name="newStatus" value="SHIPPED" />
        <button type="submit"
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800">
          Oznacit jako splneno
        </button>
      </form>
    )}
  </div>
  <div className="px-4 py-3 space-y-2 text-sm">
    {/* Dopravce */}
    <div className="flex justify-between">
      <span className="text-gray-500">Dopravce</span>
      <span className="font-medium text-gray-900">
        {order.shipping?.name || "-"}
        {order.packetaPointName && ` — ${order.packetaPointName}`}
      </span>
    </div>
    {/* Dodavatel */}
    {order.needsSupplierOrder && (
      <div className="flex justify-between">
        <span className="text-gray-500">Dodavatel</span>
        <span className="font-medium text-orange-700">Vyzaduje dodavatele</span>
      </div>
    )}
    {/* Deadline — createdAt + 2 pracovni dny */}
    <div className="flex justify-between">
      <span className="text-gray-500">Deadline</span>
      <span className="font-medium text-gray-900">
        Splnit do {formatFulfillmentDeadline(order.createdAt)}
      </span>
    </div>
    {/* Odhad doruceni */}
    <div className="flex justify-between">
      <span className="text-gray-500">Doruceni</span>
      <span className="font-medium text-gray-900">
        {order.shippedAt
          ? formatDeliveryEstimate(order.shippedAt)
          : "Po odeslani"}
      </span>
    </div>
    {/* Tracking — inline pokud existuje */}
    {order.trackingNumber && (
      <div className="flex justify-between">
        <span className="text-gray-500">Tracking</span>
        <span className="font-medium text-gray-900">
          {order.trackingUrl ? (
            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer"
               className="text-blue-600 hover:text-blue-800">
              {order.trackingNumber}
            </a>
          ) : order.trackingNumber}
        </span>
      </div>
    )}
  </div>
</div>
```

**Helper funkce:**

```ts
function formatFulfillmentDeadline(createdAt: Date): string {
  // +2 business days, 12:00
  const deadline = new Date(createdAt);
  let added = 0;
  while (added < 2) {
    deadline.setDate(deadline.getDate() + 1);
    const dow = deadline.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  deadline.setHours(12, 0, 0, 0);
  const dayName = deadline.toLocaleDateString("cs-CZ", { weekday: "long" });
  const dayNum = deadline.getDate();
  const month = deadline.toLocaleDateString("cs-CZ", { month: "long" });
  return `${dayName} ${dayNum}. ${month} v 12:00`;
}

function formatDeliveryEstimate(shippedAt: Date): string {
  const from = new Date(shippedAt);
  from.setDate(from.getDate() + 2);
  const to = new Date(shippedAt);
  to.setDate(to.getDate() + 4);
  const f = from.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
  const t = to.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
  return `${f}–${t}`;
}
```

---

### KROK 3: Polozky s product thumbnails
**Misto:** polozky tabulka v levem sloupci

**Data query rozsirent** — pridat pred renderovani:

```ts
// Nacist product photos pro thumbnaily
const productIds = order.items.map(i => i.productId).filter(Boolean) as string[];
const products = productIds.length > 0
  ? await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, photos: true },
    })
  : [];
const photoMap = new Map<string, string>();
for (const p of products) {
  const photos = JSON.parse(p.photos || "[]") as string[];
  if (photos[0]) photoMap.set(p.id, photos[0]);
}
```

**Uprava tabulky** — pridat obrazek pred nazev produktu:

```tsx
<td className="px-4 py-2 font-medium text-gray-900">
  <div className="flex items-center gap-3">
    {item.productId && photoMap.get(item.productId) ? (
      <img
        src={photoMap.get(item.productId)}
        alt=""
        className="w-10 h-10 rounded-md object-cover border border-gray-200 shrink-0"
      />
    ) : (
      <div className="w-10 h-10 rounded-md bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
        <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
        </svg>
      </div>
    )}
    <span>{item.productName}</span>
  </div>
</td>
```

---

### KROK 4: Financni sekce s DPH
**Misto:** financni souhrn pod polozkami (radky 212-226)

Pridat DPH 21% radek + stav platby.

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
      <span className="text-gray-600">Sleva{order.discountCode ? ` (${order.discountCode})` : ""}</span>
      <span className="text-red-600">-{formatPrice(order.discountAmount)}</span>
    </div>
  )}
  <div className="flex justify-between py-1 text-gray-500">
    <span>DPH 21% (zahrnuto)</span>
    <span>{formatPrice(Math.round(order.total * 21 / 121))}</span>
  </div>
  <div className="flex justify-between py-1 border-t border-gray-200 mt-1 pt-2">
    <span className="font-bold text-gray-900">Celkem</span>
    <span className="font-bold text-gray-900 text-base">{formatPrice(order.total)}</span>
  </div>
  <div className="flex justify-between py-1 mt-1">
    <span className="text-gray-500">
      {order.paymentStatus === "PAID" ? "Zaplaceno zakaznikem" : "Ceka na platbu"}
    </span>
    <span className={`font-medium ${order.paymentStatus === "PAID" ? "text-green-700" : "text-yellow-700"}`}>
      {formatPrice(order.paymentStatus === "PAID" ? order.total : 0)}
    </span>
  </div>
</div>
```

**DPH vypocet:** `Math.round(order.total * 21 / 121)` — ceny jsou vcetne DPH, takze zpetny vypocet.

---

### KROK 5: Metapole karta
**Misto:** Novy blok v levem sloupci, pod financni sekci

**Data** — nacist costPrice z variant:

```ts
// Nacist cost prices pro metapole
const variantIds = order.items.map(i => i.variantId).filter(Boolean) as string[];
const variants = variantIds.length > 0
  ? await prisma.variant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, costPrice: true },
    })
  : [];
const costMap = new Map(variants.map(v => [v.id, v.costPrice || 0]));

const totalCost = order.items.reduce((sum, item) => {
  const cost = item.variantId ? (costMap.get(item.variantId) || 0) : 0;
  return sum + cost * item.quantity;
}, 0);
const totalMargin = order.subtotal - totalCost;
```

```tsx
{/* Metapole */}
{totalCost > 0 && (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
    <h2 className="font-semibold text-gray-900 mb-3">Metapole</h2>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-500">Nakupni cena celkem</span>
        <span className="font-medium text-gray-900">{formatPrice(totalCost)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Marze celkem</span>
        <span className={`font-bold ${totalMargin > 0 ? "text-green-700" : "text-red-600"}`}>
          {formatPrice(totalMargin)}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-500">Sklady polozek</span>
        <div className="flex items-center gap-1.5">
          {order.items.some(i => i.fromOwnStock > 0) && (
            <span className="flex items-center gap-1 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              Vlastni
            </span>
          )}
          {order.items.some(i => i.fromSupplierStock > 0) && (
            <span className="flex items-center gap-1 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
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

### KROK 6: Pravy sidebar — konverze + riziko

#### 6a. Konverzni shrnuti

**Data query:**
```ts
// Pocet predchozich objednavek zakaznika
const customerOrderCount = order.email
  ? await prisma.order.count({ where: { email: order.email } })
  : 1;
```

```tsx
{/* Konverzni shrnuti */}
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Konverze</h3>
  <div className="space-y-1.5 text-sm">
    <div className="flex justify-between">
      <span className="text-gray-500">Objednavka</span>
      <span className="font-medium text-gray-900">
        {customerOrderCount === 1 ? "1. objednavka" : `${customerOrderCount}. objednavka`}
      </span>
    </div>
    <div className="flex justify-between">
      <span className="text-gray-500">Zakaznik</span>
      <span className="font-medium text-gray-900">
        {customerOrderCount > 1 ? "Vracejici se" : "Novy"}
      </span>
    </div>
  </div>
</div>
```

#### 6b. Riziko objednavky

Jednoduchy heuristicky indikator:
- **Nizke**: vracejici zakaznik NEBO castka < 3000 Kc
- **Stredni**: novy zakaznik AND castka >= 3000 Kc
- **Vysoke**: novy zakaznik AND castka >= 10000 Kc AND platba != card

```tsx
{/* Riziko */}
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Riziko objednavky</h3>
  {(() => {
    const isNew = customerOrderCount <= 1;
    const highValue = order.total >= 1000000; // 10000 Kc v halerich
    const midValue = order.total >= 300000;   // 3000 Kc
    const notCard = order.paymentMethod !== "card";

    let risk: { label: string; color: string; width: string };
    if (isNew && highValue && notCard) {
      risk = { label: "Vysoke", color: "bg-red-500", width: "100%" };
    } else if (isNew && midValue) {
      risk = { label: "Stredni", color: "bg-yellow-500", width: "60%" };
    } else {
      risk = { label: "Nizke", color: "bg-green-500", width: "25%" };
    }

    return (
      <div>
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className={`font-medium ${
            risk.label === "Vysoke" ? "text-red-700"
            : risk.label === "Stredni" ? "text-yellow-700"
            : "text-green-700"
          }`}>
            {risk.label}
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full">
          <div className={`h-1.5 rounded-full ${risk.color}`} style={{ width: risk.width }} />
        </div>
      </div>
    );
  })()}
</div>
```

---

## Souhrn zmen

| Soubor | Akce | Odhad |
|--------|------|-------|
| `src/app/(admin)/admin/objednavky/[id]/page.tsx` | Header badges, fulfillment sekce, thumbnaily, DPH, metapole, konverze, riziko | ~250 radku zmen |
| `src/lib/order-constants.ts` | getFulfillmentStatus (sdileno s orders-list) | uz v planu #1 |

**Celkem:** ~250 radku zmen, 0 novych souboru

## Zavislosti
- `getFulfillmentStatus` z order-constants.ts (z planu orders-list)
- Product photos query — zadna nova migrace, pouziva existujici `Product.photos` JSON pole
- Variant costPrice — existuje v schema, muze byt null (zobrazit metapole jen kdyz > 0)
- customerOrderCount query — jednoduchy count, zadna nova tabulka

## Poradi kroku
1. Header badges (jednoduche, vizualni)
2. Fulfillment sekce (nejvetsi nova feature)
3. Thumbnaily (data query + img)
4. DPH ve financich (jednoradkova zmena)
5. Metapole (nova karta, nova data)
6. Konverze + riziko (sidebar karty)

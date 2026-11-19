# TASK-041: Lepší zákaznická karta + automatický tracking

**Datum:** 2026-11-13
**Autor:** Plánovač agent
**Stav:** KOMPLETNÍ ANALÝZA

---

## 1. AKTUÁLNÍ STAV — AUDIT

### 1.1 Zákaznická karta v order detail sidebar

**Soubor:** `src/app/(admin)/admin/objednavky/[id]/page.tsx` řádky 629-663

**Aktuální obsah:**
```
┌─────────────────────────────┐
│ ZÁKAZNÍK                    │
│ Jan Novák                   │
│ test@test.cz (link)         │
│ +420777777777 (link)        │
│ 1. objednávka  [Nový]      │
│ Profil zákazníka →          │
└─────────────────────────────┘
```

**Problémy:**
1. Jen 4 řádky info — vypadá prázdně
2. Žádná historie objednávek (jen count)
3. Žádná celková útrata
4. Žádná adresa
5. Žádné segmentační štítky (VIP, vracející se, problémový)
6. Neregistrovaný zákazník nemá link na profil (order.user je null)
7. Badge "Nový" jen pro 1. objednávku, jinak nic

**Aktuální data k dispozici:**
- `order.firstName`, `order.lastName`, `order.email`, `order.phone` — přímo z objednávky
- `customerOrderCount` — již se počítá (řádek 110-112)
- `order.user` — volitelné (select: id, email, firstName, lastName)
- `order.userId` — propojení na User model

**Co NENÍ k dispozici (potřeba dotaz):**
- Celková útrata zákazníka (přes email)
- Seznam posledních objednávek
- Průměrná hodnota objednávky
- Datum první/poslední objednávky

### 1.2 Tracking sekce v order detail sidebar

**Soubor:** `src/app/(admin)/admin/objednavky/[id]/page.tsx` řádky 588-627

**Aktuální obsah:**
```
┌─────────────────────────────┐
│ TRACKING                    │
│ Tracking číslo: [________]  │
│ Tracking URL:   [________]  │
│ [    Uložit tracking    ]   │
│ Sledovat zásilku →          │
└─────────────────────────────┘
```

**Problémy:**
1. **Ruční zadávání** — admin musí ručně kopírovat tracking číslo a URL
2. Tracking se nevyplní automaticky po expedici
3. Žádný vizuální stav (prázdné / vyplněné / automaticky)

### 1.3 Automatický tracking — aktuální flow

**Zásilkovna (FUNGUJE ČÁSTEČNĚ):**
- `actions.ts` řádky 66-91: Po změně na SHIPPED → `createZasilkovnaPacket()`
- Vrací `packetId` → automaticky se zapíše do `trackingNumber` + `trackingUrl`
- **PROBLÉM:** `.then().catch()` pattern — fire-and-forget, žádná chybová notifikace adminu
- **PROBLÉM:** Revalidation proběhne PŘED async tracking update → admin nevidí tracking hned

**GLS (NEFUNGUJE):**
- Žádný `src/lib/gls.ts` — neexistuje
- `actions.ts` řádek 168: Pouze auto-generování tracking URL z ručně zadaného čísla
- MyGLS API je zdokumentováno v `research-shipping-integration.md`:
  - `PrintLabels` endpoint vytvoří zásilku a vrátí `ParcelId` + `ParcelNumber`
  - Tracking URL: `https://gls-group.com/CZ/cs/sledovani-zasilek?match=${parcelNumber}`
  - Potřeba: username, password, clientNumber v `config` ShippingMethod

### 1.4 Customer detail page (pro referenci)

**Soubor:** `src/app/(admin)/admin/zakaznici/[id]/page.tsx` — 265 řádků

Už má:
- Celková útrata (`totalSpent` — paidOrders reduce)
- Počet objednávek
- Seznam objednávek (tabulka)
- Kontaktní info
- Admin poznámka

Zákaznická karta v order detail by měla být **mini verze** tohoto — ne duplikát.

---

## 2. NAVRHOVANÝ DESIGN

### 2.1 Zákaznická karta — nový design

```
┌─────────────────────────────────┐
│ ZÁKAZNÍK                        │
│                                 │
│ ┌──┐ Jan Novák                  │
│ │JN│ test@test.cz               │
│ └──┘ +420 777 777 777           │
│                                 │
│ ┌─────────┬──────────┬────────┐ │
│ │ 5       │ 12 450Kč │ 2490Kč │ │
│ │ objedn. │ útrata   │ průměr │ │
│ └─────────┴──────────┴────────┘ │
│                                 │
│ [Vracející se] [Newsletter]     │
│                                 │
│ Registrace: 5. březen 2026      │
│ Poslední obj.: 10. listopad 2026│
│                                 │
│ Fakturační:                     │
│ Vinohradská 42, 120 00 Praha    │
│                                 │
│ Profil zákazníka →              │
└─────────────────────────────────┘
```

**Nové prvky:**
1. **Avatar iniciály** — JN v kroužku (jako v timeline comment form)
2. **Stats grid** — 3 mini karty: počet objednávek, celková útrata, průměrná objednávka
3. **Segmentační štítky** — automatické na základě dat:
   - `Nový` — 1. objednávka (modrý)
   - `Vracející se` — 2+ objednávek (zelený)
   - `VIP` — 5+ objednávek NEBO útrata > 10 000 Kč (zlatý)
   - `Newsletter` — pokud přihlášen (šedý)
   - `Registrovaný` — pokud má účet (šedý)
4. **Datum registrace / první objednávky**
5. **Datum poslední objednávky** (pokud jich je víc)
6. **Fakturační adresa** — z objednávky (již existuje v sidebar dole, ale je oddělená)

### 2.2 Tracking sekce — nový design

```
┌─────────────────────────────────┐
│ TRACKING                        │
│                                 │
│ ┌ ✓ Automaticky ───────────────┐│
│ │ Zásilkovna #Z1234567890      ││
│ │ tracking.packeta.com/...     ││
│ │ Vyplněno: 13.11.2026 14:32  ││
│ └──────────────────────────────┘│
│                                 │
│ [Sledovat zásilku →]            │
│                                 │
│ ── nebo ruční úprava ──        │
│ Tracking číslo: [Z1234567890]  │
│ Tracking URL:   [https://...]  │
│ [    Uložit tracking    ]      │
└─────────────────────────────────┘
```

**Stavy:**
1. **Prázdné** — žádný tracking → form pro ruční zadání + info "Tracking se vyplní automaticky po expedici"
2. **Automaticky vyplněné** — zelená karta s ✓ + "Automaticky" badge + carrier name
3. **Ručně vyplněné** — šedá karta bez badge + editovatelný form

### 2.3 Automatický tracking flow

```
SHIPPED button clicked
    │
    ├─ updateOrderStatus() → status = SHIPPED
    │
    ├─ Zásilkovna?
    │   └─ createZasilkovnaPacket()
    │       ├─ success → trackingNumber + trackingUrl saved
    │       │           → logOrderEvent("tracking", "Auto-tracking: Zásilkovna #...")
    │       └─ fail → logOrderEvent("system", "Auto-tracking selhal: ...")
    │
    ├─ GLS (address delivery)?
    │   └─ createGlsParcel() [NOVÉ]
    │       ├─ success → trackingNumber + trackingUrl saved
    │       │           → logOrderEvent("tracking", "Auto-tracking: GLS #...")
    │       └─ fail → logOrderEvent("system", "Auto-tracking selhal: ...")
    │
    ├─ GLS ParcelShop/ParcelBox?
    │   └─ createGlsParcel() s ServiceList PSD [NOVÉ]
    │       ├─ success → tracking saved
    │       └─ fail → event logged
    │
    └─ Osobní vyzvednutí?
        └─ Nic (žádný tracking potřeba)
```

---

## 3. DETAILNÍ IMPLEMENTACE

### 3.1 Zákaznická karta — query rozšíření

**Aktuální query (řádky 74-81):**
```ts
const order = await prisma.order.findUnique({
  where: { id },
  include: {
    items: true,
    shipping: true,
    user: { select: { id: true, email: true, firstName: true, lastName: true } },
    events: { orderBy: { createdAt: "desc" } },
  },
});
```

**Nový dotaz pro zákaznická data (po hlavním query, řádek ~112):**
```ts
// Customer stats — all orders by this email
const customerStats = await prisma.order.aggregate({
  where: { email: order.email },
  _count: true,
  _sum: { total: true },
  _min: { createdAt: true },
  _max: { createdAt: true },
});

const customerOrderCount = customerStats._count;
const customerTotalSpent = customerStats._sum.total || 0;
const customerAvgOrder = customerOrderCount > 0
  ? Math.round(customerTotalSpent / customerOrderCount)
  : 0;
const customerFirstOrder = customerStats._min.createdAt;
const customerLastOrder = customerStats._max.createdAt;

// Newsletter status (if registered user)
const customerNewsletter = order.user
  ? await prisma.user.findUnique({
      where: { id: order.user.id },
      select: { newsletter: true, createdAt: true },
    })
  : null;

// Also check newsletter subscribers table for non-registered
const isNewsletterSubscriber = customerNewsletter?.newsletter || (
  await prisma.newsletterSubscriber.findUnique({
    where: { email: order.email },
    select: { active: true },
  })
)?.active || false;
```

**NAHRADÍ** stávající `customerOrderCount` (řádky 110-112) — aggregate vrátí vše najednou.

**Segmentační logika:**
```ts
const customerSegments: { label: string; color: string }[] = [];

if (customerOrderCount <= 1) {
  customerSegments.push({ label: "Nový", color: "bg-blue-50 text-blue-700" });
} else if (customerOrderCount >= 5 || customerTotalSpent > 1000000) {
  // > 10 000 Kč (v haléřích)
  customerSegments.push({ label: "VIP", color: "bg-amber-50 text-amber-700" });
} else {
  customerSegments.push({ label: "Vracející se", color: "bg-green-50 text-green-700" });
}

if (order.user) {
  customerSegments.push({ label: "Registrovaný", color: "bg-gray-100 text-gray-600" });
}

if (isNewsletterSubscriber) {
  customerSegments.push({ label: "Newsletter", color: "bg-gray-100 text-gray-600" });
}
```

### 3.2 Zákaznická karta — nový JSX

**NAHRADÍ** řádky 629-663 v `page.tsx`:

```tsx
{/* Customer — enhanced card */}
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Zákazník</h3>

  {/* Avatar + contact */}
  <div className="flex items-start gap-3 mb-3">
    <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-bold shrink-0">
      {(order.firstName[0] || "").toUpperCase()}{(order.lastName[0] || "").toUpperCase()}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-gray-900 truncate">
        {order.firstName} {order.lastName}
      </p>
      <a href={`mailto:${order.email}`} className="text-sm text-blue-600 hover:text-blue-800 truncate block">
        {order.email}
      </a>
      {order.phone && (
        <a href={`tel:${order.phone}`} className="text-sm text-blue-600 hover:text-blue-800 block">
          {order.phone}
        </a>
      )}
    </div>
  </div>

  {/* Stats grid */}
  <div className="grid grid-cols-3 gap-2 mb-3">
    <div className="bg-gray-50 rounded-md p-2 text-center">
      <p className="text-base font-bold text-gray-900">{customerOrderCount}</p>
      <p className="text-[10px] text-gray-500 uppercase">objedn.</p>
    </div>
    <div className="bg-gray-50 rounded-md p-2 text-center">
      <p className="text-base font-bold text-gray-900">{formatPrice(customerTotalSpent)}</p>
      <p className="text-[10px] text-gray-500 uppercase">útrata</p>
    </div>
    <div className="bg-gray-50 rounded-md p-2 text-center">
      <p className="text-base font-bold text-gray-900">{formatPrice(customerAvgOrder)}</p>
      <p className="text-[10px] text-gray-500 uppercase">průměr</p>
    </div>
  </div>

  {/* Segments */}
  <div className="flex flex-wrap gap-1.5 mb-3">
    {customerSegments.map((seg) => (
      <span key={seg.label} className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${seg.color}`}>
        {seg.label}
      </span>
    ))}
  </div>

  {/* Dates */}
  <div className="space-y-1 text-sm mb-3">
    {customerFirstOrder && (
      <div className="flex justify-between">
        <span className="text-gray-500">První obj.</span>
        <span className="text-gray-700">{formatDate(customerFirstOrder)}</span>
      </div>
    )}
    {customerOrderCount > 1 && customerLastOrder && (
      <div className="flex justify-between">
        <span className="text-gray-500">Poslední obj.</span>
        <span className="text-gray-700">{formatDate(customerLastOrder)}</span>
      </div>
    )}
    {customerNewsletter?.createdAt && (
      <div className="flex justify-between">
        <span className="text-gray-500">Registrace</span>
        <span className="text-gray-700">{formatDate(customerNewsletter.createdAt)}</span>
      </div>
    )}
  </div>

  {/* Address (from order) */}
  <div className="text-sm text-gray-600 border-t border-gray-100 pt-2 mb-2">
    <p>{order.street}</p>
    <p>{order.zip} {order.city}</p>
  </div>

  {/* Profile link */}
  {order.user && (
    <Link
      href={`/admin/zakaznici/${order.user.id}`}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
    >
      Profil zákazníka &rarr;
    </Link>
  )}
</div>
```

### 3.3 Tracking sekce — nový JSX

**NAHRADÍ** řádky 588-627 v `page.tsx`:

```tsx
{/* Tracking — enhanced */}
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tracking</h3>

  {/* Current tracking display */}
  {order.trackingNumber ? (
    <div className={`rounded-md p-3 mb-3 ${
      order.trackingAutoFilled
        ? "bg-green-50 border border-green-200"
        : "bg-gray-50 border border-gray-200"
    }`}>
      <div className="flex items-center gap-2 mb-1">
        {order.trackingAutoFilled && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-green-100 text-green-700">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Auto
          </span>
        )}
        <span className="text-xs text-gray-500">
          {order.shipping?.name || "Dopravce"}
        </span>
      </div>
      <p className="text-sm font-mono font-medium text-gray-900">{order.trackingNumber}</p>
      {order.trackingUrl && (
        <a
          href={order.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 truncate block mt-1"
        >
          {order.trackingUrl}
        </a>
      )}
    </div>
  ) : (
    <div className="bg-gray-50 rounded-md p-3 mb-3">
      <p className="text-xs text-gray-500">
        {order.status === "SHIPPED"
          ? "Tracking se nepodařilo vyplnit automaticky."
          : "Tracking se vyplní automaticky po expedici."}
      </p>
    </div>
  )}

  {/* Manual edit form */}
  <details className={order.trackingNumber ? "" : "open"}>
    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 mb-2">
      {order.trackingNumber ? "Upravit ručně" : "Zadat ručně"}
    </summary>
    <form action={updateTracking} className="space-y-2">
      <input type="hidden" name="orderId" value={order.id} />
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tracking číslo</label>
        <input
          name="trackingNumber"
          defaultValue={order.trackingNumber || ""}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tracking URL</label>
        <input
          name="trackingUrl"
          defaultValue={order.trackingUrl || ""}
          placeholder="https://..."
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="w-full px-3 py-1.5 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
      >
        Uložit tracking
      </button>
    </form>
  </details>
</div>
```

### 3.4 Auto-tracking: Zásilkovna fix

**Aktuální problém (actions.ts řádky 66-91):**
```ts
// Fire-and-forget — revalidatePath proběhne DŘÍV než se tracking zapíše
createZasilkovnaPacket({...}).then((result) => {
  if (result.success && result.packetId) {
    prisma.order.update({...}).catch(() => {});
  }
}).catch(() => {});
```

**Fix — čekat na výsledek PŘED revalidací:**

```ts
// Auto-create carrier packet on SHIPPED
if (newStatus === "SHIPPED") {
  const updatedOrder = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { shipping: true },
  });

  // Send shipped email (fire-and-forget — email is not blocking)
  sendEmail({...});

  // Auto-tracking — AWAIT result before revalidation
  const shippingConfig = JSON.parse(updatedOrder.shipping.config || "{}");
  const carrier = shippingConfig.carrier;

  if (carrier === "zasilkovna" && updatedOrder.pickupPointId) {
    try {
      const result = await createZasilkovnaPacket({
        apiKey: shippingConfig.apiKey,
        orderNumber: updatedOrder.orderNumber,
        firstName: updatedOrder.firstName,
        lastName: updatedOrder.lastName,
        email: updatedOrder.email,
        phone: updatedOrder.phone || "",
        addressId: parseInt(updatedOrder.pickupPointId, 10),
        value: 0, // no COD
        weight: 1,
        senderLabel: shippingConfig.senderLabel,
      });

      if (result.success && result.packetId) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            trackingNumber: result.packetId,
            trackingUrl: `https://tracking.packeta.com/cs/?id=${result.packetId}`,
            trackingAutoFilled: true,
          },
        });

        await logOrderEvent({
          orderId,
          type: "tracking",
          title: `Auto-tracking: Zásilkovna #${result.packetId}`,
          detail: { carrier: "zasilkovna", packetId: result.packetId, auto: true },
        });
      } else {
        await logOrderEvent({
          orderId,
          type: "system",
          title: `Auto-tracking selhal: ${result.error || "Neznámá chyba"}`,
          detail: { carrier: "zasilkovna", error: result.error },
        });
      }
    } catch (e) {
      await logOrderEvent({
        orderId,
        type: "system",
        title: `Auto-tracking výjimka: ${e instanceof Error ? e.message : String(e)}`,
        detail: { carrier: "zasilkovna" },
      });
    }
  }

  if (carrier === "gls") {
    try {
      const result = await createGlsParcel({
        username: shippingConfig.username,
        password: shippingConfig.password,
        clientNumber: parseInt(shippingConfig.clientNumber, 10),
        order: updatedOrder,
        pickupPointId: updatedOrder.pickupPointId || undefined,
        senderAddress: shippingConfig.senderAddress ? JSON.parse(shippingConfig.senderAddress) : undefined,
      });

      if (result.success && result.parcelNumber) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            trackingNumber: result.parcelNumber,
            trackingUrl: `https://gls-group.com/CZ/cs/sledovani-zasilek?match=${result.parcelNumber}`,
            trackingAutoFilled: true,
          },
        });

        await logOrderEvent({
          orderId,
          type: "tracking",
          title: `Auto-tracking: GLS #${result.parcelNumber}`,
          detail: { carrier: "gls", parcelNumber: result.parcelNumber, auto: true },
        });
      } else {
        await logOrderEvent({
          orderId,
          type: "system",
          title: `Auto-tracking GLS selhal: ${result.error || "Neznámá chyba"}`,
          detail: { carrier: "gls", error: result.error },
        });
      }
    } catch (e) {
      await logOrderEvent({
        orderId,
        type: "system",
        title: `Auto-tracking GLS výjimka: ${e instanceof Error ? e.message : String(e)}`,
        detail: { carrier: "gls" },
      });
    }
  }

  // Revalidation AFTER tracking is saved
}
```

### 3.5 GLS API klient — nový soubor `src/lib/gls.ts`

```ts
/**
 * GLS MyGLS REST API client for creating parcels and getting tracking.
 *
 * API: https://api.mygls.cz/ParcelService.svc/json/{methodName}
 * Test: https://api.test.mygls.cz/ParcelService.svc/json/{methodName}
 */

const GLS_API_URL = "https://api.mygls.cz/ParcelService.svc/json";

interface GlsAddress {
  Name: string;
  Street: string;
  HouseNumber: string;
  HouseNumberInfo: string;
  City: string;
  ZipCode: string;
  CountryIsoCode: string;
  ContactName: string;
  ContactPhone: string;
  ContactEmail: string;
}

interface CreateGlsParcelParams {
  username: string;
  password: string;
  clientNumber: number;
  order: {
    orderNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    // Address — use shipping address if available, else billing
    shippingName: string | null;
    shippingStreet: string | null;
    shippingCity: string | null;
    shippingZip: string | null;
    street: string;
    city: string;
    zip: string;
  };
  pickupPointId?: string; // For ParcelShop/ParcelBox delivery
  senderAddress?: GlsAddress;
}

interface GlsResult {
  success: boolean;
  parcelNumber?: string;
  parcelId?: number;
  labelPdf?: string; // base64
  error?: string;
}

export async function createGlsParcel(params: CreateGlsParcelParams): Promise<GlsResult> {
  const { username, password, clientNumber, order, pickupPointId, senderAddress } = params;

  // Parse street into street + house number
  const deliveryStreet = order.shippingStreet || order.street;
  const deliveryCity = order.shippingCity || order.city;
  const deliveryZip = (order.shippingZip || order.zip).replace(/\s/g, "");
  const deliveryName = order.shippingName || `${order.firstName} ${order.lastName}`;

  // Try to split "Vinohradská 42" → "Vinohradská" + "42"
  const streetMatch = deliveryStreet.match(/^(.+?)\s+(\d+.*)$/);
  const streetName = streetMatch?.[1] || deliveryStreet;
  const houseNumber = streetMatch?.[2] || "";

  const deliveryAddress: GlsAddress = {
    Name: deliveryName,
    Street: streetName,
    HouseNumber: houseNumber,
    HouseNumberInfo: "",
    City: deliveryCity,
    ZipCode: deliveryZip,
    CountryIsoCode: "CZ",
    ContactName: `${order.firstName} ${order.lastName}`,
    ContactPhone: order.phone || "",
    ContactEmail: order.email,
  };

  const parcel: Record<string, unknown> = {
    ClientNumber: clientNumber,
    ClientReference: order.orderNumber,
    Content: "Sportovní vybavení",
    Count: 1,
    DeliveryAddress: deliveryAddress,
    PickupDate: `/Date(${Date.now()})/`, // GLS expects .NET-style date
  };

  if (senderAddress) {
    parcel.PickupAddress = senderAddress;
  }

  // ParcelShop/ParcelBox delivery — add PSD service
  if (pickupPointId) {
    parcel.ServiceList = [{
      Code: "PSD",
      PSDParameter: { StringValue: pickupPointId },
    }];
  }

  try {
    const res = await fetch(`${GLS_API_URL}/PrintLabels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Username: username,
        Password: password,
        ParcelList: [parcel],
        PrintPosition: 1,
        ShowDialogue: false,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `GLS API HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = await res.json();

    // GLS returns PrintLabelsErrorList for errors
    if (data.PrintLabelsErrorList?.length > 0) {
      const errors = data.PrintLabelsErrorList
        .map((e: { ErrorDescription: string }) => e.ErrorDescription)
        .join(", ");
      return { success: false, error: errors };
    }

    // Success — extract parcel number
    const parcelInfo = data.ParcelInfoList?.[0];
    if (parcelInfo) {
      return {
        success: true,
        parcelNumber: String(parcelInfo.ParcelNumber),
        parcelId: parcelInfo.ParcelId,
        labelPdf: data.Labels || undefined, // base64 PDF
      };
    }

    return { success: false, error: "GLS API: žádný parcel v odpovědi" };
  } catch (e) {
    return {
      success: false,
      error: `GLS API: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * Get parcel tracking status from GLS API.
 */
export async function getGlsParcelStatus(params: {
  username: string;
  password: string;
  parcelNumbers: string[];
}): Promise<{ parcelNumber: string; status: string; statusDate: string }[]> {
  try {
    const res = await fetch(`${GLS_API_URL}/GetParcelStatuses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Username: params.username,
        Password: params.password,
        ParcelNumberList: params.parcelNumbers.map(Number),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.GetParcelStatusErrors || []).length === 0
      ? (data.ParcelStatusList || []).map((s: Record<string, unknown>) => ({
          parcelNumber: String(s.ParcelNumber),
          status: String(s.StatusDescription || ""),
          statusDate: String(s.StatusDate || ""),
        }))
      : [];
  } catch {
    return [];
  }
}
```

### 3.6 DB migrace — `trackingAutoFilled` flag

**Nový field na Order modelu:**
```prisma
trackingAutoFilled Boolean @default(false)
```

Tento flag rozlišuje automaticky vs ručně vyplněný tracking pro UI zobrazení.

**Migrace:**
```sql
ALTER TABLE orders ADD COLUMN trackingAutoFilled INTEGER NOT NULL DEFAULT 0;
```

### 3.7 GLS config v ShippingMethod

Admin stránka `src/app/(admin)/admin/doprava/[id]/page.tsx` — GLS sekce (řádek 217-235) potřebuje rozšíření o API credentials:

```tsx
{(method.code === "gls" || method.code === "gls-parcelshop" || method.code === "gls-parcelbox") && (
  <div className="border-t border-gray-200 pt-6">
    <h3 className="text-sm font-semibold text-gray-900 mb-4">GLS MyGLS API</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Username (email)</label>
        <input
          name="config_username"
          type="text"
          defaultValue={config.username || ""}
          placeholder="qsport@mygls.cz"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
        <input
          name="config_password"
          type="password"
          defaultValue={config.password || ""}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Číslo klienta</label>
        <input
          name="config_clientNumber"
          type="number"
          defaultValue={config.clientNumber || ""}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>
    </div>
    <p className="text-xs text-gray-500 mt-2">
      Credentials z MyGLS portálu. Bez nich funguje jen ruční tracking.
    </p>
  </div>
)}
```

**Update `updateShippingMethod` server action** — přidat config fields pro GLS:
```ts
} else if (code === "gls" || code === "gls-parcelshop" || code === "gls-parcelbox") {
  configObj.carrier = "gls";
  const username = formData.get("config_username") as string;
  const password = formData.get("config_password") as string;
  const clientNumber = formData.get("config_clientNumber") as string;
  if (username) configObj.username = username;
  if (password) configObj.password = password;
  if (clientNumber) configObj.clientNumber = clientNumber;
  if (code === "gls-parcelshop") configObj.widgetType = "parcel-shop";
  if (code === "gls-parcelbox") configObj.widgetType = "parcel-locker";
}
```

---

## 4. SMAZAT / PŘESUNOUT DUPLICITY

### 4.1 Fakturační adresa v sidebar

Aktuálně je v sidebar **dvakrát** informace o zákazníkovi:
1. Zákaznická karta (řádky 629-663) — jméno, email, telefon
2. Fakturační adresa (řádky 678-688) — jméno, ulice, PSČ, město

**Po redesignu:** Adresa bude součástí zákaznické karty → **SMAZAT** standalone "Fakturační adresa" card (řádky 678-688).

**Doručovací adresa** (řádky 690-712) zůstává oddělená — je to jiná adresa (pokud `hasShippingAddress`).

### 4.2 Riziko objednávky

Risk assessment card (řádky 665-676) aktuálně závisí na `customerOrderCount` a `isHighValue`. S novými daty může být chytřejší:

```ts
const riskFactors: string[] = [];
if (isNewCustomer) riskFactors.push("Nový zákazník");
if (isHighValue) riskFactors.push("Částka nad 3 000 Kč");
// Nové — neregistrovaný + vysoká částka
if (!order.user && order.total > 200000) riskFactors.push("Bez registrace");

const riskLevel = riskFactors.length >= 2 ? "Střední" : riskFactors.length === 1 ? "Nízké" : "Minimální";
```

Toto je **volitelné** rozšíření, ne povinné.

---

## 5. FÁZOVÁNÍ

### Fáze 1 (CORE — jeden PR)
1. DB migrace: `trackingAutoFilled` field
2. Zákaznická karta redesign (query + JSX)
3. Tracking sekce redesign (JSX)
4. Zásilkovna auto-tracking fix (await místo fire-and-forget)
5. Smazání duplicitní fakturační adresy card

### Fáze 2 (GLS API — potřeba credentials)
1. `src/lib/gls.ts` — MyGLS API klient
2. GLS config fields v admin doprava
3. Auto-tracking pro GLS v `updateOrderStatus`
4. GLS `updateShippingMethod` config save

**DŮLEŽITÉ:** Fáze 2 vyžaduje reálné GLS MyGLS credentials (username, password, clientNumber) od uživatele. Bez nich lze kód napsat, ale nelze testovat.

### Fáze 3 (NICE-TO-HAVE)
- Tracking status polling (cron job: kontrola stavu zásilky přes API)
- Automatický update status SHIPPED → DELIVERED na základě carrier tracking
- GLS štítky tisk z admin panelu (PDF download)

---

## 6. PŘESNÉ ZMĚNY — PO SOUBORECH

### Soubor: `prisma/schema.prisma`

**Přidat do Order modelu (za `trackingUrl`):**
```prisma
trackingAutoFilled Boolean @default(false)
```

### Soubor: `src/app/(admin)/admin/objednavky/[id]/page.tsx`

**1. Nahradit řádky 110-112** (customerOrderCount) za nový aggregate query:
```ts
// SMAZAT:
const customerOrderCount = order.email
  ? await prisma.order.count({ where: { email: order.email } })
  : 1;

// NAHRADIT: viz sekce 3.1 — aggregate + newsletter check
```

**2. Přidat segmentační logiku** (za nový query, cca řádek ~120):
```ts
const customerSegments = [...]; // viz sekce 3.1
```

**3. Nahradit zákaznickou kartu** (řádky 629-663):
Kompletní nahrazení za nový JSX — viz sekce 3.2

**4. Smazat standalone fakturační adresu** (řádky 678-688):
Adresa je nyní v zákaznické kartě.

**5. Nahradit tracking sekci** (řádky 588-627):
Kompletní nahrazení za nový JSX — viz sekce 3.3

### Soubor: `src/app/(admin)/admin/objednavky/[id]/actions.ts`

**1. Přestrukturovat SHIPPED blok** (řádky 47-93):
- Await Zásilkovna packet creation
- Přidat GLS parcel creation
- Přesunout `revalidatePath` ZA tracking update
- Log success/failure do OrderEvent

**2. Import `createGlsParcel`:**
```ts
import { createGlsParcel } from "@/lib/gls";
```

### Soubor: `src/lib/gls.ts` (NOVÝ)

Celý soubor — viz sekce 3.5 (~130 řádků)

### Soubor: `src/app/(admin)/admin/doprava/[id]/page.tsx`

**1. Rozšířit GLS config sekci** (řádky 201-235):
Přidat username, password, clientNumber inputs — viz sekce 3.7

**2. Rozšířit `updateShippingMethod` server action** (řádky 45-53):
Přidat GLS credentials do config — viz sekce 3.7

---

## 7. KONTROLNÍ SEZNAM

### Fáze 1 — CORE:
- [ ] `prisma/schema.prisma` — přidat `trackingAutoFilled Boolean @default(false)`
- [ ] `npx prisma db push` — migrace
- [ ] `page.tsx` — nahradit customerOrderCount za aggregate query
- [ ] `page.tsx` — přidat segmentační logiku
- [ ] `page.tsx` — redesign zákaznické karty (avatar, stats grid, segmenty, datumy, adresa)
- [ ] `page.tsx` — redesign tracking sekce (auto/ruční vizuální stav, details toggle)
- [ ] `page.tsx` — smazat standalone fakturační adresa card
- [ ] `actions.ts` — Zásilkovna: await místo fire-and-forget + trackingAutoFilled + logOrderEvent
- [ ] `npm run build` — žádné TS chyby

### Fáze 2 — GLS API:
- [ ] `src/lib/gls.ts` — nový soubor, createGlsParcel + getGlsParcelStatus
- [ ] `actions.ts` — přidat GLS auto-tracking v SHIPPED bloku
- [ ] `admin/doprava/[id]/page.tsx` — GLS config fields (username, password, clientNumber)
- [ ] `admin/doprava/[id]/page.tsx` — updateShippingMethod config save pro GLS

### QA:
- [ ] Order detail: zákaznická karta ukazuje avatar, stats, segmenty, datumy
- [ ] Zákazník s 1 objednávkou → "Nový" badge
- [ ] Zákazník s 5+ objednávkami → "VIP" badge
- [ ] Tracking po SHIPPED (Zásilkovna) → auto-vyplněno, zelená karta s "Auto" badge
- [ ] Tracking po SHIPPED (GLS s credentials) → auto-vyplněno
- [ ] Tracking po SHIPPED (GLS bez credentials) → info "Tracking se nepodařilo vyplnit"
- [ ] Ruční edit trackingu funguje (details toggle)
- [ ] Timeline: auto-tracking events viditelné
- [ ] Fakturační adresa je v zákaznické kartě, ne jako oddělená karta
- [ ] Neregistrovaný zákazník → žádný "Profil zákazníka" link, badge "Registrovaný" chybí

---

## 8. SOUHRN

| Co | Rozsah |
|----|--------|
| **schema.prisma** | +1 řádek (trackingAutoFilled) |
| **page.tsx** (order detail) | ~60 řádků smazat, ~100 řádků přidat |
| **actions.ts** | ~30 řádků přepsat (SHIPPED blok) |
| **gls.ts** | ~130 řádků (nový soubor) |
| **doprava/[id]/page.tsx** | ~30 řádků přidat (GLS config) |
| **Celkem** | ~260 řádků nového kódu, ~60 smazáno |

**Klíčové změny:**
1. Zákaznická karta je "mini profil" — avatar, 3 stats, segmentační tagy, datumy
2. Tracking se vyplní AUTOMATICKY po expedici (Zásilkovna: existuje, fix await; GLS: nové API)
3. Timeline loguje success/failure auto-trackingu
4. Ruční edit stále možný přes `<details>` toggle
5. Žádné nové stránky — vše v existujících souborech

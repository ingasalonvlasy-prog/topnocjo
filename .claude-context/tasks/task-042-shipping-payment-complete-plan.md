# TASK-042: Kompletní plán — Doprava (GLS + Zásilkovna) + Platba (Comgate-only)

**Datum:** 2026-11-12
**Autor:** Plánovač agent
**Stav:** KOMPLETNÍ ANALÝZA

---

## 1. AKTUÁLNÍ STAV — AUDIT

### 1.1 Databáze — ShippingMethod (3 záznamy)

| id | name | code | type | price (Kč) | freeFrom (Kč) | config |
|----|------|------|------|-----------|---------------|--------|
| sm_zasilkovna | Zásilkovna | zasilkovna | pickup_point | 49 | 2000 | `{"apiKey":"2bed6e6598041af2","senderLabel":"Qsport.cz"}` |
| sm_gls | GLS | gls | address | 89 | 2000 | `{"note":"Kurýr GLS doručí balík přímo na zadanou adresu"}` |
| sm_pickup | Osobní vyzvednutí | pickup | personal | 0 | null | `{"address":"Po domluvě","note":"..."}` |

**Pozn.:** Ceny v DB jsou v CZK celá čísla (49, 89). V košíku/objednávce jsou v haléřích (4900, 8900).

### 1.2 Prisma Schema

**ShippingMethod model** (`prisma/schema.prisma:106-122`):
- `type String @default("address")` — aktuálně: `pickup_point`, `address`, `personal`
- `config String @default("{}")` — JSON string s carrier-specific daty
- `price Int` — cena v CZK, NE v haléřích

**Order model** (`prisma/schema.prisma:175-225`):
- `pickupPointId String?` — už přejmenováno z packetaPointId
- `pickupPointName String?` — už přejmenováno z packetaPointName
- `paymentMethod String @default("card")`
- `shippingId String` — FK na ShippingMethod

### 1.3 Cart stav (`src/lib/cart.tsx`)

**SelectedShipping interface (řádek 17-26):**
```ts
export interface SelectedShipping {
  methodId: string;
  methodName: string;
  methodCode: string;
  methodType: string;
  price: number;
  freeFrom: number | null;
  pickupPointId?: string;    // ✅ Už přejmenováno (generické)
  pickupPointName?: string;  // ✅ Už přejmenováno (generické)
}
```
- `setPickupPoint(pointId, pointName)` — generická funkce (řádek 142-149)
- Ukládá do localStorage key `qsport_shipping`

### 1.4 ShippingSelector (`src/components/ShippingSelector.tsx`)

- Bretton.cz styl: radio karty s icon circle + radio indicator
- Fetches `/api/shipping`, auto-selects first method
- Pro `pickup_point` typ zobrazuje ZasilkovnaWidget inline
- Pro `personal` typ zobrazuje info box
- Volá `setPickupPoint()` z cart kontextu (generické)
- **Problém:** Hardcoded na Zásilkovna — kontroluje `method.packetaApiKey` (řádek 173)

### 1.5 Pokladna (`src/app/(public)/pokladna/page.tsx`)

**KRITICKÝ BUG — field name mismatch (řádky 165, 279-280):**
```tsx
// Řádek 165: Čte z cartu staré jméno
if (cartShipping.packetaPointId && cartShipping.packetaPointName) {

// Řádek 279: Posílá do createOrder staré jméno
packetaPointId: selectedPoint?.id ? String(selectedPoint.id) : "",
packetaPointName: selectedPoint ? `...` : "",
```

Ale `actions.ts` CheckoutData interface (řádek 33-34) očekává:
```ts
pickupPointId: string;
pickupPointName: string;
```

**Výsledek:** Pickup point ID/Name se NIKDY nepošlou do objednávky! Cart používá `pickupPointId`, ale checkout page čte `packetaPointId` (neexistuje v novém interface → undefined → nikdy se nepřiřadí).

**Další problémy v pokladně:**
- Vlastní shipping selector (sekce 3, řádky 470-535) — **DUPLIKUJE** ShippingSelector z košíku
- Sekce 4 "Platba" (řádky 537-596) — 3 radio buttony: card, transfer, cod → má být pouze card
- `PaymentMethod` type (řádek 28) — nepotřebný union
- `paymentMethod` state (řádek 53) — nepotřebný state
- `submitLabel` logika (řádky 299-304) — zbytečně komplexní

### 1.6 Server action (`src/app/(public)/pokladna/actions.ts`)

- `CheckoutData.paymentMethod: "card" | "transfer" | "cod"` (řádek 35)
- Platební routing (řádek 232+): card → Comgate, ostatní → CONFIRMED
- **Comgate fallback (řádky 248-255):** Pokud Comgate selže → order se změní na transfer — NUTNO PONECHAT
- Pickup fields `pickupPointId`/`pickupPointName` v CheckoutData — ✅ správně pojmenované

### 1.7 API routes a widgety

**`/api/shipping` route** (`src/app/api/shipping/route.ts`):
- Vrací `packetaApiKey` pro `pickup_point` type — Zásilkovna-specific
- **Potřebuje rozšířit** pro GLS (vrátit carrier-specific info)

**ZasilkovnaWidget** (`src/components/ZasilkovnaWidget.tsx`):
- Packeta Widget v6: `Packeta.Widget.pick(apiKey, callback, options)`
- Script: `https://widget.packeta.com/v6/www/js/library.js`
- PacketaPoint: `{ id: number, name, nameStreet, city, zip, country }`
- JS callback API — funguje

**GLS Widget** (zatím neimplementován):
- HTML Custom Element: `<gls-dpm-dialog>`
- Script CZ: `https://map.gls-czech.com/widget/gls-dpm.js` (type="module")
- Atributy: `country="cz"`, `language="cs"`, `filter-type="parcel-shop"|"parcel-locker"`
- Event: `el.addEventListener('change', (e) => { e.detail })`
- Dialog: `el.showModal()` pro otevření
- Detail: `{ id: "10000-XXXXX", name, contact: { countryCode, postalCode, city, address, name } }`
- **NEPOTŘEBUJE API klíč** — na rozdíl od Zásilkovny

### 1.8 Zásilkovna lib (`src/lib/zasilkovna.ts`)

- `PACKETA_WIDGET_URL` — widget script URL
- `getApiKeyFromConfig(config)` — extrahuje API key z config JSON
- `validateApiKey(apiKey)` — HEAD request validace
- `createZasilkovnaPacket(params)` — XML API pro vytvoření zásilky
- `buildWidgetOptions(apiKey)` — helper pro widget

### 1.9 Emaily

- `order-confirmation.tsx` řádek 113-115: podmínka card vs transfer text — funguje i pro fallback
- `admin-new-order.tsx`: zobrazuje paymentMethod — ponechat

### 1.10 Košík page (`src/app/(public)/kosik/page.tsx`)

- ShippingSelector integrován pod položkami (řádek 224)
- Sidebar zobrazuje dynamickou cenu dopravy z cart kontextu
- Checkout button disabled pokud `pickup_point` bez vybraného bodu (řádek 269)
- `FREE_SHIPPING_THRESHOLD = 200000` — hardcoded, ale `freeFrom` z metody se používá na řádku 36

---

## 2. NAVRHOVANÉ DOPRAVNÍ METODY

### 2.1 Cílový stav — DB záznamy

| code | name | type | price | freeFrom | config |
|------|------|------|-------|----------|--------|
| zasilkovna | Zásilkovna | pickup_point | 49 | 2000 | `{"carrier":"zasilkovna","apiKey":"2bed6e6598041af2","senderLabel":"Qsport.cz"}` |
| gls-parcelshop | GLS ParcelShop | pickup_point | 59 | 2000 | `{"carrier":"gls","widgetType":"parcel-shop"}` |
| gls-parcelbox | GLS ParcelBox | pickup_point | 59 | 2000 | `{"carrier":"gls","widgetType":"parcel-locker"}` |
| gls | GLS na adresu | address | 89 | 2000 | `{"carrier":"gls","note":"Kurýr GLS doručí balík přímo na zadanou adresu"}` |
| pickup | Osobní vyzvednutí | personal | 0 | null | `{"address":"Po domluvě","note":"..."}` |

**Klíčové rozhodnutí:** `config.carrier` field rozlišuje, který widget zobrazit. Toto je čistější než `packetaApiKey` boolean check.

**Ceny:** GLS ParcelShop/ParcelBox cena 59 Kč je placeholder — uživatel musí potvrdit.

### 2.2 Carrier rozlišení

Místo `packetaApiKey` v API response přidáme `carrier` field:

```ts
interface ShippingOption {
  id: string;
  name: string;
  code: string;
  type: string;         // "pickup_point" | "address" | "personal"
  price: number;
  freeFrom: number | null;
  description: string | null;
  carrier?: string;     // "zasilkovna" | "gls" | undefined
  carrierConfig?: {     // carrier-specific data
    apiKey?: string;    // Zásilkovna only
    widgetType?: string; // GLS: "parcel-shop" | "parcel-locker"
  };
}
```

---

## 3. IMPLEMENTAČNÍ PLÁN

### FÁZE 1: Bug fixy + Payment simplification (bez DB změn)

#### 3.1.1 FIX: Pokladna pickup point name mismatch

**Soubor:** `src/app/(public)/pokladna/page.tsx`

**Řádky 165-168 — opravit čtení z cartu:**
```tsx
// AKTUÁLNĚ (BROKEN):
if (cartShipping.packetaPointId && cartShipping.packetaPointName) {
  const parts = cartShipping.packetaPointName.split(", ");
  setSelectedPoint({
    id: Number(cartShipping.packetaPointId),

// OPRAVIT NA:
if (cartShipping.pickupPointId && cartShipping.pickupPointName) {
  const parts = cartShipping.pickupPointName.split(", ");
  setSelectedPoint({
    id: Number(cartShipping.pickupPointId),
```

**Řádky 279-281 — opravit odesílání do createOrder:**
```tsx
// AKTUÁLNĚ (BROKEN):
packetaPointId: selectedPoint?.id ? String(selectedPoint.id) : "",
packetaPointName: selectedPoint
  ? `${selectedPoint.name}, ${selectedPoint.nameStreet}, ${selectedPoint.city}`
  : "",

// OPRAVIT NA:
pickupPointId: selectedPoint?.id ? String(selectedPoint.id) : "",
pickupPointName: selectedPoint
  ? `${selectedPoint.name}, ${selectedPoint.nameStreet}, ${selectedPoint.city}`
  : "",
```

**DŮVOD:** Bez tohoto fixu se pickup point nikdy neuloží do objednávky.

#### 3.1.2 Smazat platební sekci z pokladny

**Soubor:** `src/app/(public)/pokladna/page.tsx`

**Smazat řádek 28:**
```tsx
type PaymentMethod = "card" | "transfer" | "cod";
```

**Smazat řádek 53:**
```tsx
const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
```

**Řádky 299-304 — zjednodušit:**
```tsx
// SMAZAT:
const submitLabel = paymentMethod === "card" ? "Objednat a zaplatit" : ...

// NAHRADIT:
const submitLabel = "Objednat a zaplatit";
```

**Řádek 108 — tracking:**
```tsx
// ZMĚNIT:  paymentMethod,
// NA:      paymentMethod: "card",
```

**Řádek 283 — handleSubmit:**
```tsx
// ZMĚNIT:  paymentMethod,
// NA:      paymentMethod: "card",
```

**Smazat celou sekci 4 "Platba" (řádky 537-596):** Celý `<div>` blok s 3 radio buttony.

**Přečíslovat zbylé sekce:**
- 1. Kontaktní údaje (beze změn)
- 2. Fakturační adresa (beze změn)
- 3. Doprava (beze změn)
- 4. Slevový kód (bylo 5.)
- 5. Poznámka (bylo 6.)

#### 3.1.3 Ponechat beze změn

- `src/app/(public)/pokladna/actions.ts` — `paymentMethod` union type ponechat (Comgate fallback může nastavit `transfer`)
- `src/lib/order-constants.ts` — `PAYMENT_METHOD_LABELS` ponechat (admin historické objednávky)
- Email šablony — ponechat (fallback na transfer stále možný)
- DB schema — `paymentMethod String @default("card")` ponechat
- Comgate integrace — beze změn

---

### FÁZE 2: GLS Widget + Carrier abstrakce

#### 3.2.1 Nový soubor: `src/components/GlsWidget.tsx`

```tsx
"use client";

import { useEffect, useRef, useCallback } from "react";

const GLS_WIDGET_SCRIPT = "https://map.gls-czech.com/widget/gls-dpm.js";

export interface GlsPoint {
  id: string;        // format: "10000-XXXXX"
  name: string;
  address: string;
  city: string;
  postalCode: string;
  countryCode: string;
}

interface GlsWidgetProps {
  filterType: "parcel-shop" | "parcel-locker";
  onSelect: (point: GlsPoint) => void;
  selectedPoint?: GlsPoint | null;
  className?: string;
}

export function GlsWidget({ filterType, onSelect, selectedPoint, className }: GlsWidgetProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const scriptLoaded = useRef(false);

  // Load GLS widget script (type="module")
  useEffect(() => {
    if (scriptLoaded.current || document.getElementById("gls-widget-script")) {
      scriptLoaded.current = true;
      return;
    }
    const script = document.createElement("script");
    script.id = "gls-widget-script";
    script.src = GLS_WIDGET_SCRIPT;
    script.type = "module";
    script.onload = () => { scriptLoaded.current = true; };
    document.head.appendChild(script);
  }, []);

  // Listen for change event on the dialog element
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        onSelect({
          id: detail.id,
          name: detail.name || detail.contact?.name || "",
          address: detail.contact?.address || "",
          city: detail.contact?.city || "",
          postalCode: detail.contact?.postalCode || "",
          countryCode: detail.contact?.countryCode || "CZ",
        });
      }
    };

    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [onSelect]);

  const openDialog = useCallback(() => {
    const el = dialogRef.current;
    if (el && typeof (el as any).showModal === "function") {
      (el as any).showModal();
    }
  }, []);

  return (
    <div>
      {/* Hidden dialog element — GLS Custom Element */}
      {/* @ts-expect-error GLS custom element */}
      <gls-dpm-dialog
        ref={dialogRef}
        country="cz"
        language="cs"
        filter-type={filterType}
      />

      <button
        type="button"
        onClick={openDialog}
        className={className || "w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-navy hover:text-navy transition-colors flex items-center justify-center gap-2"}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        {selectedPoint
          ? `${selectedPoint.name}, ${selectedPoint.city}`
          : filterType === "parcel-shop"
            ? "Vybrat výdejní místo GLS"
            : "Vybrat GLS ParcelBox"}
      </button>

      {selectedPoint && (
        <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
          <div className="font-medium text-gray-900">{selectedPoint.name}</div>
          <div className="text-gray-600">
            {selectedPoint.address}, {selectedPoint.city} {selectedPoint.postalCode}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Klíčové rozdíly oproti ZasilkovnaWidget:**
- GLS: HTML Custom Element `<gls-dpm-dialog>`, `showModal()`, `change` event
- Zásilkovna: JS API `Packeta.Widget.pick(apiKey, callback)`
- GLS: `type="module"` script
- GLS: `filter-type` atribut pro rozlišení ParcelShop vs ParcelBox
- GLS: **NEPOTŘEBUJE API klíč**
- GLS point ID je string (`"10000-XXXXX"`), Zásilkovna je number

#### 3.2.2 Upravit `/api/shipping` route

**Soubor:** `src/app/api/shipping/route.ts`

```tsx
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const methods = await prisma.shippingMethod.findMany({
    where: { active: true },
    orderBy: { position: "asc" },
    select: {
      id: true, name: true, code: true, type: true,
      price: true, freeFrom: true, description: true, config: true,
    },
  });

  const result = methods.map(({ config, ...m }) => {
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(config || "{}"); } catch {}

    return {
      ...m,
      carrier: (parsed.carrier as string) || undefined,
      carrierConfig: m.type === "pickup_point" ? {
        apiKey: (parsed.apiKey as string) || undefined,
        widgetType: (parsed.widgetType as string) || undefined,
      } : undefined,
    };
  });

  return NextResponse.json(result);
}
```

**Změna:** Místo `packetaApiKey` vrací `carrier` + `carrierConfig`. Toto je carrier-agnostické.

#### 3.2.3 Upravit ShippingSelector pro multi-carrier

**Soubor:** `src/components/ShippingSelector.tsx`

Rozšířit `ShippingOption` interface:
```tsx
interface ShippingOption {
  id: string;
  name: string;
  code: string;
  type: string;
  price: number;
  freeFrom: number | null;
  description: string | null;
  carrier?: string;
  carrierConfig?: {
    apiKey?: string;
    widgetType?: string;
  };
}
```

Nahradit podmínku pro widget (řádek 173):
```tsx
// AKTUÁLNĚ:
{isSelected && method.type === "pickup_point" && method.packetaApiKey && (
  <ZasilkovnaWidget apiKey={method.packetaApiKey} ... />
)}

// NOVĚ:
{isSelected && method.type === "pickup_point" && method.carrier === "zasilkovna" && method.carrierConfig?.apiKey && (
  <ZasilkovnaWidget
    apiKey={method.carrierConfig.apiKey}
    onSelect={handleZasilkovnaPointSelect}
    selectedPoint={zasilkovnaPointLocal}
  />
)}

{isSelected && method.type === "pickup_point" && method.carrier === "gls" && (
  <GlsWidget
    filterType={(method.carrierConfig?.widgetType as "parcel-shop" | "parcel-locker") || "parcel-shop"}
    onSelect={handleGlsPointSelect}
    selectedPoint={glsPointLocal}
  />
)}
```

Handler pro GLS:
```tsx
function handleGlsPointSelect(point: GlsPoint) {
  setPickupPoint(
    point.id,                                         // string "10000-XXXXX"
    `${point.name}, ${point.address}, ${point.city}`, // display name
  );
}
```

**Klíčový detail:** `setPickupPoint()` je generický — přijímá `(pointId: string, pointName: string)` — funguje pro oba carriery.

#### 3.2.4 Upravit pokladnu pro multi-carrier

**Soubor:** `src/app/(public)/pokladna/page.tsx`

Sekce 3 "Doprava" (řádky 470-535) potřebuje:
1. Stejnou carrier detekci jako ShippingSelector
2. Import `GlsWidget` a `GlsPoint`
3. Lokální state pro GLS point (vedle Zásilkovna point)

**Alternativa (doporučená):** Vzhledem k tomu, že košík už má ShippingSelector a cart context drží shipping state, pokladna by NEMĚLA mít vlastní shipping selector. Místo toho:
- Pokladna zobrazí VYBRANOU dopravu z cart kontextu (read-only)
- Link "Změnit dopravu" → zpět na košík
- Tím se eliminuje duplikace kódu

**POZOR:** Toto je větší UX změna. Pokud uživatel nechce měnit flow, pak pokladna musí mít vlastní shipping selector s GLS widgetem. Viz **Varianta A vs B** níže.

---

## 4. UX VARIANTY

### Varianta A: Doprava POUZE v košíku (doporučeno)

**Flow:** Košík (shipping výběr + widget) → Pokladna (kontakt + adresa + read-only shipping + platba)

**Pokladna sekce 3 "Doprava":**
```tsx
<div className="bg-white border border-line rounded-[10px] p-6">
  <h2 className="text-[18px] font-bold text-navy mb-4">3. Doprava</h2>
  {cartShipping ? (
    <div className="flex items-center justify-between p-4 bg-wash rounded-[8px]">
      <div>
        <span className="text-[14px] font-bold text-ink">{cartShipping.methodName}</span>
        {cartShipping.pickupPointName && (
          <p className="text-[12px] text-muted mt-0.5">{cartShipping.pickupPointName}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[14px] font-bold text-navy">
          {cartShippingPrice === 0 ? "Zdarma" : formatPrice(cartShippingPrice)}
        </span>
        <Link href="/kosik" className="text-[12px] text-blue underline">Změnit</Link>
      </div>
    </div>
  ) : (
    <div className="p-4 bg-red-50 rounded-[8px]">
      <p className="text-[13px] text-sale">Nebyla vybrána doprava.</p>
      <Link href="/kosik" className="text-[12px] text-blue underline">Vybrat v košíku</Link>
    </div>
  )}
</div>
```

**Výhody:**
- Žádná duplikace shipping selectoru
- GLS/Zásilkovna widget jen na jednom místě
- Jednodušší pokladna
- Méně kódu na údržbu

**Nevýhody:**
- Uživatel musí jít zpět do košíku pro změnu dopravy

### Varianta B: Doprava v košíku I v pokladně

**Flow:** Košík (shipping výběr) → Pokladna (kontakt + adresa + shipping výběr znovu + platba)

**Výhody:**
- Uživatel může změnit dopravu na pokladně bez návratu
- Konvenční UX (většina eshopů)

**Nevýhody:**
- Duplikovaný shipping selector + oba widgety (Zásilkovna + GLS) musí být na 2 místech
- Pokladna je složitější
- Stav se musí synchronizovat mezi cart a pokladnou

**DOPORUČENÍ:** Varianta A. Doprava se vybírá jednou v košíku. Pokladna jen zobrazuje vybranou dopravu s možností "Změnit". Toto je moderní přístup (Bretton.cz, Nike.com, Apple Store).

---

## 5. PŘESNÉ ZMĚNY — PO SOUBORECH

### 5.1 `src/app/(public)/pokladna/page.tsx` (FÁZE 1 + FÁZE 2)

**Smazat:**
1. Řádek 28: `type PaymentMethod = "card" | "transfer" | "cod";`
2. Řádek 53: `const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");`
3. Řádky 537-596: celá sekce 4 "Platba" (3 radio buttony)

**Opravit (bug fix):**
4. Řádky 165-168: `cartShipping.packetaPointId` → `cartShipping.pickupPointId` (a packetaPointName → pickupPointName)
5. Řádky 279-281: `packetaPointId:` → `pickupPointId:`, `packetaPointName:` → `pickupPointName:`

**Zjednodušit:**
6. Řádky 299-304: `submitLabel` → konstanta `"Objednat a zaplatit"`
7. Řádek 108: `paymentMethod,` → `paymentMethod: "card",`
8. Řádek 283: `paymentMethod,` → `paymentMethod: "card",`

**Přečíslovat:**
9. Sekce 5 "Slevový kód" → 4
10. Sekce 6 "Poznámka" → 5

**Pokud Varianta A (doporučeno):**
11. Řádky 470-535: nahradit celou sekci 3 "Doprava" za read-only zobrazení z cartu (viz 4.A výše)
12. Smazat: `const [selectedShippingId, setSelectedShippingId]` (řádek 52)
13. Smazat: `const [selectedPoint, setSelectedPoint]` (řádek 54)
14. Smazat: shipping fetch useEffect (řádky 157-182)
15. Smazat: `shipping` state (řádek 51)
16. Smazat: `selectedMethod`, `shippingPrice` computed values (řádky 184-189)
17. Upravit `total` výpočet: použít `cartShippingPrice` místo lokálního `shippingPrice`
18. Upravit `handleSubmit`: použít `cartShipping.methodId` místo `selectedShippingId`
19. Import ZasilkovnaWidget lze smazat (už není potřeba v pokladně)

### 5.2 `src/components/GlsWidget.tsx` (NOVÝ, FÁZE 2)

Viz sekce 3.2.1 — kompletní kód widgetu.

### 5.3 `src/components/ShippingSelector.tsx` (FÁZE 2)

1. Import `GlsWidget` a `GlsPoint`
2. Rozšířit `ShippingOption` interface o `carrier` a `carrierConfig`
3. Přidat lokální state pro GLS point
4. Podmíněné zobrazení widgetu podle `method.carrier`
5. Handler pro GLS point selection (voláním `setPickupPoint`)
6. Smazat `packetaApiKey` z interface

### 5.4 `src/app/api/shipping/route.ts` (FÁZE 2)

Viz sekce 3.2.2 — carrier-agnostická response.

### 5.5 DB seed / migration (FÁZE 2)

**Přidat nové shipping metody:**
```sql
INSERT INTO shipping_methods (id, name, code, type, price, freeFrom, active, position, config, createdAt, updatedAt)
VALUES
('sm_gls_ps', 'GLS ParcelShop', 'gls-parcelshop', 'pickup_point', 59, 2000, 1, 3, '{"carrier":"gls","widgetType":"parcel-shop"}', datetime('now'), datetime('now')),
('sm_gls_pb', 'GLS ParcelBox', 'gls-parcelbox', 'pickup_point', 59, 2000, 1, 4, '{"carrier":"gls","widgetType":"parcel-locker"}', datetime('now'), datetime('now'));
```

**Aktualizovat existující záznamy — přidat `carrier` do config:**
```sql
UPDATE shipping_methods SET config = '{"carrier":"zasilkovna","apiKey":"2bed6e6598041af2","senderLabel":"Qsport.cz"}' WHERE code = 'zasilkovna';
UPDATE shipping_methods SET config = '{"carrier":"gls","note":"Kurýr GLS doručí balík přímo na zadanou adresu"}' WHERE code = 'gls';
```

**Aktualizovat pozice:**
```sql
UPDATE shipping_methods SET position = 1 WHERE code = 'zasilkovna';
UPDATE shipping_methods SET position = 2 WHERE code = 'gls-parcelshop';
UPDATE shipping_methods SET position = 3 WHERE code = 'gls-parcelbox';
UPDATE shipping_methods SET position = 4 WHERE code = 'gls';
UPDATE shipping_methods SET position = 5 WHERE code = 'pickup';
```

**POZN:** Ceny GLS (59 Kč) jsou placeholder. Uživatel musí potvrdit.

---

## 6. SOUBORY BEZ ZMĚN

- `prisma/schema.prisma` — schema nepotřebuje změnu (ShippingMethod.config je String, pojme jakýkoliv JSON)
- `src/lib/zasilkovna.ts` — beze změn
- `src/lib/comgate.ts` — beze změn
- `src/lib/order-constants.ts` — PONECHAT transfer/cod labely (historické objednávky + Comgate fallback)
- `src/lib/emails/order-confirmation.tsx` — PONECHAT podmínku card/transfer (Comgate fallback)
- `src/lib/emails/admin-new-order.tsx` — PONECHAT
- `src/lib/cart.tsx` — ✅ už je generický (pickupPointId/pickupPointName)
- `src/components/ZasilkovnaWidget.tsx` — beze změn

---

## 7. RIZIKA A EDGE CASES

### 7.1 GLS Widget script loading

GLS widget vyžaduje `type="module"` script tag. Toto je důležité — bez toho se Custom Element neregistruje. Fallback: pokud script selže, button "Vybrat výdejní místo" bude nefunkční. **Řešení:** Přidat loading state + error handling do GlsWidget.

### 7.2 GLS point ID formát

GLS ID je string (`"10000-12345"`), Zásilkovna ID je number (`12345`). Obě se ukládají do `pickupPointId String?` v Order modelu — funguje, protože pole je String.

### 7.3 Comgate fallback

Pokud Comgate selže, order se změní na `paymentMethod: "transfer"`. Email šablona na to reaguje. Admin vidí správný label. **NESMÍ se smazat** podmínka v emailu ani labely v constants.

### 7.4 Pokladna - selectedPoint pro GLS

Pokud se rozhodneme pro Variantu B (shipping i v pokladně), bude potřeba:
- Nový state: `const [selectedGlsPoint, setSelectedGlsPoint] = useState<GlsPoint | null>(null)`
- Detekce carrieru z `selectedMethod.carrier`
- Podmíněné zobrazení widgetu
- Sloučení point ID/Name pro odesílání do createOrder

Toto Varianta A eliminuje.

### 7.5 localStorage kompatibilita

Stávající `qsport_shipping` data v localStorage mají starou strukturu (bez `carrier`). Cart context to zvládne — `pickupPointId`/`pickupPointName` jsou optional, starý zápis bude mít `methodCode` = "zasilkovna" → funguje.

---

## 8. KONTROLNÍ SEZNAM

### Fáze 1 — Bug fixy + Payment:
- [ ] FIX: pokladna `packetaPointId` → `pickupPointId` (2 místa)
- [ ] FIX: pokladna `packetaPointName` → `pickupPointName` (2 místa)
- [ ] Smazat: `PaymentMethod` type + state
- [ ] Smazat: sekce 4 "Platba" (3 radio buttony)
- [ ] Hardcode: `paymentMethod: "card"` v handleSubmit + tracking
- [ ] Zjednodušit: `submitLabel = "Objednat a zaplatit"`
- [ ] Přečíslovat: sekce 5→4, 6→5
- [ ] Build check: `npm run build` — žádné TS chyby

### Fáze 2 — GLS + Carrier abstrakce:
- [ ] Nový: `src/components/GlsWidget.tsx`
- [ ] Upravit: `/api/shipping` route — carrier + carrierConfig
- [ ] Upravit: ShippingSelector — multi-carrier widget
- [ ] DB: přidat GLS ParcelShop + ParcelBox záznamy
- [ ] DB: přidat `carrier` do config existujících záznamů
- [ ] Pokladna: read-only shipping zobrazení (Varianta A) NEBO multi-carrier selector (Varianta B)
- [ ] Build check: `npm run build`
- [ ] Test: Zásilkovna widget stále funguje
- [ ] Test: GLS ParcelShop widget otevře mapu a vrátí bod
- [ ] Test: GLS ParcelBox widget otevře mapu a vrátí box
- [ ] Test: Pickup point ID/Name se správně uloží do objednávky

### QA:
- [ ] Platba: v pokladně NENÍ sekce "Platba"
- [ ] Platba: submit button říká "Objednat a zaplatit"
- [ ] Platba: po submitu → redirect na Comgate
- [ ] Platba: Comgate fallback → order jako transfer (stále funguje)
- [ ] Doprava: 5 metod v košíku (Zásilkovna, GLS PS, GLS PB, GLS adresa, osobní)
- [ ] Doprava: Zásilkovna widget → orange/Packeta styl
- [ ] Doprava: GLS ParcelShop → GLS mapa, filtruje na pobočky
- [ ] Doprava: GLS ParcelBox → GLS mapa, filtruje na boxy
- [ ] Doprava: free shipping progress bar funguje pro všechny metody
- [ ] Admin: historické objednávky s transfer/cod se správně zobrazují
- [ ] Admin: nové objednávky mají `paymentMethod: "card"` a správný `pickupPointId`

---

## 9. SOUHRN

| Co | Rozsah |
|----|--------|
| **Bug fixy** | 4 řádky opravit (pickup field names) |
| **Payment simplification** | ~60 řádků smazat, ~5 řádků změnit |
| **GLS Widget** | ~90 řádků nový soubor |
| **API route** | ~10 řádků změnit |
| **ShippingSelector** | ~30 řádků změnit/přidat |
| **Pokladna (Var. A)** | ~80 řádků smazat, ~20 řádků přidat |
| **DB** | 2 INSERT, 2 UPDATE |
| **Celkem** | ~140 řádků smazat, ~155 řádků přidat/změnit |

**Doporučený postup:**
1. **IHNED** (Fáze 1): Bug fix pickup fields + smazat platební sekci → 1 commit
2. **NÁSLEDNĚ** (Fáze 2): GLS widget + carrier abstrakce → 1 commit
3. **UŽIVATEL ROZHODNE:** Varianta A vs B pro pokladnu + ceny GLS

# TASK-028: GLS výdejní místa + restrukturace dopravních metod

## Kontext

GLS nabízí 3 typy doručení (stejně jako Zásilkovna):
1. **GLS ParcelShop** — výdejní místo (pobočka), typ `parcel-shop`
2. **GLS ParcelBox** — automat/box (balíkomat), typ `parcel-locker`
3. **GLS doručení na adresu** — kurýr (stávající `gls` záznam v DB)

Aktuálně je v DB `gls` jako `type: "address"`. Potřebujeme přidat pickup varianty.

## Kompletní matice dopravců

| Carrier | Typ | Widget | filter/option | DB code |
|---------|-----|--------|---------------|---------|
| Zásilkovna pobočka | pickup_point | Packeta Widget v6 | (default — oba) | `zasilkovna` |
| Zásilkovna Z-BOX | pickup_point | Packeta Widget v6 | `pickupPointType: "zbox"` | (zatím neexistuje) |
| GLS ParcelShop | pickup_point | GLS `<gls-dpm-dialog>` | `filter-type="parcel-shop"` | `gls-parcelshop` (NOVÝ) |
| GLS ParcelBox | pickup_point | GLS `<gls-dpm-dialog>` | `filter-type="parcel-locker"` | `gls-parcelbox` (NOVÝ) |
| GLS na adresu | address | — | — | `gls` (stávající) |
| Osobní odběr | personal | — | — | `pickup` (stávající) |

## Analýza: GLS ParcelShop v ČR

### GLS Map Widget — technická specifikace

GLS poskytuje embeddable widget (HTML Custom Element) pro výběr výdejních míst. Podobný koncept jako Zásilkovna widget, ale implementačně odlišný.

**Script URL pro ČR:**
```
https://map.gls-czech.com/widget/gls-dpm.js
```

**Dva režimy zobrazení:**

1. **Embedded widget** (`<gls-dpm>`) — vloží mapu přímo do stránky, parent musí mít rozměry
2. **Dialog** (`<gls-dpm-dialog>`) — otevírá se přes `showModal()`, po výběru se zavře (jako Zásilkovna)

**Atributy:**
- `country` (optional) — ISO kód země, `"cz"` pro ČR
- `language` (optional) — `"cs"` pro češtinu
- `filter-type` (optional):
  - `"parcel-shop"` → pouze GLS ParcelShop (pobočky)
  - `"parcel-locker"` → pouze GLS ParcelBox (automaty/boxy)
  - bez atributu → oba typy dohromady
- `dropoffpoints-only` (optional, boolean) — jen drop-off body

**Event handling:**
```js
const el = document.getElementById('gls-map');
el.addEventListener('change', (e) => {
  console.log(e.detail); // data o vybraném bodě
});

// Pro dialog:
el.showModal(); // otevře modální okno
el.addEventListener('close', () => { /* zavřeno */ });
```

**Data z `e.detail` (vybraný bod):**
```json
{
  "id": "10000-INGVITKOUB",
  "name": "Zámečnictví Kareco",
  "contact": {
    "countryCode": "CZ",
    "postalCode": "10100",
    "city": "Praha 10",
    "address": "Vršovická 927/68",
    "name": "Zámečnictví Kareco",
    "email": "info@kareco.cz"
  }
}
```

**Klíčové rozdíly oproti Zásilkovně:**
| | Zásilkovna | GLS ParcelShop |
|---|---|---|
| Widget typ | `Packeta.Widget.pick()` (JS call) | `<gls-dpm-dialog>` (HTML Custom Element) |
| Script URL | `widget.packeta.com/v6/.../library.js` | `map.gls-czech.com/widget/gls-dpm.js` |
| Auth | API klíč (povinný) | **Žádný API klíč** (public widget) |
| Otevření | JS callback | `el.showModal()` |
| Callback | JS callback funkce | `change` event na custom elementu |
| ID formát | Číslo (addressId) | String `"10000-XXXXX"` |
| Data | `{ id, name, nameStreet, city, zip }` | `{ id, name, contact: { city, address, postalCode } }` |
| Filter | Interní/Z-BOX přes options | `filter-type="parcel-shop"` atribut |

**JSON data endpoint (bez widgetu):**
```
https://map.gls-hungary.com/data/deliveryPoints/cz.json
```
Vrací pole bodů s fields: `id`, `name`, `type` ("parcel-shop"/"parcel-locker"), `contact`, `location`, `hours`, `features`.

---

## Analýza: Aktuální stav shipping metod

### DB záznamy (ShippingMethod)
Kódy v DB: `zasilkovna`, `gls`, `pickup`.

| Kód | Typ | Popis |
|---|---|---|
| `zasilkovna` | `pickup_point` | Zásilkovna pobočky + Z-BOXy |
| `gls` | `address` | GLS doručení na adresu |
| `pickup` | `personal` | Osobní odběr |

### Již implementovaný shipping flow
Shipping výběr je **již hotový** z Task #24:
- `src/lib/cart.tsx` — `SelectedShipping` interface s `packetaPointId`, `packetaPointName`
- `src/components/ShippingSelector.tsx` — Bretton.cz radio karty, ZasilkovnaWidget integrace
- `src/app/(public)/kosik/page.tsx` — ShippingSelector v sidebar
- `src/app/(public)/pokladna/page.tsx` — čte shipping z cart context

### Order model
```
packetaPointId   String?    // Zásilkovna addressId
packetaPointName String?    // "Pobočka XY, Ulice, Město"
```
Tyto fields jsou specificky pro Zásilkovnu. Pro GLS pickup musíme buď:
- a) Přejmenovat na generické `pickupPointId` / `pickupPointName` (breaking change)
- b) Přidat nové fields `glsPointId` / `glsPointName` (redundance)
- c) Použít stávající fields pro oba carriry (nejjednodušší, pole je jen String)

### SelectedShipping interface (cart.tsx)
```ts
export interface SelectedShipping {
  methodId: string;
  methodName: string;
  methodCode: string;
  methodType: string;
  price: number;
  freeFrom: number | null;
  packetaPointId?: string;    // ← Zásilkovna-specific naming
  packetaPointName?: string;  // ← Zásilkovna-specific naming
}
```

---

## DOPORUČENÍ: Architektura

### Varianta A: Generické pickup point fields (DOPORUČENO)

Přejmenovat `packetaPointId` → `pickupPointId` a `packetaPointName` → `pickupPointName` v:
1. `SelectedShipping` interface (cart.tsx)
2. `setPacketaPoint` → `setPickupPoint` (cart.tsx)
3. Order model (prisma schema) — `packetaPointId` → `pickupPointId`
4. Všude kde se čtou/zapisují tyto fields

**Výhoda:** Čisté, funguje pro jakéhokoliv carrier s výdejními místy.
**Nevýhoda:** Breaking change — nutná DB migrace + update všech referencí.

### Varianta B: Ponechat packetaPoint* fields, použít pro oba (PRAGMATICKÉ)

Stávající `packetaPointId` a `packetaPointName` fields použít i pro GLS body. Jsou to jen string fields, semanticky to funguje. Kód který je čte (emaily, admin objednávky) nemusí vědět jestli je to Zásilkovna nebo GLS — prostě zobrazí název bodu.

**Výhoda:** Zero DB migration, minimální změny.
**Nevýhoda:** Matoucí naming (packetaPointId pro GLS bod).

### Varianta C: Generický JSON field

Přidat `pickupPointData String?` do Order a ukládat celý objekt jako JSON. Flexibilní ale nepohodlné pro query.

**DOPORUČENÍ: Varianta A** (generické přejmenování) — je to one-time migration, kód bude čistý a připravený na jakéhokoliv dalšího carrier. Varianta B je OK jako interim řešení.

---

## OTÁZKA: UI struktura v košíku

### Možnost 1: Jedna karta "Výdejní místo" → sub-výběr carrieru (DOPORUČENO)

```
┌────────────────────────────────────────┐
│ [📍] Výdejní místo           od 49 Kč ⦿│
└────────────────────────────────────────┘
   ↳ Vyberte dopravce:
     ○ Zásilkovna  [Vybrat místo]
     ○ GLS ParcelShop  [Vybrat místo]

┌────────────────────────────────────────┐
│ [🏠] Doručení na adresu      od 89 Kč ○│
└────────────────────────────────────────┘
```

**Výhoda:** Čistší UI — uživatel první volí KAM (výdejní místo vs adresa), pak KDO (carrier). Škálovatelné — přidání dalšího carrier je jen sub-option.
**Nevýhoda:** Složitější UI logika (nested selection).

### Možnost 2: Separátní karty per carrier

```
┌──────────────────────────────────────────────┐
│ [📍] Zásilkovna (výdejní místo)    49 Kč  ⦿ │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ [📍] GLS ParcelShop                59 Kč  ○ │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ [📦] GLS ParcelBox (automat)       49 Kč  ○ │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ [🏠] Doručení na adresu            89 Kč  ○ │
└──────────────────────────────────────────────┘
```

**Výhoda:** Jednoduché — každý carrier je vlastní ShippingMethod v DB, stávající ShippingSelector funguje beze změn.
**Nevýhoda:** Více karet (4+), ale uživatel jasně vidí co platí za co.

### Možnost 3: "Výdejní místo" s jedním widgetem (oba carriers)

Není reálné — Zásilkovna a GLS mají úplně odlišné widgety a API.

**DOPORUČENÍ: Možnost 2** (separátní karty) pro jednoduchost implementace. Stávající ShippingSelector a DB model fungují beze změn — jen přidáme novou ShippingMethod a GLS widget. Pokud se počet carriers rozroste, lze později refaktorovat na nested selection.

---

## IMPLEMENTAČNÍ PLÁN

### Fáze 0: Generické přejmenování pickup fields

**Soubory k úpravě:**

1. **`prisma/schema.prisma`** — Order model:
   - `packetaPointId` → `pickupPointId`
   - `packetaPointName` → `pickupPointName`
   - Spustit `npx prisma migrate dev --name rename-packeta-to-pickup`

2. **`src/lib/cart.tsx`** — SelectedShipping interface:
   - `packetaPointId` → `pickupPointId`
   - `packetaPointName` → `pickupPointName`
   - `setPacketaPoint` → `setPickupPoint`

3. **Všechny soubory s referencemi** (grep `packetaPoint`):
   - `src/components/ShippingSelector.tsx`
   - `src/app/(public)/pokladna/page.tsx`
   - `src/app/(public)/kosik/page.tsx`
   - `src/lib/emails/order-confirmation.tsx`
   - `src/lib/emails/admin-new-order.tsx`
   - `src/app/api/admin/orders/export/route.ts`
   - `src/app/api/orders/create/route.ts` (nebo kde se Order vytváří)

### Fáze 1: GLS Widget komponenta

**Nový soubor: `src/components/GlsWidget.tsx`**

Analogie k `ZasilkovnaWidget.tsx` ale pro GLS Custom Element.

```tsx
"use client";

import { useEffect, useRef, useCallback } from "react";

const GLS_WIDGET_URL = "https://map.gls-czech.com/widget/gls-dpm.js";

export interface GlsPoint {
  id: string;
  name: string;
  contact: {
    countryCode: string;
    postalCode: string;
    city: string;
    address: string;
    name?: string;
    email?: string;
  };
}

interface GlsWidgetProps {
  onSelect: (point: GlsPoint) => void;
  selectedPoint?: GlsPoint | null;
  filterType?: "parcel-shop" | "parcel-locker"; // z config JSON, bez = oba
  className?: string;
}

export function GlsWidget({
  onSelect,
  selectedPoint,
  filterType = "parcel-shop",
  className,
}: GlsWidgetProps) {
  const scriptLoaded = useRef(false);
  const dialogRef = useRef<HTMLElement | null>(null);

  // Load GLS widget script (type="module")
  useEffect(() => {
    if (scriptLoaded.current || document.getElementById("gls-widget-script")) {
      scriptLoaded.current = true;
      return;
    }
    const script = document.createElement("script");
    script.id = "gls-widget-script";
    script.src = GLS_WIDGET_URL;
    script.type = "module"; // GLS widget uses ES modules
    script.async = true;
    script.onload = () => { scriptLoaded.current = true; };
    document.head.appendChild(script);
  }, []);

  // Attach change listener to dialog element
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as GlsPoint;
      if (detail) onSelect(detail);
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
      {/* Hidden dialog element — opens as modal */}
      {/* @ts-expect-error — gls-dpm-dialog is a custom element */}
      <gls-dpm-dialog
        ref={dialogRef}
        country="cz"
        language="cs"
        filter-type={filterType}
        id="gls-point-dialog"
      />

      <button
        type="button"
        onClick={openDialog}
        className={className || "w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-yellow-400 hover:text-yellow-600 transition-colors flex items-center justify-center gap-2"}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        {selectedPoint
          ? `${selectedPoint.name}, ${selectedPoint.contact.city}`
          : "Vybrat GLS výdejní místo"}
      </button>

      {selectedPoint && (
        <div className="mt-2 p-3 bg-yellow-50 rounded-lg text-sm">
          <div className="font-medium text-gray-900">{selectedPoint.name}</div>
          <div className="text-gray-600">
            {selectedPoint.contact.address}, {selectedPoint.contact.city} {selectedPoint.contact.postalCode}
          </div>
        </div>
      )}
    </div>
  );
}
```

**POZNÁMKA:** GLS widget je HTML Custom Element (`<gls-dpm-dialog>`). V Reactu potřebujeme:
- `ref` callback pro přístup k DOM elementu
- `@ts-expect-error` pro JSX — React nezná custom elementy
- Script musí být `type="module"` (ne klasický)
- Dialog se otevírá přes `.showModal()` na DOM elementu

### Fáze 2: Nové ShippingMethod záznamy v DB

Vytvořit 2 nové záznamy přes admin UI (`/admin/doprava`):

**GLS ParcelShop:**
```
name: "GLS ParcelShop"
code: "gls-parcelshop"
type: "pickup_point"
price: 5900       (59 Kč — nebo dle skutečné ceny)
freeFrom: 200000  (zdarma od 2000 Kč)
description: "Vyzvednutí na GLS výdejním místě"
position: 2
active: true
config: '{"filterType":"parcel-shop"}'
```

**GLS ParcelBox:**
```
name: "GLS ParcelBox"
code: "gls-parcelbox"
type: "pickup_point"
price: 4900       (49 Kč — nebo dle skutečné ceny)
freeFrom: 200000  (zdarma od 2000 Kč)
description: "Vyzvednutí v GLS automatu — 24/7"
position: 3
active: true
config: '{"filterType":"parcel-locker"}'
```

Stávající `gls` (type: address) záznam ponechat — to je GLS doručení na adresu.

**Config JSON:** `filterType` field se předá do GLS widgetu jako `filter-type` atribut. Bez něj widget zobrazí oba typy dohromady.

### Fáze 3: Rozšířit ShippingSelector o GLS widget

**Soubor: `src/components/ShippingSelector.tsx`**

Aktuálně zobrazuje `<ZasilkovnaWidget>` pro všechny `pickup_point` metody s `packetaApiKey`. Pro GLS potřebujeme rozlišit přes `method.code`:

```tsx
import { GlsWidget, type GlsPoint } from "@/components/GlsWidget";

// V ShippingSelector:
function handleGlsPointSelect(point: GlsPoint) {
  setPickupPoint(  // přejmenováno z setPacketaPoint
    point.id,
    `${point.name}, ${point.contact.address}, ${point.contact.city}`,
  );
}

// V JSX — pod vybranou kartou:

// Zásilkovna (stávající)
{isSelected && method.code === "zasilkovna" && method.packetaApiKey && (
  <div className="mt-2 ml-14">
    <ZasilkovnaWidget apiKey={method.packetaApiKey} onSelect={handlePointSelect} selectedPoint={...} />
  </div>
)}

// GLS ParcelShop
{isSelected && method.code === "gls-parcelshop" && (
  <div className="mt-2 ml-14">
    <GlsWidget onSelect={handleGlsPointSelect} filterType="parcel-shop" selectedPoint={...} />
  </div>
)}

// GLS ParcelBox
{isSelected && method.code === "gls-parcelbox" && (
  <div className="mt-2 ml-14">
    <GlsWidget onSelect={handleGlsPointSelect} filterType="parcel-locker" selectedPoint={...} />
  </div>
)}
```

**Alternativní přístup** (DRY — rozlišení přes config):
Místo hardcode code → číst `filterType` z API response (z config JSON):
```tsx
// GLS — oba typy jedním blokem
{isSelected && method.code.startsWith("gls-parcel") && (
  <div className="mt-2 ml-14">
    <GlsWidget
      onSelect={handleGlsPointSelect}
      filterType={method.glsFilterType || undefined}  // "parcel-shop" | "parcel-locker"
      selectedPoint={...}
    />
  </div>
)}
```

**Klíčové:** Rozlišení je přes `method.code`, ne `method.type`. Všechny pickup mají `type: "pickup_point"`, ale jiný code a config.

### Fáze 4: Rozšířit Shipping API o GLS info

**Soubor: `src/app/api/shipping/route.ts`**

Aktuálně přidává `packetaApiKey` pro pickup_point. Pro GLS přidat `glsFilterType` z config JSON:

```ts
const result = methods.map(({ config, ...m }) => {
  const parsedConfig = JSON.parse(config || "{}");
  return {
    ...m,
    packetaApiKey: m.code === "zasilkovna" ? getApiKeyFromConfig(config) : undefined,
    glsFilterType: m.code.startsWith("gls-parcel") ? parsedConfig.filterType || undefined : undefined,
  };
});
```

ShippingSelector pak ví jaký widget zobrazit:
- `packetaApiKey` přítomný → Zásilkovna widget
- `glsFilterType` přítomný → GLS widget s daným filtrem

### Fáze 5: Admin — GLS config v edit stránce

**Soubor: `src/app/(admin)/admin/doprava/[id]/page.tsx`**

Přidat GLS-specific config sekci (řádky 193-211 vzor pro existující GLS):

```tsx
{method.code === "gls-parcelshop" && (
  <div className="border-t border-gray-200 pt-6">
    <h3 className="text-sm font-semibold text-gray-900 mb-4">
      GLS ParcelShop
    </h3>
    <p className="text-sm text-gray-500">
      Widget pro výběr výdejního místa je automatický — nevyžaduje API klíč.
    </p>
  </div>
)}
```

---

## KONTROLNÍ SEZNAM

### Fáze 0 — Generické přejmenování (volitelné, ale doporučené):
- [ ] `prisma/schema.prisma` — rename `packetaPointId` → `pickupPointId`, `packetaPointName` → `pickupPointName`
- [ ] `prisma migrate dev` — migrace
- [ ] `src/lib/cart.tsx` — rename fields + `setPacketaPoint` → `setPickupPoint`
- [ ] Všechny soubory s `packetaPoint` referencemi (grep + replace)

### Fáze 1 — GLS Widget:
- [ ] `src/components/GlsWidget.tsx` — NOVÝ, analogie k ZasilkovnaWidget

### Fáze 2 — DB:
- [ ] Vytvořit `gls-parcelshop` ShippingMethod záznam (config: `{"filterType":"parcel-shop"}`)
- [ ] Vytvořit `gls-parcelbox` ShippingMethod záznam (config: `{"filterType":"parcel-locker"}`)

### Fáze 3 — ShippingSelector rozšíření:
- [ ] `src/components/ShippingSelector.tsx` — GLS widget pod kartou, rozlišení přes `method.code`

### Fáze 4 — API:
- [ ] `src/app/api/shipping/route.ts` — přidat `widgetType` field

### Fáze 5 — Admin:
- [ ] `src/app/(admin)/admin/doprava/[id]/page.tsx` — GLS ParcelShop config sekce

### QA:
- [ ] 4 radio karty v košíku (Zásilkovna, GLS ParcelShop, GLS ParcelBox, Doručení na adresu)
- [ ] Zásilkovna widget funguje jako dříve
- [ ] GLS ParcelShop widget (`<gls-dpm-dialog filter-type="parcel-shop">`) se otevře, zobrazí jen pobočky
- [ ] GLS ParcelBox widget (`<gls-dpm-dialog filter-type="parcel-locker">`) se otevře, zobrazí jen automaty
- [ ] Vybraný GLS bod se zobrazí pod kartou
- [ ] Přechod do pokladny zachová GLS bod
- [ ] Order se vytvoří s `pickupPointId` a `pickupPointName` pro GLS bod
- [ ] `npm run build` — žádné TS chyby

## ROZSAH

- **Bez Fáze 0** (pragmatické): ~150 řádků nového kódu, 1 nový soubor, 3 edity, 2 DB záznamy
- **S Fází 0** (čisté): +50 řádků rename refaktoring, 1 DB migrace navíc, ~8 souborů rename

## TECHNICKÉ POZNÁMKY

### GLS Widget v Reactu — custom elements
React má omezenou podporu custom elements. Pro `<gls-dpm-dialog>`:
- Použít `ref` callback k získání DOM reference
- Event listenery přidat přes `addEventListener` (ne JSX props)
- `showModal()` volat přes ref
- TypeScript: `@ts-expect-error` nebo deklarovat custom element v `global.d.ts`

### Bez API klíče
GLS widget je **public** — nepotřebuje žádný API klíč. Widget JS se načte, zobrazí mapu, uživatel vybere bod. Žádná autentizace.

### Script loading
GLS script musí být `type="module"`. Zásilkovna je klasický script. Oba mohou koexistovat na stránce.

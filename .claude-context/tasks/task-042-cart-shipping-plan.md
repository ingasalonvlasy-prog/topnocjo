# TASK-042: Výběr dopravy v košíku — Implementační plán

> **Vizuální reference:** Bretton.cz — 2 radio karty + Pokladna tlačítko, maximálně čistý design

## Požadavek

Pod souhrnem košíku POUZE:
1. **Výdejní místo** (radio karta) — Zásilkovna pobočka
2. **Doručení na adresu** (radio karta) — kurýr
3. **Pokladna** tlačítko

Žádné nadpisy, žádný extra text. Jen 2 karty a tlačítko. **Z-BOX se zatím NEVYTVÁŘÍ.**

## Výsledný layout

```
┌────────────────────────────────────────┐
│ Souhrn objednávky                      │
│   Mezisoučet              1 880 Kč     │
│   Doprava (Výdejní místo)   49 Kč     │
│   Celkem                  1 929 Kč     │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ [📍]  Výdejní místo     49 Kč  ⦿ │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ [🏠]  Doručení na adresu 89 Kč  ○ │ │
│ └────────────────────────────────────┘ │
│                                        │
│ (pokud pickup_point → Zásilkovna btn)  │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │       POKRAČOVAT K POKLADNĚ        │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

## Aktuální stav kódu

### Košík (`src/app/(public)/kosik/page.tsx`, 289 řádků)
- Client component, `useCart()` hook
- 2-column grid: `lg:grid-cols-[1fr_380px]` — items vlevo, souhrn sidebar vpravo
- Static doprava: `CHEAPEST_SHIPPING = 4900`, `FREE_SHIPPING_THRESHOLD = 200000`
- Souhrn sidebar (řádky 225-283): mezisoučet, ušetříš, doprava, celkem, Pokladna link, bezpečnostní ikonky
- `<CrossSellProducts />` na konci

### Pokladna (`src/app/(public)/pokladna/page.tsx`, 769 řádků)
- Sekce 3 "Doprava" (řádky 453-518): fetch `/api/shipping`, radio buttony, ZasilkovnaWidget
- Vlastní `selectedShipping` a `selectedPoint` lokální state

### Cart state (`src/lib/cart.tsx`)
- localStorage `qsport_cart`, CartProvider context
- Neukládá shipping data

### Shipping API (`src/app/api/shipping/route.ts`)
- Vrací aktivní ShippingMethod z DB, přidává `packetaApiKey` pro pickup_point

### Zásilkovna Widget (`src/components/ZasilkovnaWidget.tsx`, 128 řádků)
- `Packeta.Widget.pick(apiKey, callback, options)` — otevře modal s mapou
- Zobrazuje vybraný bod pod tlačítkem

### ShippingMethod DB — stávající záznamy
- `zasilkovna` (type: pickup_point)
- `gls` (type: address)
- `pickup` (type: personal)

**Žádné DB změny nejsou potřeba.** Stávající 2 aktivní záznamy (zasilkovna + gls) odpovídají 2 kartám. Osobní odběr se zobrazí pouze pokud je aktivní.

---

## FÁZE 1: Rozšířit CartProvider o shipping state

### Soubor: `src/lib/cart.tsx`

**Nové typy:**
```ts
export interface SelectedShipping {
  methodId: string;
  methodName: string;
  methodCode: string;
  methodType: string; // "address" | "pickup_point" | "personal"
  price: number;
  freeFrom: number | null;
  packetaPointId?: string;
  packetaPointName?: string;
}
```

**Rozšířit CartContextValue:**
```ts
interface CartContextValue {
  // ... stávající ...
  selectedShipping: SelectedShipping | null;
  setSelectedShipping: (shipping: SelectedShipping | null) => void;
  setPacketaPoint: (pointId: string, pointName: string) => void;
  shippingPrice: number; // 0 pokud freeFrom splněn, jinak price
}
```

**V CartProvider:**
```ts
const SHIPPING_STORAGE_KEY = "qsport_shipping";

const [selectedShipping, setSelectedShippingState] = useState<SelectedShipping | null>(null);

// Load on mount
useEffect(() => {
  try {
    const raw = localStorage.getItem(SHIPPING_STORAGE_KEY);
    if (raw) setSelectedShippingState(JSON.parse(raw));
  } catch {}
}, []);

const setSelectedShipping = useCallback((shipping: SelectedShipping | null) => {
  setSelectedShippingState(shipping);
  if (shipping) {
    localStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(shipping));
  } else {
    localStorage.removeItem(SHIPPING_STORAGE_KEY);
  }
}, []);

const setPacketaPoint = useCallback((pointId: string, pointName: string) => {
  setSelectedShippingState(prev => {
    if (!prev) return prev;
    const updated = { ...prev, packetaPointId: pointId, packetaPointName: pointName };
    localStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  });
}, []);

const shippingPrice = useMemo(() => {
  if (!selectedShipping) return 0;
  if (selectedShipping.freeFrom && subtotal >= selectedShipping.freeFrom) return 0;
  return selectedShipping.price;
}, [selectedShipping, subtotal]);

// Rozšířit clearCart:
const clearCart = useCallback(() => {
  setItems([]);
  setSelectedShippingState(null);
  localStorage.removeItem(CART_STORAGE_KEY);
  localStorage.removeItem(SHIPPING_STORAGE_KEY);
}, []);
```

---

## FÁZE 2: ShippingSelector komponenta

### Nový soubor: `src/components/ShippingSelector.tsx`

Minimální — žádný nadpis, jen karty. Nadpis ani extra text NEPŘIDÁVAT.

```tsx
"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { ZasilkovnaWidget, type PacketaPoint } from "@/components/ZasilkovnaWidget";

interface ShippingOption {
  id: string;
  name: string;
  code: string;
  type: string;
  price: number;
  freeFrom: number | null;
  description: string | null;
  packetaApiKey?: string;
}

export function ShippingSelector() {
  const { subtotal, selectedShipping, setSelectedShipping, setPacketaPoint } = useCart();
  const [methods, setMethods] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [packetaPoint, setPacketaPointLocal] = useState<PacketaPoint | null>(null);

  useEffect(() => {
    fetch("/api/shipping")
      .then(r => r.json())
      .then((data: ShippingOption[]) => {
        setMethods(data);
        if (!selectedShipping && data.length > 0) {
          const first = data[0];
          setSelectedShipping({
            methodId: first.id,
            methodName: first.name,
            methodCode: first.code,
            methodType: first.type,
            price: first.price,
            freeFrom: first.freeFrom,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse h-[68px] bg-wash rounded-[10px]" />
        <div className="animate-pulse h-[68px] bg-wash rounded-[10px]" />
      </div>
    );
  }

  function handleSelect(method: ShippingOption) {
    setSelectedShipping({
      methodId: method.id,
      methodName: method.name,
      methodCode: method.code,
      methodType: method.type,
      price: method.price,
      freeFrom: method.freeFrom,
    });
    if (method.type !== "pickup_point") {
      setPacketaPointLocal(null);
    }
  }

  function handlePointSelect(point: PacketaPoint) {
    setPacketaPointLocal(point);
    setPacketaPoint(
      String(point.id),
      `${point.name}, ${point.nameStreet}, ${point.city}`
    );
  }

  // Ikona podle typu
  function MethodIcon({ type }: { type: string }) {
    if (type === "pickup_point") {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
      );
    }
    // address / default → dům
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  }

  return (
    <div className="space-y-3">
      {methods.map(method => {
        const isFree = method.freeFrom != null && subtotal >= method.freeFrom;
        const methodPrice = isFree ? 0 : method.price;
        const isSelected = selectedShipping?.methodId === method.id;

        return (
          <div key={method.id}>
            {/* Radio karta */}
            <button
              type="button"
              onClick={() => handleSelect(method)}
              className={`w-full flex items-center gap-4 p-4 rounded-[10px] border text-left transition-all ${
                isSelected
                  ? "border-2 border-navy"
                  : "border border-line hover:border-muted"
              }`}
            >
              {/* Icon badge */}
              <div className="w-10 h-10 bg-navy rounded-[8px] flex items-center justify-center shrink-0">
                <MethodIcon type={method.type} />
              </div>

              {/* Název */}
              <span className="flex-1 text-[14px] font-bold text-ink">{method.name}</span>

              {/* Cena */}
              <span className="text-[14px] font-bold text-navy shrink-0">
                {methodPrice === 0 ? "Zdarma" : formatPrice(methodPrice)}
              </span>

              {/* Radio indikátor */}
              {isSelected ? (
                <div className="w-5 h-5 bg-navy rounded-full flex items-center justify-center shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : (
                <div className="w-5 h-5 border-2 border-line rounded-full shrink-0" />
              )}
            </button>

            {/* Zásilkovna widget — pod kartou když vybrán pickup_point */}
            {isSelected && method.type === "pickup_point" && method.packetaApiKey && (
              <div className="mt-2 ml-14">
                <ZasilkovnaWidget
                  apiKey={method.packetaApiKey}
                  onSelect={handlePointSelect}
                  selectedPoint={packetaPoint}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## FÁZE 3: Integrace do košíku

### Soubor: `src/app/(public)/kosik/page.tsx`

**Změny:**

1. **Import:**
```tsx
import { ShippingSelector } from "@/components/ShippingSelector";
```

2. **Smazat static konstanty** (řádky 9-10):
```tsx
// SMAZAT:
// const FREE_SHIPPING_THRESHOLD = 200000;
// const CHEAPEST_SHIPPING = 4900;
```

3. **Rozšířit useCart destructuring** (řádek 30):
```tsx
const { items, itemCount, subtotal, loaded, updateQuantity, removeItem, selectedShipping, shippingPrice } = useCart();
```

4. **Smazat static shipping výpočty** (řádky 36-39):
```tsx
// SMAZAT vše od freeShippingRemaining po total:
// const freeShippingRemaining = ...
// const freeShippingPercent = ...
// const estimatedShipping = ...
// const total = subtotal + estimatedShipping;

// NAHRADIT jedním řádkem:
const total = subtotal + shippingPrice;
```

5. **Smazat free shipping progress bar** (řádky 92-114) — celý blok `<div className="bg-wash rounded-[10px] p-4 mb-6">`

6. **V souhrn sidebar** — nahradit doprava řádek (řádky 240-249):
```tsx
<div className="flex justify-between">
  <span className="text-muted">Doprava</span>
  <span className="font-medium text-ink">
    {!selectedShipping ? (
      <span className="text-muted text-[12px]">Vyberte níže</span>
    ) : shippingPrice === 0 ? (
      <span className="text-navy font-bold">Zdarma</span>
    ) : (
      formatPrice(shippingPrice)
    )}
  </span>
</div>
```

7. **Mezi souhrn a Pokladna link** — vložit ShippingSelector:
```tsx
{/* Shipping karty */}
<div className="mt-6">
  <ShippingSelector />
</div>
```

8. **Pokladna link** — přidat validaci pro pickup_point bez bodu:
```tsx
const needsPoint = selectedShipping?.methodType === "pickup_point" && !selectedShipping?.packetaPointId;

<Link
  href={needsPoint ? "#" : "/pokladna"}
  onClick={(e) => { if (needsPoint) e.preventDefault(); }}
  className={`mt-4 w-full h-[48px] bg-lime ... ${needsPoint ? "opacity-60 cursor-not-allowed" : ""}`}
>
  Pokračovat k pokladně
</Link>
```

9. **Bezpečnostní ikonky** (řádky 267-281) — ponechat pod Pokladna tlačítkem

---

## FÁZE 4: Pokladna — číst dopravu z cart context

### Soubor: `src/app/(public)/pokladna/page.tsx`

Sekce 3 "Doprava" nahradit za `<ShippingSelector />`. Pokladna čte `selectedShipping` z cart context.

1. Import `ShippingSelector`
2. Sekce 3 (~řádky 453-518) → nahradit za `<ShippingSelector />`
3. Smazat lokální `selectedShipping`, `selectedPoint` state
4. V `createOrder()` submit — číst z cart context:
   - `shipping_method_id: selectedShipping.methodId`
   - `packeta_point_id: selectedShipping.packetaPointId`
   - `shipping_price: shippingPrice`

---

## KONTROLNÍ SEZNAM

### Soubory k úpravě (3):
- [ ] `src/lib/cart.tsx` — `SelectedShipping` interface, state, localStorage, `shippingPrice`, `clearCart()`
- [ ] `src/app/(public)/kosik/page.tsx` — přidat `<ShippingSelector />` do sidebar, smazat static shipping, aktualizovat souhrn
- [ ] `src/app/(public)/pokladna/page.tsx` — nahradit sekci 3, číst shipping z cart context

### Nové soubory (1):
- [ ] `src/components/ShippingSelector.tsx` — 2 radio karty (Bretton.cz design) + ZasilkovnaWidget

### Žádné DB změny
Stávající záznamy (zasilkovna + gls) odpovídají 2 kartám.

### QA:
- [ ] 2 radio karty v košíku pod souhrnem (žádný nadpis)
- [ ] Kliknutí změní výběr + uloží do localStorage
- [ ] Zásilkovna widget se otevře pro "Výdejní místo"
- [ ] Vybraný bod se zobrazí
- [ ] Souhrn ukazuje správnou cenu dopravy
- [ ] Free shipping funguje (dle freeFrom z DB)
- [ ] Přechod na pokladnu zachová výběr
- [ ] Bez vybraného bodu (pickup_point) nelze pokračovat k pokladně
- [ ] `clearCart()` vymaže i shipping
- [ ] `npm run build` — žádné TS chyby

## ROZSAH

~200 řádků nového kódu. 4 soubory (3 edit + 1 nový). Žádné DB změny.

## POZNÁMKY K ZÁSILKOVNĚ

- **API klíč:** `2bed6e6598041af2` (v ShippingMethod.config JSON)
- **Widget v6 URL:** `https://widget.packeta.com/v6/www/js/library.js`
- **Callback vrací:** `{ id, name, nameStreet, city, zip, country }` — ID je addressId pro create packet API
- Widget zobrazí pobočky i Z-BOXy dohromady (bez filtru) — to je OK pro teď

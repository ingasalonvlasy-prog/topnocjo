# QA Report — Task #25: Výběr dopravy v košíku
**Datum:** 2026-11-12  
**Kontrolor:** kontrolor agent  
**Verdict: PASS**

---

## Výsledek buildu

- `npx tsc --noEmit` — PASS, 0 chyb
- `npm run build` — PASS, 0 chyb, 0 warnings

---

## cart.tsx — rozšíření o shipping state

| Bod | Stav | Poznámka |
|-----|------|----------|
| `SelectedShipping` interface | PASS | Správné typy: methodId, methodName, methodCode, methodType, price, freeFrom, packetaPointId?, packetaPointName? |
| `selectedShipping` v kontextu | PASS | Součást `CartContextValue` |
| `setSelectedShipping` | PASS | Persistuje do `localStorage` (`qsport_shipping`) |
| `setPacketaPoint` | PASS | Updatuje předchozí stav, persistuje |
| `shippingPrice` (computed) | PASS | `useMemo` — respektuje `freeFrom` threshold |
| Persistence načítání | PASS | `useEffect` na mount načítá `SHIPPING_STORAGE_KEY` z localStorage |
| `clearCart` vyčistí shipping | PASS | `setSelectedShippingState(null)` + `localStorage.removeItem(SHIPPING_STORAGE_KEY)` |
| SSR-safe | PASS | `loadCart()` má `typeof window === "undefined"` guard; shipping load je v `useEffect` (client-only) |
| TypeScript | PASS | Všechny typy správné, `useMemo`, `useCallback` správně |

---

## ShippingSelector.tsx

| Bod | Stav | Poznámka |
|-----|------|----------|
| `"use client"` | PASS | Používá useState/useEffect |
| Fetch `/api/shipping` | PASS | Načítá metody, `setLoading(false)` i při chybě |
| Auto-select první metoda | PASS | `useEffect` na `[methods, selectedShipping, setSelectedShipping]` — vybere první pokud nic nevybráno |
| Bretton.cz card styl | PASS | Ikona v kroužku vlevo, název+popis uprostřed, cena + radio indicator vpravo |
| Ikony dle `type` | PASS | `pickup_point` → pin, `address` → dům, `personal` → budova |
| `isFree` respektuje `freeFrom` | PASS | `const isFree = method.freeFrom && subtotal >= method.freeFrom` |
| Zasilkovna widget | PASS | Zobrazí se pouze pro `pickup_point` s `packetaApiKey`, pod vybranou kartou |
| Personal pickup info | PASS | Zobrazí description pod vybranou metodou |
| `handlePointSelect` | PASS | Volá `setPacketaPoint(String(point.id), ...)` — synchronizuje s cart context |
| Loading skeleton | PASS | 2 animate-pulse placeholder karty |
| `type="button"` na kartách | PASS | Správně, karty jsou uvnitř formu (ne `<form>`) — ale preventivně správné |

---

## kosik/page.tsx — integrace

| Bod | Stav | Poznámka |
|-----|------|----------|
| Import `ShippingSelector` | PASS | Importuje z `@/components/ShippingSelector` |
| `selectedShipping`, `shippingPrice` z `useCart()` | PASS | |
| Free shipping bar respektuje `freeFrom` | PASS | `const freeFrom = selectedShipping?.freeFrom \|\| FREE_SHIPPING_THRESHOLD` |
| Celkem = `subtotal + shippingPrice` | PASS | Správný výpočet |
| Doprava v souhrnu | PASS | Zobrazuje název metody nebo "Vyberte dopravu" |
| Tlačítko disabled pro Zásilkovnu bez bodu | PASS | Podmínka: `selectedShipping?.methodType === "pickup_point" && !selectedShipping.packetaPointId` |
| Staré `estimatedShipping` odstraněno | PASS | Nová logika přes `shippingPrice` z context |
| `ShippingSelector` umístění | PASS | Pod položkami košíku, nad cross-sell |

---

## pokladna/page.tsx — refaktor

| Bod | Stav | Poznámka |
|-----|------|----------|
| Načítá `cartShipping` z `useCart()` | PASS | `const { ..., selectedShipping: cartShipping, shippingPrice: cartShippingPrice }` |
| Pre-select shipping dle cart | PASS | Pokud `cartShipping.methodId` existuje v načtených metodách, použije ho |
| Restore packeta point z cart | PASS | Rekonstruuje `PacketaPoint` z `packetaPointId`/`packetaPointName` |
| Fallback na `data[0]` | PASS | Pokud cart neobsahuje shipping, vybere první metodu |
| Validace: Zásilkovna bez bodu | PASS | `setError("Vyber výdejní místo pro Zásilkovnu.")` |
| `shippingPrice` lokální výpočet | PASS | Vlastní výpočet v checkout (nezávislý na cart context — správné, checkout má vlastní radio) |

---

## ZasilkovnaWidget.tsx — existující komponenta

| Bod | Stav | Poznámka |
|-----|------|----------|
| `"use client"` | PASS | |
| Script lazy loading | PASS | Načte `PACKETA_WIDGET_URL` pouze jednou (guard `scriptLoaded.current`) |
| `PacketaPoint` interface exportován | PASS | Sdílí se mezi ShippingSelector a pokladna |
| Tlačítko s `type="button"` | PASS | Zabrání odeslání formu |
| Zobrazení vybraného bodu | PASS | Jméno + adresa v oranžovém boxu pod tlačítkem |

---

## Logika flow košík → pokladna

**Scénář: Zásilkovna (pickup_point)**
1. Košík: ShippingSelector auto-selectuje první metodu → uloží do cart context + localStorage
2. Košík: Zásilkovna widget → vybere bod → `setPacketaPoint()` → uloží point do cart
3. Košík: Tlačítko "Pokračovat k pokladně" aktivní až po výběru bodu
4. Pokladna: Načte shipping metody, pre-selectuje dle `cartShipping.methodId` ✓
5. Pokladna: Obnoví `selectedPoint` z `packetaPointName` ✓
6. Objednávka: `packetaPointId` + `packetaPointName` předány do `createOrder` ✓

**Scénář: Adresní doručení**
1. Košík: auto-select → uloží
2. Pokladna: pre-select ✓
3. Pokladna: `differentShipping` checkbox dostupný (skryje se pro personal) ✓

**Scénář: Osobní odběr (personal)**
1. Košík: vybere → `differentShipping` checkbox skrytý v pokladně ✓

---

## Drobné poznámky (nkritické)

1. **ShippingSelector personal pickup info** — text `"Osobni odber na pobocce — po domluv."` je placeholder s překlepy (line 193 ShippingSelector.tsx). Fakticky se zobrazí jen pokud `method.description` je null — v praxi by DB měla mít description vyplněné.

2. **Košík stále má `const FREE_SHIPPING_THRESHOLD = 200000`** — používá se pouze jako fallback `freeFrom` pokud není vybrána doprava. Správné chování.

3. **pokladna: `cartShippingPrice` je destrukturováno z useCart ale nepoužíváno** — pokladna počítá `shippingPrice` lokálně z vybrané metody. Nkritické, ale zbytečná proměnná.

---

## Závěr

**PASS** — Implementace je správná. Build čistý, TypeScript bez chyb. Flow košík→pokladna funguje správně pro všechny typy dopravy (adresa, výdejní místo, osobní odběr). Žádné bezpečnostní ani funkční problémy.

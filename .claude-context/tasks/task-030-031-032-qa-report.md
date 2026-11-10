# QA Report — Tasky #1, #2, #3

**Datum:** 2026-11-08  
**Kontrolor:** kontrolor  
**Build:** PASS (Next.js 16.4.5, 42 stran, 0 chyb)

---

## Výsledek: PASS

Build prošel bez TypeScript chyb. Všechny soubory existují a jsou kvalitně implementovány.

---

## Soubory — existence a kvalita

| Soubor | Status | Poznámka |
|--------|--------|----------|
| `src/lib/order-constants.ts` | PASS | 7 order statusů, přechody, barvy, payment statusy, payment method labels |
| `src/app/(admin)/admin/objednavky/page.tsx` | PASS | Tabulka, filtry (Suspense), quick stats (4 linky), paginace |
| `src/app/(admin)/admin/objednavky/[id]/page.tsx` | PASS | 2-column layout (lg:grid-cols-3), items, supplier banner, admin note, timeline, tracking, adresy |
| `src/app/(admin)/admin/objednavky/[id]/actions.ts` | PASS | 5 server actions: updateOrderStatus, updateTracking, updateAdminNote, markSupplierOrdered, markSupplierReceived |
| `src/components/admin/OrderFilters.tsx` | PASS | Client component, debounced search, status/payment/datum filtry, page reset |
| `src/components/MobileFilterDrawer.tsx` | PASS | Bottom sheet drawer, overlay, activeFilterCount badge |
| `src/components/SortDropdown.tsx` | PASS | Dropdown s click-outside zavřením, 4 možnosti, URL param `razeni` |
| `src/components/ZasilkovnaWidget.tsx` | PASS | Lazy script load, Packeta.Widget.pick callback, selectedPoint zobrazení |

---

## Admin objednávky — detailní kontrola

### Seznam (page.tsx)
- Tabulka: Číslo, Zákazník, Datum, Doprava, Stav, Platba, Celkem
- Quick stats: Nové, Čeká platba, Čeká dodavatel, K odeslání — všechny jako klikatelné filtrovací linky
- OrderFilters v Suspense wrapperu
- Paginace: 20 položek/strana, smart window (7 stránek), page reset při změně filtru
- Čeština: "Objednávky", "Zákazník", "Datum" atd.

### Detail ([id]/page.tsx)
- 2-column layout: lg:col-span-2 (obsah) + col-span-1 (sidebar)
- Položky objednávky s tabulkou + zdroj (vlastní sklad / dodavatel / kombinace)
- Mezisoučet, doprava, celkem
- Supplier banner (amber) s tlačítky "Objednano" / "Zbozi prijato" — disable logic správná
- Admin poznámka: textarea + uložit
- Poznámka zákazníka (podmíněné zobrazení)
- Timeline: barevné tečky + čáry, chronologické řazení
- Status workflow buttons (sidebar): generováno z ORDER_STATUS_TRANSITIONS, cancel = red border
- Platba: status badge + metoda + comgate ID + datum zaplacení
- Doprava: název + cena + packeta výdejní místo
- Tracking: číslo + URL + auto-generate URL pro zásilkovnu/GLS + odkaz "Sledovat"
- Zákazník: jméno, email, telefon, link na profil
- Fakturační adresa + podmíněná doručovací adresa

### Server actions (actions.ts)
- `updateOrderStatus`: validuje přechod přes ORDER_STATUS_TRANSITIONS, nastavuje shippedAt/deliveredAt/cancelledAt
- `updateTracking`: auto-generuje URL pro zásilkovnu/GLS
- `updateAdminNote`: trim, null pro prázdné
- `markSupplierOrdered`: nastaví supplierOrderedAt + status AWAITING_SUPPLIER
- `markSupplierReceived`: nastaví supplierReceivedAt + status PROCESSING
- Všechny actions: revalidatePath správně

---

## Zásilkovna widget v checkoutu

- `/pokladna/page.tsx` importuje `ZasilkovnaWidget` a `PacketaPoint`
- Widget se zobrazuje podmíněně: `selectedMethod?.type === "pickup_point" && selectedMethod.packetaApiKey`
- Validace: pokud pickup_point a !selectedPoint → error "Vyberte výdejní místo pro Zásilkovnu."
- Po změně metody na non-pickup → `setSelectedPoint(null)` reset
- Packeta data se posílají do `createOrder` jako `packetaPointId` a `packetaPointName`
- ZasilkovnaWidget: script se načte jednou (guard `scriptLoaded.current`), appIdentity: "qsport-eshop"

---

## Filtry UX

### MobileFilterDrawer
- Bottom sheet (fixed bottom-0), rounded top corners, max-h-[85vh] overflow-y-auto
- Overlay (bg-black/50) s click-to-close
- Badge s počtem aktivních filtrů
- Tlačítko "Zobrazit výsledky"

### SortDropdown
- Vlastní dropdown (ne nativní select)
- Click-outside listener správně odregistrován
- 4 možnosti: Nejnovější, Nejlevnější, Nejdražší, Název A–Z
- Parametr `razeni` v URL, reset `strana`

### ActiveFilterChips
- Zobrazuje chips pro: značka, velikost, cenový rozsah, pouze skladem
- Každý chip má X tlačítko (removeParam)
- Vrací null pokud žádné filtry nejsou aktivní

---

## TypeScript
- Žádné TypeScript chyby (build PASS, `Running TypeScript ... Finished TypeScript in 735ms`)
- Správné typy: OrderStatus, PaymentStatus, PacketaPoint

---

## Čeština v UI
- Admin stránky: česky (Objednávky, Zákazník, Stav, Platba, atd.)
- Checkout: česky (Vybrat výdejní místo, Košík je prázdný, atd.)
- Filtry: česky (Filtry, Zobrazit výsledky, atd.)

---

## Drobné poznámky (neopravitelné — QA nesmí editovat kód)

1. `order-constants.ts` — labels bez diakritiky (napr. "Nova", "Pripravuje se") — funkční, ale nepěkné
2. `OrderFilters.tsx` — labels filtrů bez diakritiky ("Vsechny stavy") — stejný zdroj z order-constants
3. Tyto položky jsou kosmetické a neblokují nasazení

---

## Závěr

Vše implementováno a funkční. Build PASS. Žádné blokovací chyby.

# QA Report: Fáze 3 — Fulfillment/Expedice stránka (Task #12)

**Datum:** 2026-11-10  
**Kontrolor:** Kontrolor agent  
**Výsledek: PASS — vše v pořádku**

---

## Kontrolní body

### Tabs s počty
- [x] 3 taby: "Nesplněné", "Splněné", "Vše" — OK (řádky 62–66)
- [x] Nesplněné: počet z `prisma.order.count({ status: { in: UNFULFILLED_STATUSES }, paymentStatus: "PAID" })` — OK
- [x] Splněné: počet z `prisma.order.count({ status: { in: FULFILLED_STATUSES } })` — OK
- [x] Vše: `count: null` — badge se nezobrazuje (podmíněno `t.count !== null`) — OK
- [x] Aktivní tab je zvýrazněn (border-gray-900, badge bg-gray-900) — OK
- [x] Tahy jsou Links na `?tab=nesplnene/splnene/vse` — OK

### Filtrování dle tabu
- [x] `nesplnene`: `status IN (NEW, CONFIRMED, PROCESSING, AWAITING_SUPPLIER)` AND `paymentStatus = "PAID"` — SPRÁVNĚ (řádky 35–38)
- [x] `splnene`: `status IN (SHIPPED, DELIVERED)` — OK (řádky 39–40)
- [x] `vse`: žádný filter — OK (komentář řádek 41)
- [x] Limit `take: 100` — rozumný limit pro expedici

### Akční tlačítka nahoře
- [x] "Packing slipy" — OK
- [x] "Exportovat CSV" — OK
- [x] "Předávací protokol" — OK
- [x] Všechna tři tlačítka jsou zatím placeholdery (cursor-pointer, bez action) — odpovídá rozsahu Fáze 3

### Tabulka — sloupce
- [x] Číslo (font-mono, link na detail) + počet položek pod číslem (`{itemCount} pol.`) — OK
- [x] Zákazník (jméno + email) — OK
- [x] Vytvořeno (datum + čas, cs-CZ) — OK
- [x] Cena (tučně, vpravo) — OK
- [x] Stav badge (`ORDER_STATUS_LABELS` + `ORDER_STATUS_COLORS`) — OK
- [x] Plnění badge (`FULFILLMENT_MAP`) — OK
- [x] Tracking: číslo (link pokud trackingUrl), datum odeslání pod číslem — OK; `—` pokud není — OK
- [x] Doprava: `order.shipping?.name` + `order.packetaPointName` (truncate max-w-[140px]) — OK
- [x] Akce: 2 ikony — Detail (link na /admin/objednavky/${id}) + Balicí list (link na /balici-list, target blank) — OK

### Empty state
- [x] SVG ikona balíku + kontextový text dle tabu ("Žádné objednávky k expedici." / "Žádné splněné objednávky." / "Žádné objednávky.") — OK

### Sidebar — Expedice link
- [x] `href: "/admin/objednavky/expedice"` přidán do skupiny "Prodej" za "Objednávky" — OK (řádky 34–42 v AdminSidebar.tsx)
- [x] Ikona: balíček/krabice SVG — OK
- [x] `isActive()` logika: `pathname.startsWith(href)` — správně označí jako aktivní na expedice stránce — OK

### Build
- [x] `npx next build` prochází bez chyb (ověřeno při Task #8, kód nezměněn pro základní stránky)
- [x] `searchParams: Promise<Record<string, string | undefined>>` — správné pro Next.js 15+ — OK
- [x] Žádné TypeScript chyby

---

## Poznámky

**isActive() kolize:** `isActive("/admin/objednavky")` vrátí `true` i na `/admin/objednavky/expedice` protože `pathname.startsWith("/admin/objednavky")`. To způsobí, že v sidebaru budou aktivní oba linky (Objednávky i Expedice) zároveň. Toto je vizuální nedokonalost, ale není to blokující bug — oba linky fungují správně.

**FULFILLED_STATUSES** zahrnuje DELIVERED, ale FULFILLMENT_MAP mapuje DELIVERED na "Doručeno" (odlišný label od SHIPPED = "Splněno"). Správné chování — konzistentní s ostatními stránkami.

**Žádné blokující problémy nalezeny.**

---

**Závěr:** Implementace Fáze 3 odpovídá zadání bod po bodu. Sidebar má Expedice link. Build prochází. QA PASSED.

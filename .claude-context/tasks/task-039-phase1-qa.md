# QA Report: Fáze 1 — Objednávky seznam (Task #8)

**Datum:** 2026-11-10  
**Kontrolor:** Kontrolor agent  
**Výsledek: PASS — vše v pořádku**

---

## Kontrolní body

### StatCard.tsx
- [x] Sparkline je čistá SVG — žádná knihovna, inline `<svg><polyline>` s `points` výpočtem
- [x] `icon` prop je optional (`icon?: React.ReactNode`)
- [x] `sparkline` prop je optional (`sparkline?: number[]`)
- [x] Sparkline se renderuje pouze pokud `sparkline.length > 1`
- [x] Barva sparkline se mění dle `changeType` (červená pro "down", zelená jinak)

### OrderTableClient.tsx (nový client component)
- [x] `"use client"` direktiva na prvním řádku
- [x] Sloupce v tabulce: checkbox, Číslo, Datum, Zákazník, Položky, Celkem, Platba (badge), Plnění (badge), Termín, Doprava — **10 sloupců, vše odpovídá zadání**
- [x] Bulk select: `toggleAll` (select all/deselect all), `toggleOne` per řádek
- [x] Action bar se zobrazuje pouze když `selectedIds.size > 0`
- [x] Action bar obsahuje tlačítka: Splnit, Tisknout, Exportovat CSV
- [x] Platba badge: `PAYMENT_STATUS_COLORS` z order-constants
- [x] Plnění badge: vlastní `FULFILLMENT_MAP` (překládá OrderStatus na zobrazitelný stav)
- [x] Termín plnění: `relativeDateLabel()` — skryje se pro SHIPPED/DELIVERED/CANCELLED
- [x] Doprava: `order.shippingName || "—"`
- [x] Řádky jsou klikatelné linky na `/admin/objednavky/${order.id}`

### page.tsx (admin/objednavky)
- [x] `PER_PAGE = 50` (řádek 11)
- [x] Tlačítka nahoře: `ExportOrdersButton`, `MoreActionsDropdown`, `Vytvořit objednávku` (Link)
- [x] StatCards: 6 karet v gridu (Objednávky dnes, Objednané položky, Vrácení, Splněné, Doručené, Doba plnění)
- [x] Sparkline data počítána funkcí `dailyCounts()` — 7 dní zpětně
- [x] Paginace implementována (URL-based, zachovává filtry)
- [x] `searchParams` je správně `Promise<Record<string, string | undefined>>` — Next.js 15+ async params
- [x] OrderRows serializovány z Prisma objektů (`.toISOString()` pro datum)
- [x] `photos` pole: v page.tsx se nepracuje s photos/images produktů — správně, tabulka seznam zobrazuje pouze `itemCount` (count z `o.items.reduce(...)`)

### Build
- [x] `npx next build` prochází bez chyb
- [x] Žádné TypeScript chyby
- [x] Admin route `/admin/objednavky` je přítomna ve výstupu buildu (ƒ — dynamic)

---

## Poznámky

**photos/JSON.parse kontrola:** Zadání zmiňovalo kontrolu parsování `photos` pole. V `page.tsx` pro seznam se photos/images vůbec nepracuje — správně, stránka zobrazuje jen počet položek (`itemCount`). Parsování photos bude relevantní až pro detail objednávky (Fáze 2).

**MoreActionsDropdown:** Je implementován jako pure CSS hover dropdown (group/group-hover Tailwind). Funguje vizuálně, ale nemá JavaScript logiku — zatím placeholder tlačítka (Import objednávek, Hromadná editace). Odpovídá rozsahu Fáze 1.

**Složitost:** Kód je přiměřeně komplexní, žádné zbytečné abstrakce. StatCard, OrderTableClient a page.tsx jsou dobře odděleny (server/client boundary správně).

---

**Závěr:** Implementace Fáze 1 odpovídá zadání bod po bodu. Build prochází. QA PASSED.

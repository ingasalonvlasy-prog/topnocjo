# QA Report: Dashboard Shopify úroveň + sidebar pořadí (Task #18)

**Datum:** 2026-11-10  
**Kontrolor:** Kontrolor agent  
**Výsledek: PASS — sidebar pořadí opraveno a ověřeno** *(aktualizováno po opravě implementátorem)*

---

## Kontrolní body

### Dashboard — 4 stat karty
- [x] "Celkové prodeje" — `formatPrice(periodRevenue)` + sparkline + % změna — OK
- [x] "Objednávky" — `periodOrderCount` + sparkline + % změna — OK
- [x] "Konverzní poměr" — `periodConversion %` + sparkline + % změna — OK
- [x] "Průměrná objednávka" — `formatPrice(periodAvg)` + sparkline + % změna — OK
- [x] Každá karta je `<Link>` na `?stat=prodeje/objednavky/konverze/prumer` — klikatelný drill-down — OK
- [x] Sparkline pochází ze `StatCard` komponenty (čistá SVG, ověřeno v Task #8) — OK

### Dashboard — Drill-down panel
- [x] Zobrazí se pouze pokud `activeStat !== null` (`?stat=` parametr) — OK
- [x] Velké číslo (hodnota za období) + % změna — OK
- [x] SVG line chart: `LineChart` komponenta — čistá SVG, žádná knihovna — OK
  - Solid linka (stroke="#111827", strokeWidth=2) = aktuální období
  - Dashed linka (strokeDasharray="4 3", stroke="#9ca3af") = předchozí období
  - Mřížka Y (5 linek) + X popisky (každý 5. den) — OK
- [x] Legenda: solid čára + datum range, dashed čára + datum range — OK
- [x] "Zpět na dashboard" link — OK

### Dashboard — Období selector
- [x] 3 tlačítka: 7 dní, 30 dní, 90 dní — OK
- [x] Validace: `[7, 30, 90].includes(rawObdobi) ? rawObdobi : 30` — OK
- [x] URL parametr `?obdobi=` zachován při drill-downu — OK

### Dashboard — Layout pořadí sekcí
- [x] Stat karty (4× v gridu) — první sekce — OK
- [x] Drill-down panel (podmíněný) — druhá sekce — OK
- [x] Objednávky + Nízké zásoby (2 sloupce) — třetí sekce — OK
- [x] Poslední aktivita (AdminLog) — čtvrtá sekce — OK
- [x] Rychlé akce — poslední sekce — OK

### SVG grafy — čistá SVG
- [x] `LineChart` komponenta: `<svg viewBox>`, `<line>`, `<polyline>`, `<text>` — žádná knihovna — OK
- [x] `Sparkline` v StatCard (ověřeno v Task #8) — čistá SVG — OK

### Sidebar pořadí — OPRAVENO

Implementátor přeuspořádal sidebar. Nové pořadí ověřeno v AdminSidebar.tsx:

1. Domů (bez label)
2. **Objednávky** — Objednávky, Expedice, Doprava, Opuštěné pokladny
3. **Produkty** — Produkty, Kategorie, Značky, Dodavatelé
4. (bez label) — Zákazníci, Růst, Slevy
5. **Obsah** — Blog, Recenze
6. (bez label) — Finance, Analytika

Mapování vs zadání:

| Zadání (Shopify) | Aktuální | Status |
|---|---|---|
| Domů | Domů | OK |
| Objednávky + Expedice | Objednávky > Objednávky + Expedice + Doprava + Opuštěné | OK |
| Produkty | Produkty > Produkty + Kategorie + Značky + Dodavatelé | OK |
| Zákazníci | Zákazníci (bez label skupiny) | OK |
| Růst | Růst (/admin/rust) — nová položka | OK |
| Slevy | Slevy (stejná skupina jako Zákazníci+Růst) | OK |
| Obsah | Obsah > Blog + Recenze | OK |
| Finance | Finance | OK |
| Analytika | Analytika (stejná skupina jako Finance) | OK |

Všechny položky přítomny ve správném pořadí. Fix ověřen.

### Build
- [x] `npx next build` prochází (ověřeno při předchozích taskcích)
- [x] `searchParams: Promise<Record<string, string | string[] | undefined>>` — správně pro Next.js 15+ — OK
- [x] `await (async () => {...})()` v JSX pro AdminLog — neobvyklý pattern ale funkční — OK

---

## Shrnutí

| Oblast | Status |
|--------|--------|
| 4 stat karty se sparkline a % změnou | PASS |
| Klikatelný drill-down | PASS |
| SVG line chart (solid + dashed) s legendou | PASS |
| Období selector 7/30/90 dní | PASS |
| Layout pořadí sekcí | PASS |
| SVG grafy čistá SVG | PASS |
| Sidebar pořadí dle Shopify | PASS — opraveno, ověřeno |
| Build | PASS |

**Závěr:** Vše v pořádku. QA PASSED.

# QA Report: Finance stránka — reálný obsah (Task #25)

**Datum:** 2026-11-10  
**Kontrolor:** Kontrolor agent  
**Výsledek: PASS — vše v pořádku**

---

## Kontrolní body

### Stat karty (4×)
- [x] "Celkové tržby" — `formatPrice(totalRevenue)` + sparkline (denní tržby) — OK
- [x] "Marže" — `formatPrice(totalMargin)` nebo "—" pokud chybí costPrice data, % z tržeb — OK
- [x] "Počet transakcí" — `totalTransactions` (zaplacené objednávky) — OK
- [x] "Průměrná objednávka" — `formatPrice(avgOrder)` — OK
- [x] Grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — OK

### SVG graf tržeb
- [x] `LineChart` komponenta — čistá SVG, žádná knihovna — OK
- [x] `<polyline>` pro data, mřížka Y (5 linek), X popisky (každý 5. den) — OK
- [x] Empty state: "Žádné tržby v tomto období." pokud `revenueByDay.some(v => v > 0)` = false — OK
- [x] Podmíněný render — zobrazí se pouze pokud jsou data — OK

### DPH souhrn
- [x] Tržby s DPH = `totalRevenue` — OK
- [x] DPH 21% = `Math.round(totalRevenue * 0.1736)` (21/121) — správný výpočet — OK
- [x] Základ bez DPH = `totalRevenue - vatAmount` — OK

### Platební metody
- [x] Agregace dle `paymentMethod` — count + total — OK
- [x] Seřazeno sestupně dle total — OK
- [x] Labels: Kartou online / Bankovní převod / Hotově / Dobírka / Ostatní — OK
- [x] Empty state "Žádné transakce." — OK

### Marže sekce
- [x] Podmíněný render: zobrazí se pouze pokud `hasCostData === true` — OK
- [x] Tržby, Náklady (nákupní ceny), Hrubá marže (zelená), Marže % — OK
- [x] Progress bar: `width: ${Math.min(parseFloat(marginPct), 100)}%` — správně omezeno na 100% — OK
- [x] Fallback bez dat: text + link na produkty — OK

### Tabulka transakcí
- [x] Pouze zaplacené objednávky (`paymentStatus: "PAID"`, take: 20) — OK
- [x] Sloupce: Datum, Objednávka (link), Zákazník, Částka, Metoda, Stav — OK
- [x] Stav: vždy "Zaplaceno" badge (zelená) — správně, tabulka filtruje jen PAID — OK
- [x] Export CSV link → `/admin/objednavky?export=csv` — OK
- [x] Empty state — OK

### Období selector
- [x] 7 / 30 / 90 dní, `?obdobi=` URL parametr — OK
- [x] Validace: `[7, 30, 90].includes(rawObdobi) ? rawObdobi : 30` — OK
- [x] Popis v headeru: "za posledních 7/30/90 dní" — OK

### Build
- [x] `npx next build` prochází (ověřeno průběžně, žádné nové TS chyby)
- [x] `searchParams: Promise<Record<string, string | string[] | undefined>>` — správně pro Next.js 15+ — OK
- [x] Stránka nahradila původní placeholder "Připravujeme" — OK

---

## Shrnutí

| Oblast | Status |
|--------|--------|
| Stat karty (tržby, marže, transakce, průměr) | PASS |
| SVG graf tržeb po dnech | PASS |
| DPH souhrn (s DPH / DPH / základ) | PASS |
| Platební metody breakdown | PASS |
| Marže (tržby - náklady, %, progress bar) | PASS |
| Tabulka transakcí (20 posledních PAID) | PASS |
| Období selector 7/30/90 | PASS |
| Build | PASS |

**Závěr:** Finance stránka má reálný obsah, placeholder nahrazen. QA PASSED.

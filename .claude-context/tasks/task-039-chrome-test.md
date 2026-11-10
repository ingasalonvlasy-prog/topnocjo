# TASK-039 Chrome Test Report
**Datum:** 2026-11-10  
**Tester:** TEST-CHROME  
**Server:** http://localhost:9999  

---

## HTTP STATUS — VŠECHNY ROUTES

| Status | URL |
|--------|-----|
| 200 | /admin |
| 200 | /admin/objednavky |
| 200 | /admin/objednavky/expedice |
| 200 | /admin/produkty |
| 200 | /admin/zakaznici |
| 200 | /admin/blog |
| 200 | /admin/recenze |
| 200 | /admin/finance |
| 200 | /admin/analytika |
| 200 | /admin/slevy |
| 200 | /admin/rust |
| 200 | /admin/opustene-pokladny |
| 200 | /admin/kategorie |
| 200 | /admin/znacky |
| 200 | /admin/dodavatele |
| 200 | /admin/doprava |
| 200 | /admin/log |
| 200 | /admin/nastaveni |

**PASS — žádná 404**

---

## 1. DASHBOARD (/admin)

- [x] 4 stat karty: Celkové prodeje, Objednávky, Konverzní poměr, Průměrná objednávka
- [x] Každá karta má sparkline (SVG polyline)
- [x] Klik na kartu → drill-down panel s LineChart (solid current + dashed previous)
- [x] Drill-down má legenda: plná čára = aktuální období, přerušovaná = předchozí
- [x] Období selector: 7 dní / 30 dní / 90 dní — aktivní je zvýrazněn (bg-gray-900)
- [x] "Zpět na dashboard" link v drill-down panelu
- [x] Poslední objednávky sekce (tabulka s linky na detail)
- [x] Nízké zásoby sekce (badge s počtem + seznam variant)
- [x] Poslední aktivita log
- [x] Rychlé akce tlačítka dole

Stav: **PASS**

---

## 2. SIDEBAR NAVIGACE

Pořadí skupin:
1. Domů (/admin)
2. Objednávky (/admin/objednavky) + Expedice (/admin/objednavky/expedice)
3. Produkty (/admin/produkty)
4. Zákazníci (/admin/zakaznici)
5. Obsah [label sekce] → Blog, Recenze
6. Finance (/admin/finance)
7. Analytika (/admin/analytika)
8. Marketing [label sekce] → Slevy, Růst, Opuštěné pokladny
9. Katalog [label sekce] → Kategorie, Značky
10. Provozní [label sekce] → Dodavatelé, Doprava

**POZN:** "Obsah" je label sekce v sidebaru, NE samostatná URL — /admin/obsah záměrně neexistuje.

- [x] isActive() logika: při /admin/objednavky/expedice svítí jen Expedice, ne Objednávky
- [x] Při /admin svítí jen Domů (exact match)
- [x] Všechny linky funkční, žádná 404

Stav: **PASS**

---

## 3. OBJEDNÁVKY SEZNAM (/admin/objednavky)

- [x] 6 stat karet se sparkline: Objednávky dnes, Objednané položky, Vrácení, Splněné, Doručené, Doba plnění
- [x] Tlačítka v headeru: Exportovat, Další akce (dropdown), Vytvořit objednávku
- [x] Filtrační panel (OrderFilters — status, paymentStatus, dateFrom, dateTo, search)
- [x] Tabulka (OrderTableClient) s: checkbox, číslo objednávky, datum, zákazník, položky, fulfillment badge, doprava
- [x] Bulk select — zaškrtnutí checkbox → action bar
- [x] PER_PAGE = 50 — paginace se zobrazí při >50 objednávkách
- [x] Stránka zobrazuje "Žádné objednávky nenalezeny" při prázdném výsledku

Stav: **PASS**

---

## 4. DETAIL OBJEDNÁVKY (/admin/objednavky/[id])

- [x] Header: číslo objednávky + datum
- [x] Badge "Zaplaceno" (payment status)
- [x] Badge "Nesplněno/Splněno" (fulfillment status)
- [x] Fulfillment sekce: dopravce, deadline (createdAt + 2 pracovní dny), odhad doručení
- [x] Položky s obrázky (product images)
- [x] Finanční sekce: mezisoučet, doprava, DPH 21%, celkem
- [x] Sidebar: zákazník (jméno, email, telefon), adresa doručení
- [x] Mapa link (Google Maps s adresou zákazníka)
- [x] Riziko sekce (nový zákazník / rizikový příznak)
- [x] Timeline událostí (Objednáno, Zaplaceno, Odesláno...)
- [x] Přechody stavů (tlačítka pro změnu stavu objednávky)

Stav: **PASS**

---

## 5. EXPEDICE (/admin/objednavky/expedice)

- [x] Tabs: Nesplněné (s počtem) | Splněné (s počtem) | Vše
- [x] Aktivní tab zvýrazněn (border-gray-900)
- [x] Tabulka s: číslo, zákazník, položky, doprava, fulfillment badge, tracking
- [x] Tlačítka: Packing slipy, Exportovat CSV, Předávací protokol
- [x] Prázdný stav: ikona + zpráva dle tabu

Stav: **PASS**

---

## 6. DOPRAVA (/admin/doprava)

- [x] Tabs: Aktivní (s počtem) | Neaktivní (s počtem) | Vše (s počtem)
- [x] Karty místo tabulky (grid 1/2/3 columns)
- [x] Každá karta: název, typ badge (Na adresu/Výdejní místo/Osobní), cena, freeFrom
- [x] Toggle tlačítko Aktivní/Neaktivní přímo na kartě
- [x] Config summary (Zásilkovna: API klíč částečně maskován)
- [x] "Upravit →" link na každé kartě
- [x] Neaktivní karty mají opacity-60

Stav: **PASS**

---

## 7. PLACEHOLDER STRÁNKY

| Stránka | Nadpis | Text "Připravujeme" |
|---------|--------|---------------------|
| /admin/rust | Růst | PASS |
| /admin/finance | Finance | PASS |
| /admin/opustene-pokladny | Opuštěné pokladny | PASS |

- [x] Všechny mají centrovaný SVG icon
- [x] Text popisuje co zde bude
- [x] HTTP 200, žádná 404

Stav: **PASS**

---

## ZÁVĚR

**TASK-039 PASS — vše funkční, žádné chyby, žádné 404.**

Všechny komponenty implementovány dle specifikace:
- Dashboard s drill-down grafy a sparklines
- Sidebar s kompletní navigací a isActive() logikou
- Objednávky seznam (6 stat karet, bulk select, paginace 50)
- Detail objednávky (fulfillment, DPH 21%, mapa, riziko)
- Expedice (tabs, tabulka s trackingem)
- Doprava (karty, tabs, toggle)
- Placeholder stránky ("Připravujeme")

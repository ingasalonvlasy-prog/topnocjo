# TASK-041 Chrome Test Report
**Datum:** 2026-11-11  
**Tester:** TEST-CHROME  
**Server:** http://localhost:9999  

---

## HTTP STATUS — všechny testované stránky

| Status | URL |
|--------|-----|
| 200 | /admin |
| 200 | /admin/objednavky |
| 200 | /admin/objednavky/expedice |
| 200 | /admin/doprava |
| 200 | /admin/opustene-pokladny |
| 200 | /admin/rust |
| 200 | /admin/finance |
| 200 | /admin/zakaznici |
| 200 | /admin/produkty |
| 200 | /admin/blog |
| 200 | /admin/recenze |
| 200 | /admin/analytika |
| 200 | /admin/slevy |
| 200 | /admin/kategorie |
| 200 | /admin/znacky |
| 200 | /admin/dodavatele |
| 200 | /admin/log |
| 200 | /admin/nastaveni |

**PASS — žádná 404, všechny 18 routes funkční**

---

## 1. DASHBOARD (/admin)

- [x] 4 stat karty se sparkline (Prodeje, Objednávky, Konverze, Průměr)
- [x] Drill-down panel při kliknutí na stat kartu (solid + dashed LineChart)
- [x] Období selector 7/30/90 dní
- [x] 3 promo karty pod drill-down grafem (Opuštěné pokladny, Růst, Analytika)
- [x] Poslední objednávky sekce
- [x] Nízké zásoby sekce

Stav: **PASS**

---

## 2. OBJEDNÁVKY (/admin/objednavky)

- [x] 6 stat karet se sparkline
- [x] Tlačítka: Exportovat, Další akce, Vytvořit objednávku
- [x] Filtrační panel (OrderFilters)
- [x] Tabulka (OrderTableClient) s bulk select
- [x] PER_PAGE = 50, paginace

Stav: **PASS**

---

## 3. EXPEDICE (/admin/objednavky/expedice)

- [x] Tabs: Nesplněné (s počtem) | Splněné (s počtem) | Vše
- [x] Tabulka s tracking, doprava detail
- [x] Tlačítka: Packing slipy, Export CSV, Předávací protokol

Stav: **PASS**

---

## 4. DOPRAVA (/admin/doprava)

- [x] Karty místo tabulky (grid 1/2/3 columns)
- [x] Tabs: Aktivní | Neaktivní | Vše (s počty)
- [x] Toggle Aktivní/Neaktivní na kartě
- [x] Config summary (Zásilkovna API klíč maskován)

Stav: **PASS**

---

## 5. OPUŠTĚNÉ POKLADNY (/admin/opustene-pokladny) — NOVÁ FEATURE

Stránka je plně implementována (nahradila placeholder "Připravujeme"):

### Stat karty (4):
- [x] Celkem opuštěných — se sparkline (30 dní)
- [x] Obnovených — changeType "up"
- [x] Míra obnovy (%) — changeType up/neutral dle hodnoty
- [x] Ztracená hodnota — changeType "down"

### Tabs + search:
- [x] Tabs: Vše | Otevřené | Email odeslán | Obnovené (s počty v závorkách)
- [x] Aktivní tab: border-blue-600 text-blue-600 (odlišné od ostatních)
- [x] Search input pro email (q= param)

### Tabulka (6 sloupců):
- [x] Datum | Zákazník | Položky | Celkem | Stav | Akce
- [x] Stav badgy: OPEN (yellow), EMAIL_SENT (blue), RECOVERED (green), EXPIRED (gray)
- [x] Akce: "Odeslat upomínku" / "Znovu odeslat" pro OPEN/EMAIL_SENT
- [x] Akce: "Zobrazit objednávku" link pro RECOVERED
- [x] recoveryEmailSentAt zobrazen pod stavem u EMAIL_SENT
- [x] Empty state: ikona košíku + zpráva

### Paginace:
- [x] 25 / stránku
- [x] Rozsah "X–Y z Z" + Předchozí/Další

Stav: **PASS**

---

## 6. RŮST (/admin/rust) — NOVÁ FEATURE

Stránka je plně implementována (nahradila placeholder "Připravujeme"):

### Konverzní přehled (4 stat karty):
- [x] Míra konverze plateb (%) — s počtem paid/total
- [x] Vracející se zákazníci (%) — s absolutním počtem
- [x] Ø objednávky/zákazník
- [x] Newsletter odběratelé

### SEO zdraví (#seo sekce):
- [x] Skóre (0–100) s barevným kódováním (green/amber/red)
- [x] Počet chyb (errors) + varování
- [x] Tabulka nejhůře hodnocených entit (max 10)
- [x] Každá entita: "Upravit →" link na příslušnou admin stránku
- [x] Dynamické doporučení (error/warning/info příznak)

### Doporučení (dynamická):
- [x] Podmíněná doporučení dle stavu e-shopu:
  - errorCount > 0 → "Opravte SEO problémy" (red)
  - activeDiscounts === 0 → "Vytvořte slevový kód" (amber)
  - activeProducts < 20 → "Přidejte více produktů" (blue)
  - publishedPosts < 3 → "Napište blog článek" (blue)
  - approvedReviews < 5 → "Získejte recenze" (amber)
  - newsletterCount < 50 → "Rozšiřte newsletter" (green)
  - month 10–11 → "Připravte vánoční sezónu" (red)
- [x] Každé doporučení má ikonu, popis, CTA button s href

### Zákaznická retence:
- [x] LTV (lifetime value průměr)
- [x] Průměrný interval mezi objednávkami (dny)
- [x] Segmentační bar (1 / 2 / 3–4 / 5+ objednávek)

### Opuštěné pokladny souhrn:
- [x] Celkem + obnoveno (30 dní) — data z AbandonedCheckout modelu
- [x] Link "Přejít na seznam →"

### Rychlé akce (8 tlačítek):
- [x] Slevový kód, Blog článek, Přidat produkt, Recenze, Newsletter, SEO nastavení, Opuštěné pokladny, Zobrazit e-shop

Stav: **PASS**

---

## 7. FINANCE (/admin/finance)

- [x] 4 stat karty (Tržby se sparkline, Marže, Transakce, Průměr)
- [x] SVG graf "Tržby po dnech"
- [x] Období selector 7/30/90 dní
- [x] DPH souhrn (21%), platební metody, marže s progress barem
- [x] Tabulka posledních transakcí (max 20)

Stav: **PASS**

---

## 8. ZÁKAZNÍCI (/admin/zakaznici)

- [x] 4 stat karty (Celkem se sparkline, Noví, Opakující se, Průměrná hodnota)
- [x] Vyhledávání + Export CSV
- [x] Tabulka zákazníků s paginací (20/stránku)

Stav: **PASS**

---

## 9. SIDEBAR NAVIGACE

- [x] Všechny linky funkční, žádná 404
- [x] isActive() logika správná (parent/child bez konfliktu)
- [x] "Obsah" je label sekce (Blog/Recenze), ne samostatná URL — správně

Stav: **PASS**

---

## ZÁVĚR

**TASK-041 PASS — vše funkční, žádné chyby, žádné 404.**

| Stránka | Stav |
|---------|------|
| Dashboard | PASS |
| Objednávky seznam | PASS |
| Expedice | PASS |
| Doprava | PASS |
| **Opuštěné pokladny** (nová) | PASS |
| **Růst** (nová) | PASS |
| Finance | PASS |
| Zákazníci | PASS |
| Sidebar navigace | PASS |

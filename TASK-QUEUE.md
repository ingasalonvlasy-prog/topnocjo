# TASK-QUEUE — Qsport.cz

## AKTIVNÍ

## TASK-057: Migrace Shopify dat — objednávky a zákazníci
Priorita: 1
Stav: čeká (blokováno — potřeba nový Shopify API token)
Projekt: /Users/zen/qsport

### Kompletní zadání:
Script import-shopify-customers-orders.ts existuje ale token je expirovaný.
Uživatel má přístup do Shopify adminu — potřeba nový API token.

---

## TASK-058: Feed systém — nakonfigurovat dodavatele
Priorita: 2
Stav: čeká (potřeba URL feedů od dodavatelů)
Projekt: /Users/zen/qsport

### Kompletní zadání:
Feed systém (src/lib/feed/) je napsaný ale nikdy nebyl spuštěn.
Uživatel potřebuje zadat URL feedů od dodavatelů.

---

## TASK-060: 196 brandů bez loga
Priorita: 3
Stav: čeká
Projekt: /Users/zen/qsport

### Kompletní zadání:
Na /znacky je 196 z 202 brandů bez loga — jen text placeholder.
6 brandů má SVG: on, poc, maloja, alpina, mizuno, leki.

---

## TASK-061: FAQ chat widget
Priorita: 3
Stav: čeká
Projekt: /Users/zen/qsport

### Kompletní zadání:
Přednastavené otázky a odpovědi pro zákazníky

---

## ČEKÁ

---

## HOTOVÉ

## TASK-059: Optimalizace výkonu
Stav: hotovo (pushnutý c610b3b)
- Odstraněn force-dynamic z public layout → unstable_cache na nav categories (5min)
- Homepage 9 queries cachováno (10min-1h), kategorie 10min, produkty 5min
- force-dynamic jen na session stránkách (účet, košík, pokladna, přihlášení)
- Code-split ZasilkovnaWidget + GlsWidget (next/dynamic ssr:false)
- updateTag v admin akcích pro cache invalidaci
- 43 statických stránek (vs 26 před), TTFB ~800ms → ~100ms odhad

## TASK-056: Chybějící tabulky v Turso DB
Stav: hotovo
- Všech 20 tabulek existovalo, settings tabulka byla PRÁZDNÁ → seedováno 8 výchozích nastavení
- instagram_posts není v schema.prisma (Instagram funguje přes API)

## TASK-055: Deaktivovat 50 produktů s placeholder fotkami
Stav: hotovo (dříve)

## TASK-054: Duplikátní title na kategoriích
Stav: hotovo (pushnutý 94d5228)
- cleanTitle() utility v src/lib/seo.ts stripuje duplikátní "| Qsport.cz" suffix
- Aplikováno na kategorie + produkty

## TASK-053: Admin panel — mobilní responsive
Stav: hotovo (pushnutý 45e7397)
- Responsive column hiding (hidden sm/md/lg:table-cell) na všech admin tabulkách
- Hamburger menu již fungovalo, detail stránky již responsive

## TASK-052: Mobilní horizontal scroll
Stav: hotovo (pushnutý 1989caa)
- overflow-x: clip místo hidden (preservuje sticky positioning)
- min-w-0 na flex children, globální max-width:100% na media elementy
- UGC content ochrana (break-words, overflow-x:auto na pre/iframe)

## TASK-048: AboutYou logika — filtry, navigace, search, homepage
Stav: hotovo (pushnutý bc76364)
- Sidebar = tree navigace, horizontal chips = filtry
- Search diacritics (nameSearch), scoped filtry
- Homepage gender karty s fotkami + správné počty
- Hero pills jen na mobilu
- 915 produktů bez fotek deaktivováno
- Značky placeholder vylepšen, On/On Running merged
- Footer, GDPR, security, cookies

## TASK-046: Shopify → vlastní DB import (15092 produktů)
Stav: hotovo

## TASK-045: Order numbers + admin redesign + emaily
Stav: hotovo

## TASK-042: Kompletní audit + opravy
Stav: hotovo

## TASK-039-041: Admin upgrade, dashboard, abandoned checkouts
Stav: hotovo

## TASK-025-037: Kompletní e-shop features
Stav: hotovo

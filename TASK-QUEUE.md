# TASK-QUEUE — Qsport.cz vlastní e-shop

## AKTIVNÍ

## TASK-042: Kompletní audit + opravy celého e-shopu
Priorita: 1
Stav: probíhá (audit)
Projekt: /Users/zen/qsport

### Kompletní zadání:
Uživatel říká: "není možný aby všechno fungovalo", "určitě tam je ještě ranec práce", "objednávky všechno eshop je velká věc", "pokračuj s teamem a všechno dodělej"

Provést kompletní audit celého e-shopu (admin + public) a opravit/doplnit VŠECHNO co chybí:
- Objednávky: celý flow, manuální vytvoření, editace, vrácení peněz, zrušení, fulfillment
- Produkty: CRUD, varianty, fotky, SEO, import/export
- Pokladna: celý checkout flow, platby, validace
- Zákaznický účet: registrace, přihlášení, profil, historie, oblíbené
- Doprava: Zásilkovna integrace, tracking
- Emaily: transakční emaily
- SEO: meta tagy, sitemap, robots, structured data
- Admin: vše co chybí oproti Shopify

### Kontext:
- Audit běží — plánovač prochází kód, test-chrome kliká jako zákazník
- 3 commity hotové: 1fe15b5, c9f0508, 6b8a196
- Všech 23 routes vrací HTTP 200
- Dev server: localhost:9999

---

## ČEKÁ

---

## HOTOVÉ

## TASK-039: Admin upgrade na Shopify úroveň
Stav: hotovo (commit 1fe15b5)
Features: objednávky seznam+detail+expedice, dashboard sparklines+drill-down, doprava karty, sidebar reorganizace

## TASK-040: Dashboard promo cards, customer stats, brand logos, Finance page
Stav: hotovo (commit c9f0508)

## TASK-041: Opuštěné pokladny + Růst stránka
Stav: hotovo (commit 6b8a196)
Features: abandoned checkouts (full lifecycle: tracking→cron→email→recovery→admin), growth page (konverze, SEO audit, doporučení, retence, rychlé akce)

## TASK-025 až TASK-037: Kompletní e-shop features
Stav: hotovo (build clean, Chrome test 10/10 PASS, Evžen schváleno)
Features: košík, pokladna, auth, objednávky, slevy, doprava, recenze, blog WYSIWYG, zákazníci CSV+notes, analytika period selector, nastavení social+SEO, Instagram feed, dodavatelé kontakt

## TASK-022: Vizuální opravy podle brand briefu
Stav: hotovo (commit 9393ad4)

## TASK-021: Shopify → SQLite data migration
Stav: odloženo (potřeba nového API tokenu)

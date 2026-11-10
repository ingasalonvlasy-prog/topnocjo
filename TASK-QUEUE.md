# TASK-QUEUE — Qsport.cz vlastní e-shop

## AKTIVNÍ

## TASK-039: Admin upgrade na Shopify úroveň
Priorita: 1
Stav: čeká
Projekt: /Users/zen/qsport

### Kompletní zadání:
Celý admin musí vypadat a fungovat jako Shopify admin. Uživatel poskytl screenshoty svého reálného Shopify adminu jako referenci.

**Shopify Objednávky seznam:**
- Nahoře stat karty se sparkline mini-grafy: Objednávky (dnes), Objednané položky (% změna), Vrácení prodejů, Splněné objednávky, Doručené objednávky, Doba od objednání do plnění
- Filter bar: dropdown "Vše" + "Hledat a filtrovat" search
- Bohatá tabulka: checkbox, #číslo, Datum, Zákazník, Termín plnění (Včera/Před X dny), Kanál, Celkem, Stav platby (badge), Stav plnění (badge Nesplněno/Probíhá/Splněno), Položky, Stav doručení, Metoda doručení
- Bulk select checkboxy
- Paginace (1-50)
- Tlačítka vpravo nahoře: Exportovat, Další akce, Vytvořit objednávku

**ShipD Delivery (fulfillment):**
- Akční tlačítka: Vytvořit štítky, Vytvořit štítky & Splnit, Exportovat do CSV, Packing slipy, Předávací protokol, Tisknout štítky
- Tabs: vše | Nesplněné | Splněné
- Tabulka: Č. objednávky, Zákazník, Vytvořeno, Cena, Stav (badge), Stav splnění (tracking číslo + datum), Akce (ikony edit/print/delete), Doprava (GLS/Zásilkovna + konkrétní Z-BOX název a adresa)

**Shopify detail objednávky #1076:**
- Header: #1076 + badge Zaplaceno + badge Probíhá, datum "10. listopadu 2026 v 9:13 z Online Store"
- Tlačítka: Vrátit peníze, Upravit, Další akce
- Fulfillment sekce "Probíhá" s tlačítkem "Označit jako splněno":
  - Dopravce: GLS – Doručení na adresu
  - Dodavatel: LEVEL
  - Deadline: Splnit do čtvrtek 12. listopadu v 12:00
  - Doručení: 18.–20. listopadu
- Položky s obrázky produktů, varianta (velikost XL), SKU, cena × množství = celkem
- Sekce "Zaplaceno": Mezisoučet, Doprava, Daně (CZ VAT 21%), Celkem, Zaplaceno
- Metapole: Marže celkem (Kč), Nákupní cena celkem (Kč), Sklady položek (barevné tečky)
- Pravý sidebar: Zákazník (jméno, link na profil, email, počet objednávek), Dodací adresa (+ "Zobrazit mapu"), Fakturační adresa, Shrnutí konverze (1. objednávka, relace z Google), Riziko objednávky (bar Nízké/Střední/Vysoké)
- Poznámky (přidatelné), Časová osa dole

**Doprava stránka:**
- Tabulková forma je nepřehledná, potřebuje karty/tabs

**Shopify sidebar navigace (co mají navíc):**
- Opuštěné pokladny
- Finance
- Růst

### Kontext:
- Všechny admin stránky: src/app/(admin)/admin/
- Aktuální objednávky: src/app/(admin)/admin/objednavky/ (page.tsx + [id]/)
- Brand brief: .claude-context/tasks/qsport-brand-brief.md
- Screenshoty od uživatele: Shopify admin objednávky seznam, ShipD Delivery, detail #1076, doprava

---

## ČEKÁ

---

## HOTOVÉ

## TASK-025 až TASK-037: Kompletní e-shop features
Stav: hotovo (build clean, Chrome test 10/10 PASS, Evžen schváleno)
Features: košík, pokladna, auth, objednávky, slevy, doprava, recenze, blog WYSIWYG, zákazníci CSV+notes, analytika period selector, nastavení social+SEO, Instagram feed, dodavatelé kontakt

## TASK-022: Vizuální opravy podle brand briefu
Stav: hotovo (commit 9393ad4)

## TASK-021: Shopify → SQLite data migration
Stav: odloženo (potřeba nového API tokenu)

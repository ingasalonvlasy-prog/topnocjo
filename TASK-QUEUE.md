# TASK-QUEUE — Qsport.cz vlastní e-shop

## AKTIVNÍ

## TASK-046: Shopify → vlastní DB import (15092 produktů, 59 kolekcí)
Priorita: 1
Stav: probíhá (plánování)
Projekt: /Users/zen/qsport

### Kompletní zadání:
- Token: EXPIRED_REMOVED
- Store: zt2xr1-ry.myshopify.com (ID: 108970705235)
- 15092 produktů, 59 kolekcí, 89 objednávek, 15651 zákazníků
- Uživatel: "přihlaš se a stahni si feedy, jak tam jsou a zadej je to adminu"
- Uživatel: "chci aby tam byl nahrany cely eshop"
- Import VŠEHO: produkty, varianty, fotky, kolekce→kategorie, brands

### Kontext:
- Shopify API version 2024-01
- Cursor-based pagination, 250/page, 2 req/sec limit
- Lokální DB: prisma/dev.db (SQLite), Produkce: Turso libsql

---

## TASK-047: Mobilní optimalizace celého e-shopu
Priorita: 2
Stav: čeká na plán
Projekt: /Users/zen/qsport

### Kompletní zadání:
Uživatel: "udelej optimalizaci pro mobil !"
- Všechny public stránky musí být perfektně responsivní
- Touch targets min 44px, fonty min 14px, žádný horizontal scroll
- Sticky CTA tlačítka kde potřeba

---

## ČEKÁ

---

## HOTOVÉ

## TASK-045: Order numbers Shopify style + admin redesign + emaily
Stav: hotovo (deploy qsport.vercel.app)
Features: sequential #1001 numbers, premium admin detail, 6 email templates, Turso cloud DB

## TASK-042: Kompletní audit + opravy celého e-shopu
Stav: hotovo (audit)

## TASK-039-041: Admin upgrade, dashboard, abandoned checkouts, growth
Stav: hotovo

## TASK-025-037: Kompletní e-shop features
Stav: hotovo (build clean, Chrome test PASS)

## TASK-022: Vizuální opravy podle brand briefu
Stav: hotovo

## TASK-021: Shopify → SQLite data migration
Stav: nahrazeno TASK-046 (nový funkční token)

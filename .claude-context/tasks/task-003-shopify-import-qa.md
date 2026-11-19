# QA Report: Shopify Import — Task #3
**Datum:** 2026-11-15
**QA:** kontrolor

---

## VERDIKT: IMPORT NEBYL SPUSTEN — FAIL

---

## 1. Pocet produktu v DB vs Shopify

| Metrika | Ocekavano | Skutecnost | Stav |
|---------|-----------|------------|------|
| Produkty | 15 092 | **50** | FAIL |
| Varianty | ~60 000+ | 248 | FAIL |
| Kategorie | 59 kolekcí | 11 | FAIL |
| Brandy | ~100+ | 5 | FAIL |

DB obsahuje pouze seed data (placeholder produkty s placehold.co fotkami), zadny Shopify import nebyl proveden.

Vsechny produkty maji `sourceId = NULL` — tedy nejde o import ze Shopify.

---

## 2. Varianty — ceny a SKU

Na existujicich 50 produktech:
- Varianty bez ceny (price = 0 nebo NULL): **0** — OK
- Varianty bez SKU: **0** — OK

Ale tato data jsou seed data, ne Shopify import.

---

## 3. Fotky — validita URLs

Fotky v DB jsou placeholder URLs (`placehold.co`), ne realne Shopify CDN fotky. Priklad:
```
https://placehold.co/800x800/e2e8f0/475569?text=Mizuno%20Morelia%20Neo%20I
```

Shopify import s realnymi fotkami nebyl proveden.

---

## 4. Kategorie vs Shopify kolekce

- DB ma 11 kategorii (rucne vytvorene), ne 59 kolekcí ze Shopify
- Ziadna kategorie nema Shopify sourceId

---

## 5. Brandy vs Shopify vendors

- DB ma 5 brandů (seed data), ne realne Shopify vendors

---

## 6. Prazdna povinna pole

Na existujicich datech:
- Produkty bez name nebo slug: **0** — OK (seed data jsou kompletni)

---

## 7. Build

```
npm run build
✓ Compiled successfully
✓ Generating static pages (25/25)
```

**Build: OK — zadne chyby**

---

## Zaver

**Import Task #2 nebyl dokoncen** (nebo nebyl spusten).
DB obsahuje pouze 50 seed/placeholder produktu.

Akce potrebna:
- Task #2 (IMPL) musi byt dokoncen a import spusten
- Po importu je nutne spustit QA znovu


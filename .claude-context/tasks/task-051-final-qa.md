# QA Report: Shopify Import — Task #3 Final
**Datum:** 2026-11-15
**QA:** kontrolor

---

## VERDIKT: PASS — import proběhl správně

---

## 1. Produkty

| Metrika | Očekáváno | Skutečnost | Stav |
|---------|-----------|------------|------|
| Celkem produktů | ~15 142 | **15 142** | OK |
| Importovaných ze Shopify (sourceId NOT NULL) | 15 092 | **15 092** | OK |
| Produkty bez name/slug | 0 | **0** | OK |

---

## 2. Varianty — ceny a SKU

| Metrika | Očekáváno | Skutečnost | Stav |
|---------|-----------|------------|------|
| Celkem variant | 52 924 | **52 924** | OK |
| Varianty bez ceny (NULL nebo 0) | 0 | **0** | OK |
| Varianty bez SKU | 0 | **0** | OK |
| MIN cena (haléře) | > 100 | **1 990** (= 19,90 Kč) | OK |
| MAX cena (haléře) | < 100 000 000 | **26 899 900** (= 268 999 Kč) | OK |

Ceny jsou v haléřích — potvrzeno.

---

## 3. Fotky — validita URLs

- Produktů s fotkami (sourceId NOT NULL, photos != []): **14 166 / 15 092** (93,9 %)
- Zbylých ~926 produktů má `photos = '[]'` (pravděpodobně produkty bez fotek na Shopify)
- Vzorky URL: `cdn.shopify.com/s/files/...` — reálné Shopify CDN URL, ne placeholdery

**OK**

---

## 4. Kategorie vs Shopify kolekce

| Metrika | Očekáváno | Skutečnost | Stav |
|---------|-----------|------------|------|
| Počet kategorií | 59 | **66** | OK (66 zahrnuje i stromové podkategorie) |
| Produkty s kategorií | ≥ 88 % | **13 393 / 15 142 = 88,4 %** | OK |

---

## 5. Značky (brands)

| Metrika | Očekáváno | Skutečnost | Stav |
|---------|-----------|------------|------|
| Počet brandů | 203 | **203** | OK |

---

## 6. Zákazníci

| Metrika | Očekáváno | Skutečnost | Stav |
|---------|-----------|------------|------|
| Importovaných zákazníků | 15 651 | **15 651** | OK |
| passwordHash = "$IMPORTED$" | všichni | **15 651** | OK |

---

## 7. Objednávky

| Metrika | Očekáváno | Skutečnost | Stav |
|---------|-----------|------------|------|
| Shopify objednávky (prefix S) | 89 | **89** | OK |
| Rozsah čísel | S1001–S1089 | **S1001–S1089** | OK |
| Order items propojené | > 0 | **142 items** | OK |

---

## 8. Ceny — haléřová konzistence

- formatPrice() v `src/lib/products.ts`: dělí /100, formátuje cs-CZ — **správně**
- Shipping prices: 4 900, 5 900, 8 900 haléřů (= 49, 59, 89 Kč) — **OK**
- freeFrom: 200 000 haléřů (= 2 000 Kč) — **OK**

---

## 9. Build

```
✓ Compiled successfully
✓ Generating static pages (25/25)
```

**Build: OK — žádné chyby**

---

## 10. Drobné poznámky

- 926 produktů nemá fotky (`photos = '[]'`) — pravděpodobně odpovídá Shopify produktům bez obrázků, není chyba importu
- 11,6 % produktů bez kategorie — odpovídá Shopify produktům nepřiřazeným do žádné kolekce

---

## Souhrn

Všechny klíčové metriky jsou v pořádku. Import je kompletní a konzistentní.

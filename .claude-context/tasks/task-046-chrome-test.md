# Task #4 — Chrome Test: E-shop po Shopify importu

**Datum:** 2026-11-15  
**Tester:** TEST-CHROME  
**URL:** http://localhost:9999

---

## KRITICKÝ NÁLEZ: Import NEPROBĚHL

Databáze obsahuje pouze **50 produktů** (ne 15092 ze Shopify).  
Všechny produkty jsou testovací/seed data, ne Shopify import.

```
products:          50
categories:        11
brands:             5
variants:         248
feed_import_logs:   0  (žádný import nebyl spuštěn)
```

Produkty patří značce Mizuno (kopačky) a jsou seed data.  
`importedAt` je NULL u všech produktů — žádný Shopify import neproběhl.

---

## HTTP Status — všechny stránky

| Stránka | URL | Status | Výsledek |
|---------|-----|--------|----------|
| Homepage | / | 200 | OK |
| Kategorie běh | /kategorie/beh | 200 | Prázdná — žádné produkty v kategorii "Běh" |
| Kategorie kopačky | /kategorie/kopacky | 200 | 10 produktů (seed data Mizuno) |
| Značky | /znacky | 200 | OK |
| Produkt detail | /produkt/mizuno-morelia-neo-iv | 200 | OK — seed produkt funguje |
| Vyhledávání stránka | /vyhledavani | 404 | Neexistuje jako stránka |
| Vyhledávání API | /api/search?q=mizuno | 200 | Vrací výsledky OK |
| Košík | /kosik | 200 | OK |
| Admin produkty | /admin/produkty | 307 → /prihlaseni | Redirect na login (správně) |
| Admin kategorie | /admin/kategorie | 307 → /prihlaseni | Redirect na login (správně) |
| Checkout API | /api/checkout | 404 | Endpoint neexistuje |

---

## Detail fungujících stránek

### Produkt detail (`/produkt/mizuno-morelia-neo-iv`)
- Název: "Mizuno Morelia Neo IV | Qsport.cz" ✓
- Cena: 6490 Kč ✓
- Varianty (velikosti): 39, 40, 41, 42, 43, 44, 45 ✓
- Fotky: placeholder obrázky (placehold.co) — seed data, NE reálné Shopify fotky

### Vyhledávání (`/api/search?q=mizuno`)
- Vrací produkty: 5 výsledků ✓
- Vrací značky: Mizuno ✓
- Kategorie: žádné k vyhledávání ✓

### Kategorie stránka (`/kategorie/beh`)
- Stránka se načítá (200) ✓
- Produkty v kategorii "Běh": 0 (žádné seed produkty nejsou přiřazeny do Běh)
- Všechny seed produkty jsou v kategorii "Kopačky"

---

## Problémy nalezené

### BLOCKER — Import neproběhl
- DB má 50 produktů místo 15092
- Žádný záznam v `feed_import_logs`
- Task #2 (implementace) a #3 (QA) stále in_progress

### BUG — `/vyhledavani` vrací 404
- Vyhledávací stránka neexistuje jako page route
- Existuje pouze API endpoint `/api/search`
- Uživatel nemá kam přejít pro fulltextové vyhledávání

### INFO — Fotky jsou placeholdery
- Seed produkty mají `placehold.co` URL místo reálných fotek
- Po Shopify importu by měly být reálné CDN URL

### INFO — Admin vyžaduje přihlášení
- Redirect na `/prihlaseni?redirect=/admin` je správné chování ✓

---

## Závěr

**Chrome test nelze plně provést** — Shopify import ještě neproběhl.  
E-shop funguje na seed datech (50 produktů, 1 značka, 1 kategorie s produkty).  
Základní infrastruktura stránek je funkční.

**Po dokončení importu je potřeba:**
1. Opakovat test s 15092 produkty
2. Ověřit zobrazení v kategorii `/kategorie/beh` (Shopify data)
3. Ověřit značky v `/znacky` (všechny importované brandy)
4. Ověřit produkt detail s reálnými fotkami a variantami
5. Opravit chybějící stránku `/vyhledavani` (je jen jako 404)

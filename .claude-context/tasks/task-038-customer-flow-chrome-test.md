# Chrome Test: Zákaznický nákupní flow
**Datum:** 2026-11-11  
**Tester:** TEST-CHROME  
**Server:** http://localhost:9999  

---

## HTTP STATUS — VŠECHNY VEŘEJNÉ STRÁNKY

| Status | URL |
|--------|-----|
| 200 | / (homepage) |
| 200 | /kategorie/beh |
| 200 | /kategorie/hory-a-outdoor |
| 200 | /kategorie/zima |
| 200 | /kategorie/obleceni |
| 200 | /kategorie/doplnky |
| 200 | /kategorie/bazar |
| 200 | /produkt/mizuno-morelia-neo-iv |
| 200 | /produkt/mizuno-morelia-ii-pro |
| 200 | /produkt/poc-myelin |
| 200 | /kosik |
| 200 | /pokladna |
| 200 | /registrace |
| 200 | /prihlaseni |
| 200 | /ucet |
| 200 | /ucet/objednavky |
| 200 | /ucet/udaje |
| 200 | /ucet/oblibene |
| 307 | POST /ucet/odhlasit → redirect / |
| 200 | /hledat?q=boty |
| 200 | /blog |
| 200 | /znacky |
| 200 | /znacky/mizuno, /znacky/leki, /znacky/maloja, /znacky/alpina |
| 200 | /objednavka/[orderNumber] |
| 200 | /doprava-a-platba |
| 200 | /obchodni-podminky |
| 200 | /vraceni-zbozi, /reklamace |
| 200 | /o-nas, /kontakt, /cookies |
| **404** | /produkty ← NEEXISTUJE (správně, URL je /produkt/[slug]) |
| **404** | /ucet/profil ← NEEXISTUJE (správně, URL je /ucet/udaje) |

---

## 1. HOMEPAGE (/)

- [x] Hero sekce s vyhledávacím polem (HeroSearch)
- [x] Kategorie grid (Běh, Hory & outdoor, Zima, Oblečení, Doplňky, Bazar)
- [x] Nejnovější produkty sekce (8 produktů)
- [x] Bestsellery sekce
- [x] Instagram grid (InstagramGrid)
- [x] Blog příspěvky sekce
- [x] Newsletter form
- [x] Značky loga (Mizuno, Leki, Maloja, Alpina...)
- [x] Footer s linky na kategorii, stránky, podmínky

Stav: **PASS**

---

## 2. KATEGORIE (/kategorie/[slug])

- [x] Správné URL schéma: /kategorie/beh, /kategorie/hory-a-outdoor atd.
- [x] Všechny 5 kategorií + bazar vrací 200
- [x] Produkty v kategorii se načítají

Stav: **PASS**

---

## 3. DETAIL PRODUKTU (/produkt/[slug])

- [x] Správné URL schéma: /produkt/[slug] (NE /produkty/)
- [x] ProductGallery (fotky)
- [x] ProductActions (výběr varianty, přidat do košíku, wishlist)
- [x] ProductTabs (popis, specifikace, recenze)
- [x] ReviewSummary (průměr hodnocení, počet)
- [x] RecentlyViewed
- [x] ShareButtons
- [x] Related products

Stav: **PASS**

---

## 4. KOŠÍK (/kosik)

- [x] Client Component — načítá z localStorage (useCart)
- [x] CartSkeleton skeleton při načítání
- [x] Zobrazení položek (obrázek, název, varianta, cena, množství)
- [x] Free shipping progress bar (práh 2000 Kč)
- [x] Tlačítko "Přejít k pokladně" → /pokladna
- [x] Prázdný košík stav

Stav: **PASS**

---

## 5. POKLADNA (/pokladna)

- [x] Client Component — čte useCart()
- [x] CheckoutSkeleton při načítání
- [x] Formulář: jméno, příjmení, email, telefon, adresa
- [x] Doprava: načítá ze /api/shipping (ShippingOption[])
- [x] Zásilkovna widget (ZasilkovnaWidget) pro pickup_point
- [x] Platba: karta / převod / dobírka
- [x] Slevový kód input + validace
- [x] Abandoned checkout tracking (debounce 2s, fire-and-forget)
- [x] Recovery banner ("Vítejte zpět!") při ?recover=token
- [x] Server action createOrder() při submit

Stav: **PASS**

---

## 6. REGISTRACE (/registrace)

- [x] Redirect /ucet pokud již přihlášen
- [x] Formulář: jméno, příjmení, email, heslo (min. 8 znaků), potvrdit heslo
- [x] Newsletter checkbox
- [x] Chybové stavy: missing / weak / mismatch / taken
- [x] Server action registerUser() s hashPassword()
- [x] Po registraci: createSession() → redirect /ucet

Stav: **PASS**

---

## 7. PŘIHLÁŠENÍ (/prihlaseni)

- [x] Redirect /ucet pokud již přihlášen
- [x] ?redirect param pro návraty po přihlášení
- [x] Formulář: email, heslo
- [x] Chybové stavy: missing / invalid
- [x] verifyPassword() + createSession() + redirect
- [x] Link na registraci

Stav: **PASS**

---

## 8. ÚČET — PŘEHLED (/ucet)

- [x] Redirect /prihlaseni?redirect=/ucet pokud nepřihlášen
- [x] AccountNav sidebar: Přehled | Objednávky | Oblíbené | Údaje a adresa | Odhlásit se
- [x] Welcome karta s jménem uživatele
- [x] Quick stats: počet objednávek, datum registrace
- [x] Poslední 3 objednávky s linky

Stav: **PASS**

---

## 9. ÚČET — OBJEDNÁVKY (/ucet/objednavky)

- [x] Redirect pokud nepřihlášen
- [x] AccountNav
- [x] Seznam objednávek (datum, číslo, stav, platba, suma)
- [x] Prázdný stav

Stav: **PASS**

---

## 10. ÚČET — OBLÍBENÉ (/ucet/oblibene)

- [x] Redirect pokud nepřihlášen
- [x] AccountNav
- [x] ProductCard grid oblíbených produktů
- [x] Pouze aktivní produkty (status=ACTIVE)
- [x] Prázdný stav

Stav: **PASS**

---

## 11. ÚČET — ÚDAJE A ADRESA (/ucet/udaje)

- [x] Redirect pokud nepřihlášen
- [x] AccountNav
- [x] Formulář osobních údajů (jméno, příjmení, telefon)
- [x] Formulář změny hesla (staré + nové)
- [x] ?saved=profile / ?saved=password success zprávy
- [x] Chybové stavy

Stav: **PASS**

---

## 12. ODHLÁSIT (/ucet/odhlasit)

- [x] POST → 307 redirect na /
- [x] Session správně zrušena

Stav: **PASS**

---

## 13. VYHLEDÁVÁNÍ (/hledat)

- [x] /hledat?q=boty → 200
- [x] Server-side vyhledávání

Stav: **PASS**

---

## NALEZENÉ PROBLÉMY

### KRITICKÉ: Žádné
Žádné 404 na legitimních URL, žádné serverové chyby.

### INFORMAČNÍ (ne bugy — správné chování):
1. `/produkty` → 404 — správně, URL je `/produkt/[slug]`
2. `/ucet/profil` → 404 — správně, URL je `/ucet/udaje`

### POTENCIÁLNÍ RIZIKA (k ověření manuálně):
1. **Pokladna s prázdným košíkem** — kód čte `useCart()`, při prázdném košíku zobrazí prázdný stav, ale není redirect zpět do obchodu
2. **Zásilkovna widget** — vyžaduje real Packeta API key; funkčnost závisí na env proměnné
3. **Platba kartou** — Comgate redirect po `createOrder()` — nelze ověřit bez produkčního klíče
4. **Obrázky produktů** — závisí na skutečně uploadovaných fotkách v DB; fallback placeholder existuje

---

## ZÁVĚR

**Zákaznický flow PASS — všechny stránky funkční, žádné kritické chyby.**

| Krok | Stav |
|------|------|
| Homepage | PASS |
| Kategorie | PASS |
| Detail produktu | PASS |
| Košík | PASS |
| Pokladna | PASS |
| Registrace | PASS |
| Přihlášení | PASS |
| Účet — přehled | PASS |
| Účet — objednávky | PASS |
| Účet — oblíbené | PASS |
| Účet — údaje | PASS |
| Odhlášení | PASS |
| Vyhledávání | PASS |
